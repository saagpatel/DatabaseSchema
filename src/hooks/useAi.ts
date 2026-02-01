import { useCallback } from "react";
import { useAiStore } from "@/stores/aiStore";
import * as aiService from "@/services/ai";
import type { SuggestionType } from "@/types/ai";

export function useAi() {
  const store = useAiStore();

  const checkStatus = useCallback(async () => {
    try {
      const status = await aiService.checkOllamaStatus();
      useAiStore.getState().setOllamaStatus(status);
    } catch (err) {
      useAiStore.getState().setOllamaStatus({
        available: false,
        endpoint: "",
        models: [],
        error: String(err),
      });
    }
  }, []);

  const suggest = useCallback(
    async (connectionId: string, suggestionType: SuggestionType, context: string) => {
      const s = useAiStore.getState();
      s.setGenerating(true);
      s.setError(null);
      try {
        const result = await aiService.aiSuggest(connectionId, {
          suggestionType,
          context,
        });
        useAiStore.getState().addSuggestion(result);
      } catch (err) {
        useAiStore.getState().setError(String(err));
      } finally {
        useAiStore.getState().setGenerating(false);
      }
    },
    []
  );

  const loadHistory = useCallback(
    async (connectionId: string) => {
      try {
        const history = await aiService.getAiHistory(connectionId);
        useAiStore.getState().setHistory(history);
      } catch (err) {
        useAiStore.getState().setError(String(err));
      }
    },
    []
  );

  const acceptSuggestion = useCallback(
    async (suggestionId: string) => {
      try {
        await aiService.acceptSuggestion(suggestionId);
      } catch (err) {
        useAiStore.getState().setError(String(err));
      }
    },
    []
  );

  const clearHistory = useCallback(
    async (connectionId: string) => {
      try {
        await aiService.clearAiHistory(connectionId);
        useAiStore.getState().setHistory([]);
      } catch (err) {
        useAiStore.getState().setError(String(err));
      }
    },
    []
  );

  return {
    ollamaStatus: store.ollamaStatus,
    suggestions: store.suggestions,
    history: store.history,
    generating: store.generating,
    error: store.error,
    showHistory: store.showHistory,
    setShowHistory: store.setShowHistory,
    clearSuggestions: store.clearSuggestions,
    checkStatus,
    suggest,
    loadHistory,
    acceptSuggestion,
    clearHistory,
  };
}
