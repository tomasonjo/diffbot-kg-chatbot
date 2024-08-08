import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlencode

import requests
from utils import graph

CATEGORY_THRESHOLD = 0.50
params = []

DIFF_TOKEN = os.environ["DIFFBOT_API_KEY"]


def get_datetime(value: Optional[Union[str, int, float]]) -> datetime:
    if not value:
        return value
    return datetime.fromtimestamp(float(value) / 1000.0)


def process_entities(entity: str, type: str) -> Dict[str, Any]:
    """
    Fetch relevant articles from Diffbot KG endpoint
    """
    search_host = "https://kg.diffbot.com/kg/v3/enhance?"
    params = {"type": type, "name": entity, "token": DIFF_TOKEN}
    encoded_query = urlencode(params)
    url = f"{search_host}{encoded_query}"
    return entity, requests.get(url).json()


def get_people_params(row: Dict) -> Optional[Dict]:
    firstName = row.get("nameDetail", {}).get("firstName", "")
    lastName = row.get("nameDetail", {}).get("lastName", "")
    name = (firstName + " " + lastName).strip()

    # Skip entries without a valid name
    if not name:
        return None

    node_properties = {
        "education": row.get("educations", [{}])[0].get("institution", {}).get("name"),
        "wikipedia": row.get("wikipediaUri"),
        "description": row.get("description"),
        "summary": row.get("summary"),
        "net_worth": (
            str(row.get("netWorth", {}).get("value", ""))
            + " "
            + row.get("netWorth", {}).get("currency", "")
        ).strip(),
        "birth_date": row.get("birthDate", {}).get("str", "")[1:],
        "linkedin": row.get("linkedInUri"),
    }

    locations = [
        {
            "city": el.get("city", {}).get("name"),
            "summary": el.get("city", {}).get("summary"),
            "country": el.get("country", {}).get("name"),
        }
        for el in row.get("locations", [])
        if el.get("city", {}).get("name")
    ]

    nationalities = (
        [
            {
                "name": row["nationalities"][-1]["name"],
                "type": row["nationalities"][-1].get("type", "Nationality"),
            }
        ]
        if row.get("nationalities") and "name" in row["nationalities"][-1]
        else []
    )

    employments = [
        {
            "title": el.get("title"),
            "employer": el.get("employer", {}).get("name"),
            "isCurrent": el.get("isCurrent", False),
            "from": el.get("from", {}).get("str", "")[1:5],
            "to": el.get("to", {}).get("str", "")[1:5],
        }
        for el in row.get("employments", [])
        if el.get("title") and el.get("employer", {}).get("name")
    ]

    return {
        "name": name,
        "type": row["type"],
        "node_properties": node_properties,
        "locations": locations,
        "nationalities": nationalities,
        "employments": employments,
    }


person_import_query = """
    UNWIND $data AS row
    MERGE (p:Person {name: row.name})
    ON CREATE SET p:__Entity__
    SET p += row.node_properties
    WITH p, row
    
    CALL {
        WITH p, row
        UNWIND row.locations AS loc
        MERGE (city:City {name: loc.city})
        ON CREATE SET city.summary = loc.summary, city.country = loc.country
        MERGE (p)-[:PERSON_LOCATION]->(city)
        RETURN count(*) AS locationCount
    }
    
    CALL {
        WITH p, row
        UNWIND row.nationalities AS nat
        MERGE (n:Nationality {name: nat.name})
        ON CREATE SET n.type = nat.type
        MERGE (p)-[:HAS_NATIONALITY]->(n)
        RETURN count(*) AS nationalityCount
    }
    
    CALL {
        WITH p, row
        UNWIND row.employments AS emp
        MERGE (org:Organization {name: emp.employer})
        ON CREATE SET org:`__Entity__`
        WITH p, org, emp
        MERGE (p)-[e:EMPLOYEE_OR_MEMBER_OF]->(org)
        SET e += {positionHeld: emp.title, isCurrent: emp.isCurrent, fromYear: emp.from, toYear: emp.to}
        RETURN count(*) AS employmentCount
    }

    RETURN count(*) AS total
"""


def get_organization_params(name: str, row: Dict) -> Dict:
    # Properties
    type = row["type"]
    node_properties = {
        "employees": row.get("nbEmployees"),
        "revenue": row.get("revenue", {}).get("value"),
        "stock": row.get("stock", {}).get("symbol"),
        "founding_date": get_datetime(row.get("foundingDate", {}).get("timestamp")),
        "wikipedia": row.get("wikipediaUri"),
        "ipo": get_datetime(row.get("ipo", {}).get("date", {}).get("timestamp")),
        "total_investment": row.get("totalInvestment", {}).get("value"),
        "linkedin": row.get("linkedInUri"),
        "is_dissolved": row.get("isDissolved"),
        "description": row.get("description"),
    }
    # relationships
    yearly_revenues = row.get("yearlyRevenues")
    suppliers = [
        {"name": el["name"], "type": el.get("type")} for el in row.get("suppliers", [])
    ]
    competitors = [
        {"name": el["name"], "type": el.get("type")}
        for el in row.get("competitors", [])
    ]
    classification = row.get("diffbotClassification", [])
    founders = [
        {"name": el["name"], "type": el.get("type")} for el in row.get("founders", [])
    ]
    try:
        ceo = {"name": row["ceo"]["name"], "type": row["ceo"]["type"]}
    except KeyError:
        ceo = None
    investments = [
        {
            "id": f"{name}-{index}",
            "series": el.get("series"),
            "amount": el.get("amount", {}).get("value"),
            "investors": [
                {"name": i["name"], "type": i.get("type")}
                for i in el.get("investors", [])
            ],
        }
        for index, el in enumerate(row.get("investments", []))
    ]
    partnerships = [
        {"name": el["name"], "type": el.get("type")}
        for el in row.get("partnerships", [])
    ]
    board_members = [
        {"name": el["name"], "type": el.get("type")}
        for el in row.get("boardMembers", [])
    ]
    subsidiaries = [
        {"name": el["name"], "type": el.get("type")}
        for el in row.get("subsidiaries", [])
    ]
    return {
        "name": name,
        "node_properties": node_properties,
        "suppliers": suppliers,
        "competitors": competitors,
        "classification": classification,
        "founders": founders,
        "ceo": ceo,
        "investments": investments,
        "partnerships": partnerships,
        "board_members": board_members,
        "subsidiaries": subsidiaries,
        "yearly_revenues": yearly_revenues,
    }


