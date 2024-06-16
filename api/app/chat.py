import logging
from typing import List, Tuple

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
)
from langchain_core.prompts.prompt import PromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.runnables import (
    RunnableBranch,
    RunnableLambda,
    RunnableParallel,
    RunnablePassthrough,
)
from utils import (
    _format_chat_history,
    entity_chain,
    format_docs,
    generate_full_text_query,
    graph,
    llm,
    vector_index,
)

# Condense a chat history and follow-up question into a standalone question
rewrite_template = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""  # noqa: E501
CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(rewrite_template)

# RAG answer synthesis prompt
template = """You are a helpful assistant that answers questions based on the provided context.
Answer the question based only on the following context:
<context>
{context}
</context>
If the context doesn't provide any helpful information, say that you don't know the answer.
"""

ANSWER_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", template),
        MessagesPlaceholder(variable_name="chat_history"),
        ("user", "{question}"),
    ]
)

_search_query = RunnableBranch(
    # If input includes chat_history, we condense it with the follow-up question
    (
        RunnableLambda(lambda x: bool(x.get("chat_history"))).with_config(
            run_name="HasChatHistoryCheck"
        ),  # Condense follow-up question and chat into a standalone_question
        RunnablePassthrough.assign(
            chat_history=lambda x: _format_chat_history(x["chat_history"])
        )
        | CONDENSE_QUESTION_PROMPT
        | llm,
    ),
    # Else, we have no chat history, so just pass through the question
    RunnableLambda(lambda x: x["question"]),
)


# Fulltext index query
def structured_retriever(question: str) -> str:
    """
    Collects the neighborhood of entities mentioned
    in the question
    """
    result = ""
    entities = entity_chain.invoke({"question": question})
    for entity in entities.names:
        response = graph.query(
            """CALL db.index.fulltext.queryNodes('entity', $query, {limit:2})
            YIELD node,score
            CALL {
              WITH node
              MATCH (node)-[r:!MENTIONS]->(neighbor)
              RETURN node.name + ' - ' + type(r) + ' -> ' + neighbor.name AS output
              UNION ALL
              WITH node
              MATCH (node)<-[r:!MENTIONS]-(neighbor)
              RETURN neighbor.name + ' - ' + type(r) + ' -> ' +  node.name AS output
            }
            RETURN output LIMIT 200
            """,
            {"query": generate_full_text_query(entity)},
        )
        if response:
            result += "\n".join([el["output"] for el in response if el["output"]])
    return result


def retriever(input) -> str:
    print(input)
    # Rewrite query if needed
    query = input.get("search_query")
    if not isinstance(query, str):
        query = query.content
    # Retrieve documents from vector index
    documents = format_docs(vector_index.similarity_search(query))
    if input.get("question", {}).get("mode") == "basic_hybrid_search_node_neighborhood":
        structured_data = structured_retriever(query)
        print(structured_data)
        documents = f"""Structured data:
        {structured_data}
        Unstructured data:
        {documents}"""
    return documents


chain = (
    RunnableParallel(
        {
            "question": RunnablePassthrough(),
            "chat_history": lambda x: (
                _format_chat_history(x["chat_history"]) if x.get("chat_history") else []
            ),
            "search_query": _search_query,
        }
    )
    | RunnableParallel(
        {
            "question": lambda x: x["question"],
            "chat_history": lambda x: x["chat_history"],
            "context": retriever,
        }
    )
    | ANSWER_PROMPT
    | llm
    | StrOutputParser()
)


# Add typing for input
class ChainInput(BaseModel):
    question: str
    chat_history: List[Tuple[str, str]] = Field(
        ..., extra={"widget": {"type": "chat", "input": "input", "output": "output"}}
    )
    mode: str


chain = chain.with_types(input_type=ChainInput)
