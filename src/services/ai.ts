import { invoke } from "@tauri-apps/api/core";
import type { AiSuggestInput, AiSuggestion, OllamaStatus } from "@/types/ai";

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  return invoke("check_ollama_status");
}

export async function aiSuggest(
  connectionId: string,
  input: AiSuggestInput
): Promise<AiSuggestion> {
  return invoke("ai_suggest", { connectionId, input });
}

export async function getAiHistory(
  connectionId: string,
  limit?: number
): Promise<AiSuggestion[]> {
  return invoke("get_ai_history", { connectionId, limit });
}

export async function acceptSuggestion(
  suggestionId: string
): Promise<void> {
  return invoke("accept_suggestion", { suggestionId });
}

export async function clearAiHistory(
  connectionId: string
): Promise<void> {
  return invoke("clear_ai_history", { connectionId });
}
