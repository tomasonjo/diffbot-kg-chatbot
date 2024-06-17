import Markdown from "react-markdown";
import { ActionIcon, Modal, Paper } from "@mantine/core";
import { RETRIEVAL_MODES } from "../../../../global/constants";
import { ChatMessage } from "../../interfaces";
import {
  IconChevronRight,
  IconCode,
  IconMoodSmile,
  IconRobotFace,
} from "@tabler/icons-react";

import styles from "./styles.module.css";
import { useDisclosure } from "@mantine/hooks";

interface Props {
  message: ChatMessage;
  index: number;
  isGenerating: boolean;
}

export function Message({ message, index, isGenerating }: Props) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Paper
      key={index}
      mb="xs"
      p="xs"
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className={styles.message}>
        <div className={styles.messageAvatar}>
          {message.sender === "user" ? <IconMoodSmile /> : <IconRobotFace />}
        </div>
        <div className={styles.messageText}>
          {message.sender === "bot" && message.text.length === 0 && (
            <IconChevronRight size={18} style={{ marginBottom: "-3px" }} />
          )}
          <Markdown>{message.text}</Markdown>
          {message.mode && (
            <div className={styles.messageMeta}>
              RAG Mode:{" "}
              {RETRIEVAL_MODES.find(({ name }) => name === message.mode)?.label}
            </div>
          )}
        </div>
        {message.context && (
          <>
            <Modal
              opened={opened}
              onClose={close}
              title="Context Data"
              size="xl"
            >
              <pre className={styles.messageContext}>
                <code>{message.context}</code>
              </pre>
            </Modal>
            <ActionIcon size="xs" ml="sm" onClick={open} color="gray">
              <IconCode />
            </ActionIcon>
          </>
        )}
      </div>
      {isGenerating && <div className={styles.isGenerating}></div>}
    </Paper>
  );
}
