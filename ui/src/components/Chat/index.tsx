import { ActionIcon, Textarea } from "@mantine/core";
import { IconMoodSmile, IconRobotFace, IconSend2 } from "@tabler/icons-react";
import { RemoteRunnable } from "@langchain/core/runnables/remote";

import styles from "./styles.module.css";
import { ChangeEvent, useState } from "react";

const remoteChain = new RemoteRunnable({
  url: "/api/chat"
});

interface ChatMessage {
    sender: "user" | "bot";
    text: string;
}

const RAG_MODE = [
    "Basic Hybrid Search",
    "Basic Hybrid+Node Neighborhood",
    "Graph-based prefiltering",
    "Text2Cypher",
]

export function Chat() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const handleSubmit = async () => {
        if (input.trim() === "") return;

        setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "user", text: input },
        ]);

        setInput("");

        try {
            const stream = await remoteChain.stream({
                "question": input,
                "chat_history": [],
                "mode": RAG_MODE[0]
            });

            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "bot", text: "" },
            ]);

             for await (const chunk of stream) {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    const lastMessage = newMessages[newMessages.length - 1];

                    newMessages[newMessages.length - 1] = {
                        ...lastMessage,
                        text: lastMessage.text + chunk
                    };

                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Error invoking remote chain:", error);

            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: "bot", text: "Error: Unable to get response" },
            ]);
        }
    };

    const handleTextareaInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={styles.chat}>
            <div className={styles.output}>
                <div className={styles.outputText}>
                    {messages.map((message, index) => (
                        <div key={index} className={styles.message}>
                            <div className={styles.messageAvatar}>
                                {message.sender === "user" ? <IconMoodSmile /> : <IconRobotFace />}
                            </div>
                            <div className={styles.messageText}>{message.text}</div>
                        </div>
                    ))}
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
                        <ActionIcon variant="filled" aria-label="Settings" size="lg" onClick={handleSubmit}>
                            <IconSend2 style={{ width: '70%', height: '70%' }} stroke={1.5} />
                        </ActionIcon>
                    </div>
                </div>
            </div>
        </div>
    )
}
