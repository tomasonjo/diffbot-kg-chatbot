import os

import requests
import streamlit as st

BASE_URL = os.environ.get("BASE_API_URL", "http://api:8000")
# Setting up the URL of the FastAPI endpoint
COUNT_URL = f"{BASE_URL}/unprocessed_count/"
PROCESS_URL = f"{BASE_URL}/enhance_entities/"


# Function to get data count
def get_data_count():
    response = requests.post(COUNT_URL, json={"type": "entities"})
    if response.status_code == 200:
        return response.json()
    else:
        raise RuntimeError("Failed to fetch data from the server.")


# Function to process data
def process_data():
    response = requests.post(PROCESS_URL, json={"size": size})
    if response.status_code == 200:
        # Invalidate the cache to fetch new count
        st.success("Articles processed successfully!")
        # Refresh data
    else:
        st.error(f"Failed to process articles. Error: {response.text}")


# Initialize session state
if "response_count_entities" not in st.session_state:
    st.session_state.response_count_entities = get_data_count()

# Streamlit interface
st.title("Enhancing knowledge graph")


st.text("")
st.text("")
st.text("")
st.text("")
st.text("")
st.text("")
# Display data count
st.markdown(
    f"#### **Entities that haven't been processed yet:** `{st.session_state.response_count_entities}`"
)
st.text("")
size = st.number_input(
    "Number of top mentioned entities to enhance", min_value=1, value=50
)
col1, col2 = st.columns([0.5, 1])
with col1:
    if st.session_state.response_count_entities == 0:
        st.button("Process with Enhance API", disabled=True)
    else:
        if st.button("Process with Enhance API", type="primary"):
            with st.spinner("Processing articles."):
                process_data()
with col2:
    if st.button("Refresh count", type="secondary"):
        st.session_state.response_count_entities = get_data_count()
        st.rerun()
