import os
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Tuple

from chat import agent_executor
from fastapi import FastAPI, HTTPException
from importing import get_articles, import_cypher_query, process_params
from langserve import add_routes
from processing import process_document, store_graph_documents
from pydantic import BaseModel
from utils import graph

MAX_WORKERS = min(os.cpu_count() * 5, 20)

app = FastAPI()


class ArticleData(BaseModel):
    query: str
    size: int


@app.post("/import_articles/")
def import_articles_endpoint(article_data: ArticleData) -> int:
    data = get_articles(article_data.query, article_data.size)
    try:
        params = process_params(data)
    except Exception as e:
        # You could log the exception here if needed
        raise HTTPException(
            status_code=500, detail="Something went wrong during parameter processing."
        )
    graph.query(import_cypher_query, params={"data": params})
    return len(params)


@app.get("/process_articles/")
def import_articles_endpoint() -> bool:
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


@app.get("/unprocessed_count/")
def fetch_graph_data() -> int:
    """
    Fetches number of articles that haven't been processed yet.
    """
    data = graph.query(
        "MATCH (a:Article) WHERE a.processed IS NULL RETURN count(a) AS output"
    )
    return data[0]["output"]


add_routes(app, agent_executor, path="/chat")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
