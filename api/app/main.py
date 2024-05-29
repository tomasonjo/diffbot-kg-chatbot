import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict

from api_types import ArticleData, CountData, EntityData
from chat import chain
from enhance import process_entities, store_enhanced_data
from fastapi import FastAPI, HTTPException
from graph_prefiltering import prefiltering_agent_executor
from importing import get_articles, import_cypher_query, process_params
from langserve import add_routes
from processing import process_document, store_graph_documents
from text2cypher import text2cypher_chain
from utils import graph
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/process_articles/")
def process_articles() -> bool:
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
    return True


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
def fetch_unprocessed_count(unprocess_count: CountData) -> int:
    """
    Fetches number of articles that haven't been processed yet.
    """
    if unprocess_count.type == "articles":
        data = graph.query(
            "MATCH (a:Article) WHERE a.processed IS NULL RETURN count(a) AS output"
        )
    elif unprocess_count.type == "entities":
        data = graph.query(
            "MATCH (a:Person|Organization) WHERE a.processed IS NULL RETURN count(a) AS output"
        )
    else:
        raise ValueError("The type is not supported")

    return data[0]["output"]


@app.post("/enhance_entities/")
def enhance_entities(entity_data: EntityData) -> bool:
    entities = graph.query(
        "MATCH (a:Person|Organization) WHERE a.processed IS NULL "
        "WITH a LIMIT toInteger($limit) "
        "RETURN [el in labels(a) WHERE el <> '_Entity_' | el][0] "
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
    return True


add_routes(app, chain, path="/chat")
add_routes(app, text2cypher_chain, path="/text2cypher")
add_routes(app, prefiltering_agent_executor, path="/prefiltering")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
