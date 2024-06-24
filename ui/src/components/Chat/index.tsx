import {
  ActionIcon,
  Button,
  Checkbox,
  Notification,
  Textarea,
} from "@mantine/core";
import { IconSend2 } from "@tabler/icons-react";
import { RemoteRunnable } from "@langchain/core/runnables/remote";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { globalStore } from "../../global/state";
import { RETRIEVAL_MODES } from "../../global/constants";
import { ChatMessage } from "./interfaces";
import { extractContext, extractKGData, getChatHistory } from "./utils";
import { RetrievalModeSelector } from "./components/RetrievalModeSelector";
import { useQuery } from "@tanstack/react-query";
import { refreshSchema } from "../../api";

import styles from "./styles.module.css";
import { Message } from "./components/Message";

export function Chat() {
  const { retrievalMode, includeChatHistory, setIncludeChatHistory } =
    globalStore();

  const outputTextRef = useRef<HTMLDivElement | null>(null);

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const refreshSchemaQuery = useQuery({
    queryKey: ["refresh-schema"],
    queryFn: refreshSchema,
    enabled: false,
  });

  const handleSubmit = async () => {
    if (input.trim() === "") return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", text: input, mode: retrievalMode },
    ]);

    setInput("");
    setError("");
    setIsGenerating(true);

    const mode = RETRIEVAL_MODES.find(({ name }) => name === retrievalMode);

    if (!mode) {
      throw new Error("Passed invalid retrieval mode.");
    }

    try {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "" },
      ]);

      const remoteChain = new RemoteRunnable({
        url: `/api/${mode.endpoint}`,
      });

      let payload: Record<string, any>;
      const chatHistory = includeChatHistory ? getChatHistory(messages, 3) : [];

      switch (mode.name) {
        case "graph_based_prefiltering":
          payload = {
            input,
            chat_history: chatHistory,
          };
          break;
        case "text2cypher":
          payload = {
            question: input,
            chat_history: chatHistory,
          };
          break;
        default:
          payload = {
            question: input,
            chat_history: chatHistory,
            mode: mode.name,
          };
      }

      const stream = await remoteChain.streamLog(payload);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentOutput: any;

      for await (const chunk of stream) {
        if (!currentOutput) {
          currentOutput = chunk;
        } else {
          currentOutput = currentOutput.concat(chunk);
        }

        handleStreamOutput(currentOutput);
      }

      console.log("currentOutput", currentOutput);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error invoking remote chain:", error);
      setError(error.message ? error.message : `${JSON.stringify(error)}`);
    }
    setIsGenerating(false);
  };

  const handleStreamOutput = (currentOutput: any) => {
    let query = "";
    let output = "";
    let steps = "";

    const state = currentOutput?.state;

    // append query if it was used
    if (state?.logs?.["RunnableParallel<query>"]?.final_output?.query) {
      query =
        state.logs["RunnableParallel<query>"].final_output.query.content + "\n";
    }

    setMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      const lastMessage = newMessages[newMessages.length - 1];

      if (currentOutput?.state?.final_output) {
        if (typeof currentOutput?.state?.final_output === "object") {
          // prefiltering final_output is an object - we include steps
          if (state.final_output?.steps) {
            steps = state.final_output.steps.reduce(
              (output: string, currentStep: any) => {
                return output + currentStep?.action?.log;
              },
              "",
            );
          }
          // and we read output param string inside of final_output
          output = state.final_output.output ? state.final_output.output : "";
        } else {
          // otherwise it's a string
          output = state.final_output;
        }
      }

      // retrieve context + kg graph data
      let context = lastMessage.context ? lastMessage.context : "";
      let kgData = lastMessage.kgData ? lastMessage.kgData : null;

      if (context.length === 0) {
        switch (retrievalMode) {
          case "basic_hybrid_search":
            context = extractContext(
              state?.logs?.["ChatPromptTemplate"]?.final_output?.lc_kwargs
                .messages[0].content,
            );
            break;
          case "basic_hybrid_search_node_neighborhood":
            context = extractContext(
              state?.logs?.["ChatPromptTemplate:2"]?.final_output?.lc_kwargs
                .messages[0].content,
            );
            if (context !== "") {
              kgData = extractKGData(context);
              console.log("kgData", kgData);
            }
            break;
          case "graph_based_prefiltering":
            const gbpMessage =
              state?.logs?.[
                "RunnableParallel<input,chat_history,agent_scratchpad>:2"
              ]?.final_output?.agent_scratchpad[1];
            if (gbpMessage) {
              context = gbpMessage.content;
            }
            break;
          case "text2cypher":
            const t2cMessage =
              state?.logs?.["RunnableParallel<function_response>"]?.final_output
                ?.function_response?.[1];
            if (t2cMessage) {
              context = t2cMessage.content;
            }
            break;
          default:
            context = "";
        }
      }

      newMessages[newMessages.length - 1] = {
        ...lastMessage,
        text: query + steps + output,
        context,
        kgData,
      };

      return newMessages;
    });
  };

  const handleTextareaInputChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const scrollToBottom = () => {
    if (outputTextRef.current) {
      outputTextRef.current.scrollTop = outputTextRef.current.scrollHeight;
    }
  };

  const isAtBottom = () => {
    return (
      outputTextRef.current &&
      outputTextRef.current.scrollHeight - outputTextRef.current.scrollTop ===
        outputTextRef.current.clientHeight
    );
  };

  useEffect(() => {
    scrollToBottom();

    const observer = new MutationObserver(() => {
      if (!isAtBottom()) {
        scrollToBottom();
      }
    });

    if (outputTextRef.current) {
      observer.observe(outputTextRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.chat}>
      <div className={styles.output}>
        <div className={styles.outputText} ref={outputTextRef}>
          <div>
            {messages.map((message, index) => (
              <Message
                message={message}
                index={index}
                key={index}
                isGenerating={
                  isGenerating &&
                  message.sender === "bot" &&
                  index === messages.length - 1
                }
              />
            ))}
            {error && (
              <Notification
                color="red"
                title="Error!"
                withCloseButton={false}
                style={{ boxShadow: "none" }}
              >
                {JSON.stringify(error)}
              </Notification>
            )}
          </div>
        </div>
      </div>
      <div className={styles.input}>
        <div className={styles.inputTextarea}>
          <Textarea
            size="lg"
            placeholder="How can I help you today?"
            autosize
            minRows={1}
            maxRows={10}
            value={input}
            onKeyDown={handleKeyDown}
            onChange={handleTextareaInputChange}
          />
          <div className={styles.inputAction}>
            <ActionIcon
              variant="filled"
              aria-label="Settings"
              size="lg"
              onClick={handleSubmit}
              color="teal"
              disabled={input.length === 0}
            >
              <IconSend2 style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
          </div>
        </div>
        <div className={styles.inputOptions}>
          <div className={styles.mode}>
            <RetrievalModeSelector />
          </div>
          {retrievalMode === "text2cypher" && (
            <Button
              size="xs"
              loading={refreshSchemaQuery.isFetching}
              variant="subtle"
              color="teal"
              onClick={() => refreshSchemaQuery.refetch()}
            >
              Refresh schema
            </Button>
          )}
          <div className={styles.chatHistory} style={{ marginLeft: "auto" }}>
            <Checkbox
              color="teal"
              checked={includeChatHistory}
              label="Include chat history"
              onChange={() => setIncludeChatHistory(!includeChatHistory)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
