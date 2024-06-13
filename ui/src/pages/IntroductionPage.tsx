import { Box, Paper, Title, Text, List } from "@mantine/core";

export function IntroductionPage() {
  return (
    <Box p="lg">
      <Paper maw={640} mx="auto" shadow="xs" p="lg">
        <Title order={2} mb="lg">
          Neo4j and Diffbot GraphRAG demo!
        </Title>
        <Text size="lg" mb="lg">
          This demo is designed as an end-to-end pipeline from constructing
          knowledge graphs to querying them using LLMs and various RAG
          approaches.
        </Text>

        <Text mb="lg">The sections are the following:</Text>
        <List type="ordered">
          <List.Item>
            <strong>Import articles:</strong> Uses{" "}
            <a href="https://docs.diffbot.com/reference/introduction-to-search-dql">
              Diffbot search API
            </a>{" "}
            to retrieve and store a lexical news graph<br /> in Neo4j based on the
            selected keyword or topics
          </List.Item>
          <List.Item>
            <strong>Natural language processing:</strong> Uses{" "}
            <a href="https://docs.diffbot.com/reference/introduction-to-natural-language-api">
              Diffbot NLP API
            </a>{" "}
            to process text from news and extract relevant entities and
            relationships. The NLP API uses a predefined graph schema for
            extraction.
          </List.Item>
          <List.Item>
            <strong>Enhance entities:</strong> Uses{" "}
            <a href="https://docs.diffbot.com/reference/introduction-to-search-dql">
              Diffbot search API
            </a>{" "}
            to retrieve additional information about most mentioned people and
            organizations and stores the enrichment data to the knowledge graph.
          </List.Item>
          <List.Item>
            <strong>Dashboard:</strong> Sample with various charts for analyzing the underlying
            knowledge graph
          </List.Item>
          <List.Item>
            <strong>Network graph:</strong> Network visualization of the underlying knowledge
            graph
          </List.Item>
          <List.Item>
            <strong>Chat agent:</strong> provides various GraphRAG implementations to allow the
            LLM to<br /> answer questions based on the provided information from the
            knowledge graph
          </List.Item>
        </List>
      </Paper>
    </Box>
  );
}
