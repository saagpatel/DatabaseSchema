export type SuggestionType =
  | "query_optimization"
  | "index_suggestion"
  | "schema_review"
  | "general";

export interface AiSuggestInput {
  suggestionType: SuggestionType;
  context: string;
}

export interface AiSuggestion {
  id: string;
  connectionId: string;
  suggestionType: string;
  inputContext: string;
  suggestion: string;
  confidence: number | null;
  accepted: boolean;
  createdAt: string;
}

export interface OllamaStatus {
  available: boolean;
  endpoint: string;
  models: string[];
  error: string | null;
}
