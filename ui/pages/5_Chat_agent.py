import asyncio
import os
from typing import List, Optional, Tuple

import requests
import streamlit as st
from langserve import RemoteRunnable
from streamlit.logger import get_logger

logger = get_logger(__name__)

BASE_URL = os.environ.get("BASE_API_URL", "http://api:8000")
REFRESH_URL = BASE_URL + "/refresh_schema"

st.title("News chat agent")


def refresh_schema():
    response = requests.get(REFRESH_URL)
    if response.status_code == 200:
        # Invalidate the cache to fetch new count
        st.success("Schema refreshed succesfuly!")
        # Refresh data
    else:
        st.error(f"Failed to refresh schema. Error: {response.text}")


with st.sidebar:
    options = [
        "Basic Hybrid Search",
        "Basic Hybrid+Node Neighborhood",
        "Graph-based prefiltering",
        "Text2Cypher",
    ]
    mode = st.radio("Select RAG mode", options)
    if mode == "Text2Cypher":
        if st.button("Refresh graph schema", type="primary"):
            with st.spinner("Refreshing"):
                refresh_schema()


class StreamHandler:
    def __init__(self, container, status, initial_text=""):
        self.status = status
        self.container = container
        self.text = initial_text
        self.existing_statuses = set()

    def new_token(self, token: str) -> None:
        self.text += token
        self.container.markdown(self.text)

    def new_status(self, status_update: str) -> None:
        if not status_update in self.existing_statuses:
            self.existing_statuses.add(status_update)
            status.update(label="Generating answer🤖", state="running", expanded=True)
            with status:
                st.write(status_update)


for o in options:
    # Initialize chat history
    if "generated_" + o not in st.session_state:
        st.session_state[f"generated_{o}"] = []
    if "user_input_" + o not in st.session_state:
        st.session_state[f"user_input_{o}"] = []

# Display user message in chat message container
if st.session_state[f"generated_{mode}"]:
    size = len(st.session_state[f"generated_{mode}"])
    # Display only the last three exchanges
    for i in range(max(size - 3, 0), size):
        with st.chat_message("user"):
            st.markdown(st.session_state[f"user_input_{mode}"][i])
        with st.chat_message("assistant"):
            st.markdown(st.session_state[f"generated_{mode}"][i])


async def get_chat_response(
    input: str, stream_handler: StreamHandler, chat_history: Optional[List[Tuple]] = []
):
    url = BASE_URL + "/chat/"
    st.session_state[f"generated_{mode}"].append("")
    remote_runnable = RemoteRunnable(url)
    async for chunk in remote_runnable.astream_log(
        {"question": input, "chat_history": chat_history, "mode": mode}
    ):
        log_entry = chunk.ops[0]
        value = log_entry.get("value")
        # if isinstance(value, dict) and isinstance(value.get("steps"), list):
        #    for step in value.get("steps"):
        #        stream_handler.new_status(step["action"].log.strip("\n"))
        if isinstance(value, str) and "StrOutputParser" in log_entry["path"]:
            st.session_state[f"generated_{mode}"][-1] += value
            stream_handler.new_token(value)


async def get_text2cypher_response(
    input: str, stream_handler: StreamHandler, chat_history: Optional[List[Tuple]] = []
):
    url = BASE_URL + "/text2cypher/"
    st.session_state[f"generated_{mode}"].append("")
    remote_runnable = RemoteRunnable(url)
    async for chunk in remote_runnable.astream_log(
        {"question": input, "chat_history": chat_history, "mode": mode}
    ):
        log_entry = chunk.ops[0]
        value = log_entry.get("value")
        if (
            isinstance(value, dict)
            and value.get("query")
            and hasattr(value.get("query"), "content")
            and "```cypher" in value.get("query").content
        ):
            stream_handler.new_status(value.get("query").content)
        elif isinstance(value, str) and "StrOutputParser" in log_entry["path"]:
            st.session_state[f"generated_{mode}"][-1] += value
            stream_handler.new_token(value)


def generate_history(mode):
    context = []
    # If any history exists
    if st.session_state[f"generated_{mode}"]:
        # Add the last three exchanges
        size = len(st.session_state[f"generated_{mode}"])
        for i in range(max(size - 3, 0), size):
            context.append(
                (
                    st.session_state[f"user_input_{mode}"][i],
                    st.session_state[f"generated_{mode}"][i],
                )
            )
    return context


# Accept user input
if prompt := st.chat_input("How can I help you today?"):
    with st.chat_message("user"):
        st.markdown(prompt)
    with st.chat_message("assistant"):
        status = st.status("Generating answer🤖")
        stream_handler = StreamHandler(st.empty(), status)

    chat_history = generate_history(mode=mode)
    # Create an event loop: this is needed to run asynchronous functions
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    if mode == "Text2Cypher":
        # Run the asynchronous function within the event loop
        loop.run_until_complete(
            get_text2cypher_response(prompt, stream_handler, chat_history)
        )
    else:
        # Run the asynchronous function within the event loop
        loop.run_until_complete(get_chat_response(prompt, stream_handler, chat_history))
    # Close the event loop
    loop.close()
    status.update(label="Finished!", state="complete", expanded=False)
    # Add user message to chat history
    st.session_state[f"user_input_{mode}"].append(prompt)
