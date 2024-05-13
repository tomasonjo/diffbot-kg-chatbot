import os

import pandas as pd
import requests
import streamlit as st

BASE_URL = os.environ.get("BASE_API_URL", "http://api:8000")
# Setting up the URL of the FastAPI endpoint
COUNT_URL = f"{BASE_URL}/dashboard/"


# Function to get data count
def get_data_count():
    with st.spinner("Getting data"):
        response = requests.get(COUNT_URL)
        if response.status_code == 200:
            return response.json()
        else:
            raise RuntimeError("Failed to fetch data from the server.")


# Streamlit interface
st.title("Dashboard")

dashboard_data = get_data_count()

if dashboard_data:
    col1, col2 = st.columns([1, 1])
    with col1:
        nested_col1, nested_col2 = st.columns([1, 1])
        with nested_col1:
            st.metric(
                label="Number of articles",
                value=dashboard_data.get("article").get("article_count"),
            )
        with nested_col2:
            st.metric(
                label="Number of entities",
                value=dashboard_data.get("entity").get("count"),
            )
    with col2:
        st.write("Article sentiment")
        st.bar_chart(
            pd.DataFrame.from_records(
                dashboard_data.get("article", {}).get("sentiment")
            ),
            x="sentiment",
            y="count",
        )
    st.write("Entity types")
    st.bar_chart(
        pd.DataFrame.from_records(dashboard_data.get("entity", {}).get("types")),
        x="label",
        y="count",
    )
