import os
from typing import List

import requests
from utils import embeddings, text_splitter

CATEGORY_THRESHOLD = 0.50
params = []

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]


def get_articles(query: str, size: int = 5, offset: int = 0):
    """
    Fetch relevant articles from Diffbot KG endpoint
    """
    search_host = "https://kg.diffbot.com/kg/v3/dql?"
    search_query = (
        f'query=type%3AArticle+text%3A"{query}"+strict%3Alanguage%3A"en"+sortBy%3Adate'
    )
    url = f"{search_host}{search_query}&token={DIFF_TOKEN}&from={offset}&size={size}"
    return requests.get(url).json()


def get_tag_type(types: List[str]) -> str:
    try:
        return types[0].split("/")[-1]
    except:
        return "Node"


def process_params(data):
    params = []
    for row in data["data"]:
        article = row["entity"]
        split_chunks = text_splitter.split_text(article["text"])
        params.append(
            {
                "sentiment": article["sentiment"],
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
                "chunks": [
                    {"text": el, "embedding": embeddings.embed_query(el), "index": i}
                    for i, el in enumerate(split_chunks)
                ],
            }
        )

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
  MERGE (c:Chunk {id: row.id + '-' + chunk.index})
  SET c.text = chunk.text,
      c.index = chunk.index
  MERGE (a)-[:HAS_CHUNK]->(c)
  WITH c, chunk
  CALL db.create.setNodeVectorProperty(c, 'embedding', chunk.embedding)
"""
