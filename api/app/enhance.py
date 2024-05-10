import logging
import os
from typing import Any, Dict, List
from urllib.parse import urlencode

import requests

CATEGORY_THRESHOLD = 0.50
params = []

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]


def process_entities(entity: str, type: str) -> Dict[str, Any]:
    """
    Fetch relevant articles from Diffbot KG endpoint
    """
    print(entity, type)
    search_host = "https://kg.diffbot.com/kg/v3/enhance?"
    params = {"type": type, "name": entity, "token": DIFF_TOKEN}
    encoded_query = urlencode(params)
    url = f"{search_host}{encoded_query}"
    return requests.get(url).json()


def store_enhanced_data(data: List[Dict[str, Any]]):
    for element in data:
        print(element)