organization_import_query = """
UNWIND $data AS row
MERGE (o:`__Entity__` {name: row.name})
SET o += row.node_properties,
    o.processed = True
WITH o, row
FOREACH (c IN row.classification |
  MERGE (cl:Classification {name: c.name})
  MERGE (o)-[hc:HAS_CLASSIFICATION]->(cl)
  SET hc.isPrimary = c.isPrimary
)
WITH o, row
CALL {
    WITH o, row
    WITH o, row
    WHERE row.ceo IS NOT NULL
    MERGE (c:`__Entity__` {name: row.ceo.name})
    ON CREATE SET c.id = row.ceo.name
    MERGE (o)-[:HAS_CEO]->(c)
    WITH c, row.ceo.type AS type
    CALL apoc.create.addLabels(c, [type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.subsidiaries AS subsidiary
    MERGE (s:`__Entity__` {name: subsidiary.name})
    ON CREATE SET s.id = subsidiary.name
    MERGE (o)-[:HAS_SUBSIDIARY]->(s)
    WITH s, subsidiary
    CALL apoc.create.addLabels(s, [subsidiary.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.board_members AS board_member
    MERGE (s:`__Entity__` {name: board_member.name})
    ON CREATE SET s.id = board_member.name
    MERGE (o)-[:BOARD_MEMBER]->(s)
    WITH s, board_member
    CALL apoc.create.addLabels(s, [board_member.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.partnerships AS partnership
    MERGE (s:`__Entity__` {name: partnership.name})
    ON CREATE SET s.id = partnership.name
    MERGE (o)-[:PARTNERSHIP]->(s)
    WITH s, partnership
    CALL apoc.create.addLabels(s, [partnership.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.founders AS founder
    MERGE (s:`__Entity__` {name: founder.name})
    ON CREATE SET s.id = founder.name
    MERGE (o)-[:HAS_FOUNDER]->(s)
    WITH s, founder
    CALL apoc.create.addLabels(s, [founder.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.competitors AS competitor
    MERGE (s:`__Entity__` {name: competitor.name})
    ON CREATE SET s.id = competitor.name
    MERGE (o)-[:HAS_COMPETITOR]->(s)
    WITH s, competitor
    CALL apoc.create.addLabels(s, [competitor.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.suppliers AS supplier
    MERGE (s:`__Entity__` {name: supplier.name})
    ON CREATE SET s.id = supplier.name
    MERGE (o)-[:HAS_SUPPLIER]->(s)
    WITH s, supplier
    CALL apoc.create.addLabels(s, [supplier.type]) YIELD node
    RETURN count(*) AS count
}
WITH o, row
CALL {
    WITH o, row
    UNWIND row.investments AS investment
    MERGE (is:`InvestmentSeries` {id: investment.id})
    ON CREATE SET is.amount = investment.amount,
                  is.series = investment.series
    MERGE (o)-[:HAS_INVESTMENT]->(is)
    WITH is, investment
    UNWIND investment.investors as investor
    MERGE (es:`__Entity__` {name: investor.name})
    ON CREATE SET es.id = investor.name
    MERGE (es)-[:HAS_INVESTED]->(is)
    WITH es, investor
    CALL apoc.create.addLabels(es, [investor.type]) YIELD node
    RETURN count(*) AS count
}
WITH o
RETURN count(*)
"""

no_data_processed_query = """
UNWIND $data AS row
MATCH (e:`__Entity__` {name: row})
SET e.processed = True;
"""


def store_enhanced_data(data: List[Dict[str, Any]]) -> Dict:
    organizations = []
    people = []
    no_data = []
    for name, element in data:
        try:
            entity = element["data"][0]["entity"]
        except Exception:
            no_data.append(name)
            continue
        type = entity["type"]
        if type == "Organization":
            params = get_organization_params(name, entity)
            organizations.append(params)
        elif type == "Person":
            params = get_people_params(entity)
            people.append(params)
    # Save processes status to entities without any response
    if no_data:
        graph.query(no_data_processed_query, {"data": no_data})
    # Store organization
    if organizations:
        graph.query(organization_import_query, {"data": organizations})
    if people:
        graph.query(person_import_query, {"data": people})
    return {"organizations": len(organizations), "people": len(people)}
