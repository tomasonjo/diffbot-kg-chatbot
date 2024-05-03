import os
import time

import requests
import streamlit as st

tab1, tab2 = st.tabs(["Articles", "NLP"])

BASE_URL = os.environ.get("BASE_API_URL", "http://127.0.0.1:8000")
# Setting up the URL of the FastAPI endpoint
ARTICLE_URL = f"{BASE_URL}/import_articles/"
COUNT_URL = f"{BASE_URL}/unprocessed_count/"
PROCESS_URL = f"{BASE_URL}/process_articles/"


# Function to get data count
@st.cache_data
def get_data_count():
    response = requests.get(COUNT_URL)
    if response.status_code == 200:
        return response.json()
    else:
        raise RuntimeError("Failed to fetch data from the server.")


# Function to process data
def process_data():
    response = requests.get(PROCESS_URL)
    if response.status_code == 200:
        # Invalidate the cache to fetch new count
        st.success("Articles processed successfully!")
        # Refresh data
        get_data_count.clear()
        st.session_state.response_count = get_data_count()
        # Sleep a bit for a smoother transition
        time.sleep(2)
        st.rerun()
    else:
        st.error(f"Failed to process articles. Error: {response.text}")


# Initialize session state
if "response_count" not in st.session_state:
    get_data_count.clear()
    st.session_state.response_count = get_data_count()

with tab1:
    # Streamlit interface
    st.title("Article Importer")
    # Input fields
    query = st.text_input("Query", value="Nvidia")
    size = st.number_input("Number of articles", min_value=1, value=5)

    # Button to send the request
    if st.button("Import Articles", type="primary"):
        with st.spinner("Waiting for response..."):
            # Sending the POST request to the FastAPI server
            response = requests.post(ARTICLE_URL, json={"query": query, "size": size})

            # Check the response status code
            if response.status_code == 200:
                import_count = response.json()
                st.success(f"Successfully imported {import_count} articles!")
                get_data_count.clear()
                st.session_state.response_count = get_data_count()
            else:
                st.error(f"Failed to import articles. Error: {response.text}")

with tab2:
    # Display data count
    if st.session_state.response_count == 0:
        st.write("No data available to process.")
        st.button("Process with NLP API", disabled=True)
    else:
        st.write(
            f"Articles that haven't been processed with NLP yet: {st.session_state.response_count}"
        )
        if st.button("Process with NLP API", type="primary"):
            with st.spinner("Waiting for response..."):
                process_data()
