import { useCallback } from "react";
import { useQueryStore } from "@/stores/queryStore";
import * as queryService from "@/services/query";

export function useQuery() {
  const store = useQueryStore();

  const executeQuery = useCallback(
    async (connectionId: string, sql: string, limit?: number) => {
      const s = useQueryStore.getState();
      s.setExecuting(true);
      s.setError(null);
      try {
        const result = await queryService.executeQuery(connectionId, sql, limit);
        useQueryStore.getState().setResult(result);
      } catch (e) {
        useQueryStore.getState().setError(String(e));
      } finally {
        useQueryStore.getState().setExecuting(false);
      }
    },
    []
  );

  const explainQuery = useCallback(
    async (connectionId: string, sql: string) => {
      const s = useQueryStore.getState();
      s.setExecuting(true);
      s.setError(null);
      try {
        const result = await queryService.explainQuery(connectionId, sql);
        useQueryStore.getState().setExplainResult(result);
      } catch (e) {
        useQueryStore.getState().setError(String(e));
      } finally {
        useQueryStore.getState().setExecuting(false);
      }
    },
    []
  );

  const loadHistory = useCallback(
    async (connectionId: string) => {
      try {
        const history = await queryService.getQueryHistory(connectionId);
        useQueryStore.getState().setHistory(history);
      } catch (e) {
        console.error("Failed to load query history:", e);
      }
    },
    []
  );

  const clearHistory = useCallback(
    async (connectionId: string) => {
      try {
        await queryService.clearQueryHistory(connectionId);
        useQueryStore.getState().setHistory([]);
      } catch (e) {
        console.error("Failed to clear query history:", e);
      }
    },
    []
  );

  return {
    ...store,
    executeQuery,
    explainQuery,
    loadHistory,
    clearHistory,
  };
}
