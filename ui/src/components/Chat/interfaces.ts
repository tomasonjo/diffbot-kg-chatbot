export interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  context?: string;
  mode?: string;
  kgData?: Record<string, any> | null;
}
