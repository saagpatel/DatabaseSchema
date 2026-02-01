import { create } from "zustand";
import type { AiSuggestion, OllamaStatus } from "@/types/ai";

interface AiState {
  ollamaStatus: OllamaStatus | null;
  suggestions: AiSuggestion[];
  history: AiSuggestion[];
  generating: boolean;
  error: string | null;
  showHistory: boolean;
  setOllamaStatus: (status: OllamaStatus | null) => void;
  addSuggestion: (suggestion: AiSuggestion) => void;
  setHistory: (history: AiSuggestion[]) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setShowHistory: (show: boolean) => void;
  clearSuggestions: () => void;
}

export const useAiStore = create<AiState>((set) => ({
  ollamaStatus: null,
  suggestions: [],
  history: [],
  generating: false,
  error: null,
  showHistory: false,
  setOllamaStatus: (ollamaStatus) => set({ ollamaStatus }),
  addSuggestion: (suggestion) =>
    set((state) => ({ suggestions: [...state.suggestions, suggestion], error: null })),
  setHistory: (history) => set({ history }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  setShowHistory: (showHistory) => set({ showHistory }),
  clearSuggestions: () => set({ suggestions: [] }),
}));
