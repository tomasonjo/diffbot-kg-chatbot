import os
import time

import requests
import streamlit as st

BASE_URL = os.environ.get("BASE_API_URL", "http://127.0.0.1:8000")
# Setting up the URL of the FastAPI endpoint
ARTICLE_URL = f"{BASE_URL}/import_articles/"

# Streamlit interface
st.title("Article Importer")
st.subheader("Fill-in the company you are interested in!")
# Input fields
query = st.text_input("Query", value="Nvidia")
size = st.number_input("Number of articles", min_value=1, value=50)
# Button to send the request
if st.button("Import articles", type="primary"):
    with st.spinner("Importing articles..."):
        # Sending the POST request to the FastAPI server
        response = requests.post(ARTICLE_URL, json={"query": query, "size": size})

        # Check the response status code
        if response.status_code == 200:
            import_count = response.json()
            st.success(f"Successfully imported {import_count} articles!")
        else:
            st.error(f"Failed to import articles. Error: {response.text}")
