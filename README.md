# News monitoring application and RAG chatbot

This project is designed to show an end-to-end pipeline for constructing knowledge graphs from news articles, analyzing them through various visualizations, and finally, allowing LLM to generate questions based on the information provided from the knowledge graph.

The project uses Neo4j, a graph database, to store the knowledge graph and Diffbot as the data provider. Diffbot offers various data integrations on its platform, such as:

* Latest or relevant news about a specific topic or company
* Extracting graph information from text
* Enriching organization or personal information

Lastly, the project uses OpenAI LLMs to provide a chat interface, which can answer questions based on the provided information from the knowledge graph.

## Setup

1. Set environment variables in `.env`. You can find the template in `.env.template`

2. Start the docker containers with

```
docker compose up 
```

3. Open you favorite browser on `localhost:3000`

## Contributions

Any contributions are welcomed through GitHub issues or pull requests.
