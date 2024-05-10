import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from chat import chain
from fastapi import FastAPI, HTTPException
from importing import get_articles, import_cypher_query, process_params
from langserve import add_routes
from processing import process_document, store_graph_documents
from pydantic import BaseModel
from utils import graph

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


MAX_WORKERS = min(os.cpu_count() * 5, 20)

app = FastAPI()


class ArticleData(BaseModel):
    query: Optional[str]
    tag: Optional[str]
    size: int


class EntityData(BaseModel):
    size: int


class CountData(BaseModel):
    type: str


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
def process_entities() -> bool:
    texts = graph.query(
        "MATCH (a:Article) WHERE a.processed IS NULL RETURN a.id AS id, a.text AS text"
    )
    graph_documents = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submitting all tasks and creating a list of future objects
        futures = [executor.submit(process_document, text) for text in texts]

        # Using tqdm to track progress as each future completes
        for future in futures:
            graph_document = future.result()
            graph_documents.extend(graph_document)
    store_graph_documents(graph_documents)
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
        "RETURN a.id AS id LIMIT toInteger($limit)",
        params={"limit": entity_data.limit},
    )
    graph_documents = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submitting all tasks and creating a list of future objects
        futures = [executor.submit(process_document, text) for text in texts]

        # Using tqdm to track progress as each future completes
        for future in futures:
            graph_document = future.result()
            graph_documents.extend(graph_document)
    store_graph_documents(graph_documents)
    return True


add_routes(app, chain, path="/chat")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
