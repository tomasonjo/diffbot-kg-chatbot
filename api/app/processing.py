import os

from langchain_core.documents import Document
from langchain_experimental.graph_transformers import DiffbotGraphTransformer
from utils import graph

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]

diffbot_nlp = DiffbotGraphTransformer(
    diffbot_api_key=DIFF_TOKEN, extract_types=["facts", "entities"]
)


def process_document(text):
    try:
        # Assume diffbot_nlp.convert_to_graph_documents is a method that converts text to graph documents
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
MERGE (source:`_Entity_` {id: row.id})
SET source += row.properties
MERGE (a)-[:MENTIONS]->(source)
WITH source, row
CALL apoc.create.addLabels( source, [row.type] ) YIELD node
RETURN count(*)
"""

rel_import_query = """
UNWIND $data AS row 
MERGE (source:`_Entity_` {id: row.source})
MERGE (target:`_Entity_` {id: row.target})
WITH source, target, row
CALL apoc.merge.relationship(source, row.type,
{}, row.properties, target) YIELD rel
RETURN count(*)
"""


def store_graph_documents(graph_documents):
    for document in graph_documents:
        # Import nodes
        graph.query(
            node_import_query,
            {
                "data": [el.__dict__ for el in document.nodes],
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
                ]
            },
        )
