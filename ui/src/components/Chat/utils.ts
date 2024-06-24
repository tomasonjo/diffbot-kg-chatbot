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
  if (!input) {
    return ""
  }

  const contextRegex = /<context>([\s\S]*?)<\/context>/;
  const match = input.match(contextRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return "";
}

export function extractKGData(context: string) {
  const kgData = context.split("Unstructured data:")[0].trim().replace("Structured data:\n", "").trim().split("\n");

  let n = new Set();
  let nodes: Record<string, string>[] = [];
  let relationships: Record<string, string>[] = []

  kgData.forEach(el => {
    const startRel = el.split(" - ");
    const start = startRel[0];
    const endRel = startRel[1].split(" -> ");
    const rel = endRel[0];
    const end = endRel[1];

    if (!n.has(start)) {
      n.add(start);
      nodes.push({
        id: start,
      })
    }
    if (!n.has(end)) {
      n.add(end);
      nodes.push({
        id: end,
      })
    }

    relationships.push({
      start,
      end,
      type: rel
    })
  });

  return {
    nodes: nodes,
    relationships: relationships
  }
}
