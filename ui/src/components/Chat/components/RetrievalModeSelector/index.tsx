import { HoverCard, Select, Text } from "@mantine/core";
import { IconInfoHexagon } from "@tabler/icons-react";
import { RETRIEVAL_MODES } from "../../../../global/constants";
import { globalStore } from "../../../../global/state";

export function RetrievalModeSelector() {
  const { retrievalMode, setRetrievalMode } = globalStore();
  const data = RETRIEVAL_MODES.map((mode) => ({
    value: mode.name,
    label: "RAG Mode: " + mode.label,
  }));

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Select
        value={retrievalMode}
        data={data}
        size="xs"
        onChange={(value) => setRetrievalMode(value as string)}
        mr="sm"
      />

      <HoverCard width={380} shadow="md" withArrow>
        <HoverCard.Target>
          <IconInfoHexagon />
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text size="xs" mb="sm">
            <strong>RAG Modes</strong>
          </Text>
          <Text size="xs" mb="sm">
            <strong>Vector only:</strong>
            <br />
            Uses a combination of vector and keyword search to find the most
            relevant text chunks
          </Text>
          <Text size="xs" mb="sm">
            <strong>Vector + KG:</strong>
            <br />
            Uses a combination of vector and keyword search to find the most
            relevant text chunks. Additionally, it identifies relevant nodes and
            return their neighborhoods.
            <br />
            <a
              target="_blank"
              href="https://medium.com/neo4j/enhancing-the-accuracy-of-rag-applications-with-knowledge-graphs-ad5e2ffab663"
            >
              Learn more
            </a>
          </Text>
          <Text size="xs" mb="sm">
            <strong>Prefiltering:</strong>
            <br />
            Uses a function calling approach to extract relevant parameters from
            input and dynamically generates Cypher statements.
            <br />
            <a
              target="_blank"
              href="https://medium.com/neo4j/graph-based-metadata-filtering-for-improving-vector-search-in-rag-applications-47fd2efcfc0a"
            >
              Learn more
            </a>
          </Text>
          <Text size="xs">
            <strong>Text2cypher:</strong>
            <br />
            Uses LLM to generate Cypher statement based on user input.
            <br />
            <a
              target="_blank"
              href="https://towardsdatascience.com/langchain-has-added-cypher-search-cb9d821120d5"
            >
              Learn more
            </a>
          </Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </div>
  );
}
