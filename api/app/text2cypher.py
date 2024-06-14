import re
from typing import List, Optional, Union

from langchain.chains.graph_qa.cypher_utils import CypherQueryCorrector, Schema
from langchain_core.messages import (
    AIMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
)
from langchain_core.pydantic_v1 import BaseModel
from langchain_core.runnables import RunnablePassthrough
from utils import Entities, entity_chain, graph, llm

# Cypher validation tool for relationship directions
corrector_schema = [
    Schema(el["start"], el["type"], el["end"])
    for el in graph.structured_schema.get("relationships")
]
cypher_validation = CypherQueryCorrector(corrector_schema)


# Fulltext index query
def map_to_database(entities: Entities) -> Optional[str]:
    result = ""
    for entity in entities.names:
        response = graph.query(
            "CALL db.index.fulltext.queryNodes('entity', $entity + '*', {limit:1})"
            " YIELD node,score RETURN node.name AS result",
            {"entity": entity},
        )
        try:
            result += f"{entity} maps to {response[0]['result']} in database\n"
        except IndexError:
            pass
    return result


# Generate Cypher statement based on natural language input
cypher_template = """Based on the Neo4j graph schema below, write a Cypher query that would answer the user's question:
{schema}
Entities in the question map to the following database values:
{entities_list}
Question: {question}
Cypher query:"""  # noqa: E501

cypher_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Given an input question, convert it to a Cypher query. No pre-amble.",
        ),
        ("human", cypher_template),
    ]
)

cypher_response = (
    RunnablePassthrough.assign(names=entity_chain)
    | RunnablePassthrough.assign(
        entities_list=lambda x: map_to_database(x["names"]),
        schema=lambda _: graph.get_schema,
    )
    | cypher_prompt
    | llm
)

# Generate natural language response based on database results
response_system = """You are an assistant that helps to form nice and human 
understandable answers based on the provided information from tools.
Do not add any other information that wasn't present in the tools, and use 
very concise style in interpreting results!
"""

response_prompt = ChatPromptTemplate.from_messages(
    [
        SystemMessage(content=response_system),
        HumanMessagePromptTemplate.from_template("{question}"),
        MessagesPlaceholder(variable_name="function_response"),
    ]
)


def clean_query(query: str) -> str:
    # Regular expression pattern to match multiline ```cypher{...}```
    pattern = r"```cypher(.*?)```"
    # Search for the pattern across multiple lines
    matches = re.findall(pattern, query.content, re.DOTALL)
    # If a match is found, return the content inside the braces
    return matches[0] if matches else query.content


def get_function_response(
    query: str, question: str
) -> List[Union[AIMessage, ToolMessage]]:
    try:
        context = graph.query(cypher_validation(clean_query(query)))
    except Exception as e:
        context = str(e)
    TOOL_ID = "call_H7fABDuzEau48T10Qn0Lsh0D"
    messages = [
        AIMessage(
            content="",
            additional_kwargs={
                "tool_calls": [
                    {
                        "id": TOOL_ID,
                        "function": {
                            "arguments": '{"question":"' + question + '"}',
                            "name": "GetInformation",
                        },
                        "type": "function",
                    }
                ]
            },
        ),
        ToolMessage(content=str(context), tool_call_id=TOOL_ID),
    ]
    return messages


text2cypher_chain = (
    RunnablePassthrough.assign(query=cypher_response)
    | RunnablePassthrough.assign(
        function_response=lambda x: get_function_response(x["query"], x["question"])
    )
    | response_prompt
    | llm
    | StrOutputParser()
)

# Add typing for input


class Question(BaseModel):
    question: str


text2cypher_chain = text2cypher_chain.with_types(input_type=Question)
