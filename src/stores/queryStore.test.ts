import { describe, it, expect, beforeEach } from "vitest";
import { useQueryStore } from "./queryStore";
import type { QueryResult, ExplainResult, QueryHistoryEntry } from "@/types/query";

const mockResult: QueryResult = {
  columns: ["id", "name"],
  rows: [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ],
  rowCount: 2,
  executionTimeMs: 12,
};

const mockExplain: ExplainResult = {
  plan: [{ "Plan": { "Node Type": "Seq Scan" } }],
  executionTimeMs: 5,
};

const mockHistory: QueryHistoryEntry[] = [
  {
    id: "h1",
    connectionId: "c1",
    sqlText: "SELECT 1",
    executionTimeMs: 2,
    rowCount: 1,
    status: "success",
    errorMessage: null,
    createdAt: "2024-01-01 12:00:00",
  },
];

describe("queryStore", () => {
  beforeEach(() => {
    useQueryStore.setState({
      sql: "SELECT 1;",
      result: null,
      explainResult: null,
      history: [],
      executing: false,
      error: null,
      showHistory: false,
    });
  });

  it("sets SQL", () => {
    useQueryStore.getState().setSql("SELECT * FROM users;");
    expect(useQueryStore.getState().sql).toBe("SELECT * FROM users;");
  });

  it("sets result and clears explain/error", () => {
    useQueryStore.getState().setError("old error");
    useQueryStore.getState().setResult(mockResult);
    const state = useQueryStore.getState();
    expect(state.result?.rowCount).toBe(2);
    expect(state.explainResult).toBeNull();
    expect(state.error).toBeNull();
  });

  it("sets explain result and clears result/error", () => {
    useQueryStore.getState().setResult(mockResult);
    useQueryStore.getState().setExplainResult(mockExplain);
    const state = useQueryStore.getState();
    expect(state.explainResult?.executionTimeMs).toBe(5);
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
  });

  it("sets error and clears result/explain", () => {
    useQueryStore.getState().setResult(mockResult);
    useQueryStore.getState().setError("Query failed");
    const state = useQueryStore.getState();
    expect(state.error).toBe("Query failed");
    expect(state.result).toBeNull();
    expect(state.explainResult).toBeNull();
  });

  it("sets history", () => {
    useQueryStore.getState().setHistory(mockHistory);
    expect(useQueryStore.getState().history).toHaveLength(1);
  });

  it("toggles executing state", () => {
    useQueryStore.getState().setExecuting(true);
    expect(useQueryStore.getState().executing).toBe(true);
  });

  it("toggles history panel", () => {
    useQueryStore.getState().setShowHistory(true);
    expect(useQueryStore.getState().showHistory).toBe(true);
  });
});
