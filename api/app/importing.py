import logging
import os
from typing import Any, Dict, List, Optional

import requests
from utils import embeddings, text_splitter

CATEGORY_THRESHOLD = 0.50
params = []

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]


def get_articles(
    query: Optional[str], tag: Optional[str], size: int = 5, offset: int = 0
) -> Dict[str, Any]:
    """
    Fetch relevant articles from Diffbot KG endpoint
    """
    try:
        search_host = "https://kg.diffbot.com/kg/v3/dql?"
        search_query = f'query=type%3AArticle+strict%3Alanguage%3A"en"+sortBy%3Adate'
        if query:
            search_query += f'+text%3A"{query}"'
        if tag:
            search_query += f'+tags.label%3A"{tag}"'
        url = (
            f"{search_host}{search_query}&token={DIFF_TOKEN}&from={offset}&size={size}"
        )
        return requests.get(url).json()
    except Exception as ex:
        raise ex


def get_tag_type(types: List[str]) -> str:
    try:
        return types[0].split("/")[-1]
    except:
        return "Node"


def process_params(data):
    params = []
    all_chunks = []
    for row in data["data"]:
        article = row["entity"]
        split_chunks = [
            {"text": el, "index": f"{article['id']}-{i}"}
            for i, el in enumerate(text_splitter.split_text(article["text"])[:5])
        ]
        all_chunks.extend(split_chunks)
        params.append(
            {
                "sentiment": article.get("sentiment", 0),
                "date": int(article["date"]["timestamp"] / 1000),
                "publisher_region": article.get("publisherRegion"),
                "site_name": article["siteName"],
                "language": article["language"],
                "title": article["title"],
                "text": article["text"],
                "categories": [
                    el["name"]
                    for el in article.get("categories", [])
                    if el["score"] > CATEGORY_THRESHOLD
                ],
                "author": article.get("author"),
                "tags": [
                    {
                        "sentiment": el["sentiment"],
                        "name": el["label"],
                        "type": get_tag_type(el.get("types")),
                    }
                    for el in article["tags"]
                ],
                "page_url": article["pageUrl"],
                "id": article["id"],
                "chunks": split_chunks,
            }
        )
    logging.info(f"Number of text chunks: {len(all_chunks)}.")
    # Make a single request for embeddings
    embedded_documents = embeddings.embed_documents([el["text"] for el in all_chunks])
    # Assign embeddings to chunks in params using a dictionary
    chunk_embedding_map = {
        chunk["index"]: embedded_documents[i] for i, chunk in enumerate(all_chunks)
    }
    for param in params:
        param["chunks"] = [
            {**chunk, "embedding": chunk_embedding_map.get(chunk["index"], None)}
            for chunk in param["chunks"]
        ]

    return params


import_cypher_query = """
UNWIND $data AS row
MERGE (a:Article {id:row.id})
SET a.sentiment = toFloat(row.sentiment),
    a.title = row.title,
    a.text = row.text,
    a.language = row.language,
    a.pageUrl = row.page_url,
    a.date = datetime({epochSeconds: row.date})
MERGE (s:Site {name: row.site_name})
ON CREATE SET s.publisherRegion = row.publisher_region
MERGE (a)-[:ON_SITE]->(s)
FOREACH (category in row.category |
  MERGE (c:Category {name: category}) MERGE (a)-[:IN_CATEGORY]->(c)
)
FOREACH (tag in row.tags |
  MERGE (t:Tag {name: tag.name})
  MERGE (a)-[:HAS_TAG {sentiment: tag.sentiment}]->(t)
)
FOREACH (i in CASE WHEN row.author IS NOT NULL THEN [1] ELSE [] END |
  MERGE (au:Author {name: row.author})
  MERGE (a)-[:HAS_AUTHOR]->(au)
  MERGE (au)-[:WRITES_FOR]->(s)
)
WITH a, row
UNWIND row.chunks AS chunk
  MERGE (c:Chunk {id: chunk.index})
  SET c.text = chunk.text,
      c.index = chunk.index
  MERGE (a)-[:HAS_CHUNK]->(c)
  WITH c, chunk
  CALL db.create.setNodeVectorProperty(c, 'embedding', chunk.embedding)
"""
