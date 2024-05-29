import { Radio, Stack } from "@mantine/core";
import { RETRIEVAL_MODES } from "../../../../global/constants";
import { globalStore } from "../../../../global/state";

export function RetrievalModeSelector() {
  const { retrievalMode, setRetrievalMode } = globalStore();

  return (
    <Stack p="xs">
      {RETRIEVAL_MODES.map(({ name, label }) => {
        return (
          <Radio
            key={name}
            checked={name === retrievalMode}
            onChange={() => setRetrievalMode(name)}
            label={label}
          />
        );
      })}
    </Stack>
  );
}
