from typing import Any, Dict, List, Optional, Tuple, Type

from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.callbacks.manager import CallbackManagerForToolRun
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import BaseTool
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.utils.function_calling import convert_to_openai_function
from utils import embeddings, generate_full_text_query, graph, llm, vector_index

candidate_query = """
CALL db.index.fulltext.queryNodes('entity', $fulltextQuery, {limit: $limit})
YIELD node
WHERE node:Organization // Filter organization nodes
RETURN distinct node.name AS candidate
"""


def get_candidates(input: str, limit: int = 25) -> List[Dict[str, str]]:
    """
    Retrieve a list of candidate entities from database based on the input string.

    This function queries the Neo4j database using a full-text search. It takes the
    input string, generates a full-text query, and executes this query against the
    specified index in the database. The function returns a list of candidates
    matching the query.
    """
    ft_query = generate_full_text_query(input)
    print(ft_query)
    candidates = graph.query(
        candidate_query, {"fulltextQuery": ft_query, "index": "entity", "limit": limit}
    )
    print(candidates)
    # If there is direct match return only that, otherwise return all options
    direct_match = [
        el["candidate"] for el in candidates if el["candidate"].lower() == input.lower()
    ]
    if direct_match:
        return direct_match

    return [el["candidate"] for el in candidates]


def get_organization_news(
    topic: Optional[str] = None,
    organization: Optional[str] = None,
    sentiment: Optional[str] = None,
) -> str:
    # If there is no prefiltering, we can use vector index
    if topic and not organization and not sentiment:
        return vector_index.similarity_search(topic)
    # Uses parallel runtime where available
    base_query = (
        "CYPHER runtime = parallel parallelRuntimeSupport=all "
        "MATCH (c:Chunk)<-[:HAS_CHUNK]-(a:Article) WHERE "
    )
    where_queries = []
    params = {"k": 5}  # Define the number of text chunks to retrieve
    if organization:
        # Map to database
        candidates = get_candidates(organization)
        if len(candidates) > 1:  # Ask for follow up if too many options
            return (
                "Ask a follow up question which of the available organizations "
                f"did the user mean. Available options: {candidates}"
            )
        where_queries.append(
            "EXISTS {(a)-[:MENTIONS]->(:Organization {name: $organization})}"
        )
        params["organization"] = candidates[0]
    if sentiment:
        if sentiment == "positive":
            where_queries.append("a.sentiment > $sentiment")
            params["sentiment"] = 0.5
        else:
            where_queries.append("a.sentiment < $sentiment")
            params["sentiment"] = -0.5
    if topic:  # Do vector comparison
        vector_snippet = (
            " WITH c, a, vector.similarity.cosine(c.embedding,$embedding) AS score "
            "ORDER BY score DESC LIMIT toInteger($k) "
        )
        params["embedding"] = embeddings.embed_query(topic)
        params["topic"] = topic
    else:  # Just return the latest data
        vector_snippet = " WITH c, a ORDER BY a.date DESC LIMIT toInteger($k) "

    return_snippet = "RETURN '#title ' + a.title + '\n#date ' + toString(a.date) + '\n#text ' + c.text AS output"

    complete_query = (
        base_query + " AND ".join(where_queries) + vector_snippet + return_snippet
    )
    data = graph.query(complete_query, params)
    print(f"Cypher: {complete_query}\n")
    # Safely remove embedding before printing
    params.pop("embedding", None)
    print(f"Parameters: {params}")
    return "###Article: ".join([el["output"] for el in data])


fewshot_examples = """{Input:What are the health benefits for Google employees in the news? Topic: Health benefits}
{Input: What is the latest positive news about Google? Topic: None}
{Input: Are there any news about VertexAI regarding Google? Topic: VertexAI}
{Input: Are there any news about new products regarding Google? Topic: new products}
"""


class NewsInput(BaseModel):
    topic: Optional[str] = Field(
        description="Any particular topic that the user wants to finds information for. Here are some examples: "
        + fewshot_examples
    )
    organization: Optional[str] = Field(
        description="Organization that the user wants to find information about"
    )
    sentiment: Optional[str] = Field(
        description="Sentiment of articles", enum=["positive", "negative"]
    )


class NewsTool(BaseTool):
    name = "NewsInformation"
    description = "useful for when you need to find relevant information in the news"
    args_schema: Type[BaseModel] = NewsInput

    def _run(
        self,
        topic: Optional[str] = None,
        organization: Optional[str] = None,
        sentiment: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Use the tool."""
        return get_organization_news(topic, organization, sentiment)

    async def _arun(
        self,
        topic: Optional[str] = None,
        organization: Optional[str] = None,
        sentiment: Optional[str] = None,
        run_manager: Optional[CallbackManagerForToolRun] = None,
    ) -> str:
        """Use the tool asynchronously."""
        return get_organization_news(topic, organization, sentiment)


tools = [NewsTool()]

llm_with_tools = llm.bind(functions=[convert_to_openai_function(t) for t in tools])

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a helpful assistant that finds information and gives "
            "clear answers. If tools require follow up questions, "
            "make sure to ask the user for clarification. Make sure to include any "
            "available options that need to be clarified in the follow up questions "
            "Do only the things the user specifically requested. ",
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ]
)


def _format_chat_history(chat_history: List[Tuple[str, str]]):
    buffer = []
    for human, ai in chat_history:
        buffer.append(HumanMessage(content=human))
        buffer.append(AIMessage(content=ai))
    return buffer


prefiltering_agent = (
    {
        "input": lambda x: x["input"],
        "chat_history": lambda x: _format_chat_history(x["chat_history"])
        if x.get("chat_history")
        else [],
        "agent_scratchpad": lambda x: format_to_openai_function_messages(
            x["intermediate_steps"]
        ),
    }
    | prompt
    | llm_with_tools
    | OpenAIFunctionsAgentOutputParser()
)


# Add typing for input
class AgentInput(BaseModel):
    input: str
    chat_history: List[Tuple[str, str]] = Field(
        ..., extra={"widget": {"type": "chat", "input": "input", "output": "output"}}
    )


class Output(BaseModel):
    output: Any


prefiltering_agent_executor = AgentExecutor(
    agent=prefiltering_agent, tools=tools
).with_types(input_type=AgentInput, output_type=Output)
