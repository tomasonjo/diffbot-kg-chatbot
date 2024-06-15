import { create } from "zustand";
import { RETRIEVAL_MODES } from "./constants";

interface GlobalStore {
  retrievalMode: string;
  setRetrievalMode: (name: string) => void;
  includeChatHistory: boolean;
  setIncludeChatHistory: (value: boolean) => void;
}

export const globalStore = create<GlobalStore>((set) => ({
  retrievalMode: RETRIEVAL_MODES[0].name,
  setRetrievalMode: (name: string) => set(() => ({ retrievalMode: name })),
  includeChatHistory: true,
  setIncludeChatHistory: (value: boolean) => set(() => ({ includeChatHistory: value })),
}));
