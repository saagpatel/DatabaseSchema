import { describe, it, expect, beforeEach } from "vitest";
import { useAiStore } from "./aiStore";
import type { AiSuggestion, OllamaStatus } from "@/types/ai";

const mockStatus: OllamaStatus = {
  available: true,
  endpoint: "http://localhost:11434",
  models: ["llama3.2", "codellama"],
  error: null,
};

const mockSuggestion: AiSuggestion = {
  id: "s1",
  connectionId: "c1",
  suggestionType: "query_optimization",
  inputContext: "SELECT * FROM users",
  suggestion: "Consider adding specific columns instead of SELECT *",
  confidence: null,
  accepted: false,
  createdAt: "2024-01-01 12:00:00",
};

describe("aiStore", () => {
  beforeEach(() => {
    useAiStore.setState({
      ollamaStatus: null,
      suggestions: [],
      history: [],
      generating: false,
      error: null,
      showHistory: false,
    });
  });

  it("sets ollama status", () => {
    useAiStore.getState().setOllamaStatus(mockStatus);
    const state = useAiStore.getState();
    expect(state.ollamaStatus?.available).toBe(true);
    expect(state.ollamaStatus?.models).toHaveLength(2);
  });

  it("adds suggestion and clears error", () => {
    useAiStore.getState().setError("old error");
    useAiStore.getState().addSuggestion(mockSuggestion);
    const state = useAiStore.getState();
    expect(state.suggestions).toHaveLength(1);
    expect(state.suggestions[0]?.suggestion).toContain("specific columns");
    expect(state.error).toBeNull();
  });

  it("sets history", () => {
    useAiStore.getState().setHistory([mockSuggestion]);
    expect(useAiStore.getState().history).toHaveLength(1);
  });

  it("sets generating state", () => {
    useAiStore.getState().setGenerating(true);
    expect(useAiStore.getState().generating).toBe(true);
  });

  it("sets error", () => {
    useAiStore.getState().setError("Ollama not available");
    expect(useAiStore.getState().error).toBe("Ollama not available");
  });

  it("toggles history panel", () => {
    useAiStore.getState().setShowHistory(true);
    expect(useAiStore.getState().showHistory).toBe(true);
  });

  it("clears suggestions", () => {
    useAiStore.getState().addSuggestion(mockSuggestion);
    useAiStore.getState().clearSuggestions();
    expect(useAiStore.getState().suggestions).toHaveLength(0);
  });

  it("accumulates multiple suggestions", () => {
    useAiStore.getState().addSuggestion(mockSuggestion);
    useAiStore.getState().addSuggestion({
      ...mockSuggestion,
      id: "s2",
      suggestion: "Second suggestion",
    });
    expect(useAiStore.getState().suggestions).toHaveLength(2);
  });
});
