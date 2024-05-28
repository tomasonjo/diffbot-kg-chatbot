import { Radio, Stack } from "@mantine/core";
import { useState } from "react";

const RETRIEVAL_MODES = [
  {
    mode: "basic_hybrid_search",
    label: "Basic hybrid search",
  },
  {
    mode: "basic_hybrid_search_node_neighborhood",
    label: "Basic hybrid + node neighborhood",
  },
  {
    mode: "graph_based_prefiltering",
    label: "Graph-based prefiltering",
  },
  {
    mode: "text2cypher",
    label: "Text2Cypher",
  },
];

export function RetrievalModeSelector() {
  const [selectedMode, setSelectedMode] = useState(RETRIEVAL_MODES[0].mode);

  return (
    <Stack p="xs">
      {RETRIEVAL_MODES.map(({ mode, label }) => {
        return (
          <Radio
            checked={mode === selectedMode}
            onChange={() => setSelectedMode(mode)}
            label={label}
          />
        );
      })}
    </Stack>
  );
}
