export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  mode?: string;
}
