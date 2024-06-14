import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict

from api_types import ArticleData, CountData, EntityData
from chat import chain
from enhance import process_entities, store_enhanced_data
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from graph_prefiltering import prefiltering_agent_executor
from importing import get_articles, import_cypher_query, process_params
from langserve import add_routes
from processing import process_document, store_graph_documents
from text2cypher import text2cypher_chain
from utils import graph, remove_null_properties

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Multithreading for Diffbot API
MAX_WORKERS = min(os.cpu_count() * 5, 20)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.post("/import_articles/")
def import_articles_endpoint(article_data: ArticleData) -> int:
    logging.info(f"Starting to process article import with params: {article_data}")
    if not article_data.query and not article_data.tag:
        raise HTTPException(
            status_code=500, detail="Either `query` or `tag` must be provided"
        )
    data = get_articles(article_data.query, article_data.tag, article_data.size)
    logging.info(f"Articles fetched: {len(data['data'])} articles.")
    try:
        params = process_params(data)
    except Exception as e:
        # You could log the exception here if needed
        raise HTTPException(status_code=500, detail=e)
    graph.query(import_cypher_query, params={"data": params})
    logging.info(f"Article import query executed successfully.")
    return len(params)


@app.post("/process_articles/")
def process_articles() -> str:
    texts = graph.query(
        "MATCH (a:Article) WHERE a.processed IS NULL RETURN a.id AS id, a.text AS text"
    )
    graph_documents = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submitting all tasks and creating a list of future objects
        futures = [executor.submit(process_document, text) for text in texts]

        for future in futures:
            graph_document = future.result()
            graph_documents.extend(graph_document)
    store_graph_documents(graph_documents)
    return f"Processed {len(graph_documents)} articles."


@app.get("/dashboard/")
def dashboard() -> Dict[str, Any]:
    article_data = graph.query(
        """MATCH (a:Article) RETURN count(*) AS article_count,
        [{sentiment: 'positive', count: sum(CASE WHEN a.sentiment > 0.5 THEN 1 ELSE 0 END)},
         {sentiment: 'neutral', count: sum(CASE WHEN -0.5 < a.sentiment < 0.5 THEN 1 ELSE 0 END)},
         {sentiment: 'negative', count: sum(CASE WHEN a.sentiment < -0.5 THEN 1 ELSE 0 END)}] AS sentiment
        """
    )
    entity_types = graph.query(
        """MATCH (e:`__Entity__`)
        RETURN [l IN labels(e) WHERE l <> '__Entity__' | l][0] AS label,
               count(*) AS count
        ORDER BY count DESC LIMIT 7
        """
    )
    entity_count = graph.query(
        """
        MATCH (e:`__Entity__`)
        RETURN count(*) AS count
        """
    )
    return {
        "article": article_data[0],
        "entity": {"types": entity_types, "count": entity_count[0]["count"]},
    }


@app.get("/refresh_schema/")
def refresh_schema() -> bool:
    graph.refresh_schema()
    return True


@app.post("/unprocessed_count/")
def fetch_unprocessed_count(count_data: CountData) -> int:
    """
    Fetches number of articles that haven't been processed yet.
    """
    if count_data.type == "articles":
        data = graph.query(
            "MATCH (a:Article) WHERE a.processed IS NULL RETURN count(a) AS output"
        )
    elif count_data.type == "entities":
        data = graph.query(
            "MATCH (a:Person|Organization) WHERE a.processed IS NULL RETURN count(a) AS output"
        )
    else:
        raise ValueError("The type is not supported")

    return data[0]["output"]


@app.post("/enhance_entities/")
def enhance_entities(entity_data: EntityData) -> str:
    entities = graph.query(
        "MATCH (a:Person|Organization) WHERE a.processed IS NULL "
        "WITH a LIMIT toInteger($limit) "
        "RETURN [el in labels(a) WHERE el <> '__Entity__' | el][0] "
        "AS label, collect(a.name) AS entities",
        params={"limit": entity_data.size},
    )
    enhanced_data = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submitting all tasks and creating a list of future objects
        for row in entities:
            futures = [
                executor.submit(process_entities, el, row["label"])
                for el in row["entities"]
            ]

            for future in futures:
                response = future.result()
                enhanced_data.append(response)
    store_enhanced_data(enhanced_data)
    return "Finished enhancing entities."


@app.get("/fetch_network/")
def fetch_network() -> Dict:
    """
    Fetches data for network visualization
    """
    data = graph.query(
        """
CALL {
    MATCH (a:Article)-[r]->(end)
    WITH a,r,end LIMIT 200
    WITH apoc.coll.toSet(collect(distinct a) + collect(distinct end)) AS nodes,
        collect(r) AS rels
    RETURN nodes,
           rels
UNION ALL
    MATCH (a:Article)-[]->(end)
    WITH end LIMIT 200
    MATCH (end)-[r]->(neighbor)
    WITH neighbor, r
    LIMIT 350
    WITH collect(distinct neighbor) AS nodes,
         collect(r) AS rels
    RETURN nodes, rels
}
WITH collect(nodes) AS allNodeSets, collect(rels) AS allRelSets
WITH apoc.coll.flatten(allNodeSets) AS allNodes, apoc.coll.flatten(allRelSets) AS allRels
RETURN {nodes: [n in allNodes |
                {
                    id: coalesce(n.title, n.name, n.id),
                    tag: [el in labels(n) WHERE el <> "__Entity__"| el][0],
                    properties: n {.*, title: Null, name: Null, id: Null, date: toString(n.date),
                                        founding_date: toString(n.founding_date), embedding: Null, 
                                        mentions: count {(n)-[:MENTIONS]-()} + 1}
                }] ,
        relationships: [r in allRels |
                    {start: coalesce(startNode(r).title, startNode(r).name, startNode(r).id),
                    end: coalesce(endNode(r).title, endNode(r).name, endNode(r).id),
                    type:type(r),
                    properties: r {.*}
                    }]
        } AS output
"""
    )
    return remove_null_properties(data[0]["output"])


add_routes(app, chain, path="/chat", enabled_endpoints=["stream_log"])
add_routes(
    app, text2cypher_chain, path="/text2cypher", enabled_endpoints=["stream_log"]
)
add_routes(
    app,
    prefiltering_agent_executor,
    path="/prefiltering",
    enabled_endpoints=["stream_log"],
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
