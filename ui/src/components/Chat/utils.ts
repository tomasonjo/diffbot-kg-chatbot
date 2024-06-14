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

export function extractContext(input: string): string {
  console.log(input)
  if (!input) {
    return ""
  }

  debugger;

  const contextRegex = /<context>([\s\S]*?)<\/context>/;
  const match = input.match(contextRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return "";
}

export function extractKGData(context: string) {
  // TODO: improve the parsing by wrapping  prompt for unstructured data in <tags>
  const kgData = context.split("Unstructured data:")[0].trim().replace("Strucutred data:", "")
  console.log(kgData)
  debugger;
}
