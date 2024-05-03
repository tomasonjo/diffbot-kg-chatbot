from langchain_community.graphs import Neo4jGraph
from langchain_community.vectorstores import Neo4jVector
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import TokenTextSplitter

index_name = "news_vector"
keyword_index_name = "news_fulltext"
entity_keyword_index = "entity"


def setup_indices():
    graph.query(
        f"CREATE FULLTEXT INDEX {entity_keyword_index} IF NOT EXISTS FOR (n:`_Entity_`) ON EACH [n.id]",
    )
    graph.query(
        f"CREATE FULLTEXT INDEX {keyword_index_name} IF NOT EXISTS FOR (n:Chunk) ON EACH [n.text]",
    )
    graph.query(
        f"""CREATE VECTOR INDEX {index_name} IF NOT EXISTS
    FOR (n: Chunk) ON (n.embedding)
    OPTIONS {{indexConfig: {{
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
    }}}}""",
    )


graph = Neo4jGraph(refresh_schema=False)

setup_indices()

vector = Neo4jVector.from_existing_index(
    OpenAIEmbeddings(),
    graph=graph,
    index_name=index_name,
    keyword_index_name=keyword_index_name,
    search_type="hybrid",
)

text_splitter = TokenTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
