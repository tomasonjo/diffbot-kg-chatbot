import { ChatMessage } from "./interfaces";

export function getChatHistory(messages: ChatMessage[], numLastExchanges = 3) {
  const lastMessages = messages.slice(-numLastExchanges * 2);
  const pairs = [];
  for (let i = 0; i < lastMessages.length; i += 2) {
    const pair = [];
    pair[0] = lastMessages[i].text;
    pair[1] = lastMessages[i + 1].text;
    pairs.push(pair);
  }
  return pairs;
}
