import { create } from "zustand";
import type { QueryResult, ExplainResult, QueryHistoryEntry } from "@/types/query";

interface QueryState {
  sql: string;
  result: QueryResult | null;
  explainResult: ExplainResult | null;
  history: QueryHistoryEntry[];
  executing: boolean;
  error: string | null;
  showHistory: boolean;
  setSql: (sql: string) => void;
  setResult: (result: QueryResult | null) => void;
  setExplainResult: (result: ExplainResult | null) => void;
  setHistory: (history: QueryHistoryEntry[]) => void;
  setExecuting: (executing: boolean) => void;
  setError: (error: string | null) => void;
  setShowHistory: (show: boolean) => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  sql: "SELECT 1;",
  result: null,
  explainResult: null,
  history: [],
  executing: false,
  error: null,
  showHistory: false,
  setSql: (sql) => set({ sql }),
  setResult: (result) => set({ result, explainResult: null, error: null }),
  setExplainResult: (explainResult) =>
    set({ explainResult, result: null, error: null }),
  setHistory: (history) => set({ history }),
  setExecuting: (executing) => set({ executing }),
  setError: (error) => set({ error, result: null, explainResult: null }),
  setShowHistory: (showHistory) => set({ showHistory }),
}));
