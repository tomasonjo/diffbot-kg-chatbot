import { Select } from "@mantine/core";
import { RETRIEVAL_MODES } from "../../../../global/constants";
import { globalStore } from "../../../../global/state";

export function RetrievalModeSelector() {
  const { retrievalMode, setRetrievalMode } = globalStore();
  const data = RETRIEVAL_MODES.map((mode) => ({
    value: mode.name,
    label: "RAG Mode: " + mode.label,
  }));

  return (
    <Select
      value={retrievalMode}
      data={data}
      size="xs"
      onChange={(value) => setRetrievalMode(value as string)}
    />
  );
}
