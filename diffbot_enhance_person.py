def get_people_params(row: Dict) -> Optional[Dict]:
    firstName = row.get("nameDetail", {}).get("firstName", "")
    lastName = row.get("nameDetail", {}).get("lastName", "")
    name = (firstName + " " + lastName).strip()

    # Skip entries without a valid name
    if not name:
        return None

    node_properties = {
        "education": row.get("educations", [{}])[0]
        .get("institution", {})
        .get("name", ""),
        "wikipedia": row.get("wikipediaUri", {}),
        "description": row.get("description", {}),
        "summary": row.get("summary", {}),
        "net_worth": (
            str(row.get("netWorth", {}).get("value", ""))
            + " "
            + row.get("netWorth", {}).get("currency", "")
        ).strip(),
        "birth_date": row.get("birthDate", {}).get("str", "")[1:],
        "linkedin": row.get("linkedInUri", {}),
    }

    locations = [
        {
            "city": el.get("city", {}).get("name", ""),
            "summary": el.get("city", {}).get("summary", ""),
            "country": el.get("country", {}).get("name", ""),
        }
        for el in row.get("locations", [])
        if el.get("city", {}).get("name", "")
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


def store_enhanced_data(data: List[Dict[str, Any]]) -> Dict:
    organizations = []
    people = []
    no_data = []

    for element in data:
        try:
            entity = element["data"][0]["entity"]
        except (TypeError, IndexError):
            no_data.append(element["data"][0]["entity"]["name"])
            continue

        type = entity["type"]
        if type == "Organization":
            params = get_organization_params(name, entity)
            organizations.append(params)
        elif type == "Person":
            params = get_people_params(entity)
            people.append(params)

    if no_data:
        graph.query(no_data_processed_query, {"data": no_data})

    if organizations:
        graph.query(organization_import_query, {"data": organizations})

    if people:
        graph.query(person_import_query, {"data": people})

    return {"organizations": len(organizations), "people": len(people)}


person_import_query = """
    UNWIND $data AS row
    MERGE (p:Person {name: row.name})
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
        WITH p, org, emp
        CALL apoc.create.relationship(p, toUpper(emp.title), {isCurrent: emp.isCurrent, fromYear: emp.from, toYear: emp.to}, org) YIELD rel
        RETURN count(*) AS employmentCount
    }

    RETURN count(*) AS total
"""
