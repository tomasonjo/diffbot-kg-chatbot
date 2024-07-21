import os

from langchain_core.documents import Document
from langchain_experimental.graph_transformers import DiffbotGraphTransformer
from utils import graph

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]
EXCLUDED_TYPES = ["Number", "Money"]

diffbot_nlp = DiffbotGraphTransformer(
    diffbot_api_key=DIFF_TOKEN, extract_types=["facts", "entities", "sentiment"]
)


def process_document(text):
    """
    Uses diffbot graph transformer from LangChain to convert text
    to graph document objects
    """
    try:
        return diffbot_nlp.convert_to_graph_documents(
            [Document(page_content=text["text"], metadata={"id": text["id"]})]
        )
    except Exception as e:
        print(f"Error processing document with ID {text['id']}: {e}")
        return []


node_import_query = """
MATCH (a:Article {id: $document.metadata.id})
SET a.processed = True
WITH a
UNWIND $data AS row
MERGE (source:`__Entity__` {id: row.id})
SET source += apoc.map.clean(row.properties, ["sentiment"], ["", Null])
MERGE (a)-[m:MENTIONS]->(source)
SET m.sentiment = toFloat(row.properties.sentiment)
WITH source, row
CALL apoc.create.addLabels( source, [row.type] ) YIELD node
RETURN count(*)
"""

rel_import_query = """
UNWIND $data AS row 
MERGE (source:`__Entity__` {id: row.source})
MERGE (target:`__Entity__` {id: row.target})
WITH source, target, row
CALL apoc.merge.relationship(source, row.type,
{}, row.properties, target) YIELD rel
RETURN count(*)
"""

merge_entities = """
MATCH (p:Organization|Person)
WITH toLower(p.name) AS name, collect(p) AS nodes
WHERE size(nodes) > 1
CALL apoc.refactor.mergeNodes(nodes) YIELD node
RETURN count(*)
"""


def store_graph_documents(graph_documents):
    for document in graph_documents:
        # Import nodes
        graph.query(
            node_import_query,
            {
                "data": [
                    el.__dict__
                    for el in document.nodes
                    if el.type not in EXCLUDED_TYPES
                ],
                "document": document.source.__dict__,
            },
        )
        # Import relationships
        graph.query(
            rel_import_query,
            {
                "data": [
                    {
                        "source": el.source.id,
                        "source_label": el.source.type,
                        "target": el.target.id,
                        "target_label": el.target.type,
                        "type": el.type.replace(" ", "_").upper(),
                        "properties": el.properties,
                    }
                    for el in document.relationships
                    if el.source.type not in EXCLUDED_TYPES
                    and el.target.type not in EXCLUDED_TYPES
                ]
            },
        )
    # Merge duplicate entities
    graph.query(merge_entities)
