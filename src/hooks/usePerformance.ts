import { useCallback } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import * as performanceService from "@/services/performance";

export function usePerformance() {
  const store = usePerformanceStore();

  const analyzePlan = useCallback(
    async (connectionId: string, sql: string) => {
      const s = usePerformanceStore.getState();
      s.setLoading(true);
      s.setError(null);
      try {
        const node = await performanceService.parseExplainPlan(
          connectionId,
          sql
        );
        const current = usePerformanceStore.getState();
        current.setPlanNode(node);
        current.setActiveTab("explain");
      } catch (err) {
        usePerformanceStore.getState().setError(String(err));
      } finally {
        usePerformanceStore.getState().setLoading(false);
      }
    },
    []
  );

  const loadTableStats = useCallback(
    async (connectionId: string, schemaName?: string) => {
      const s = usePerformanceStore.getState();
      s.setLoading(true);
      s.setError(null);
      try {
        const stats = await performanceService.getTableStats(
          connectionId,
          schemaName
        );
        usePerformanceStore.getState().setTableStats(stats);
      } catch (err) {
        usePerformanceStore.getState().setError(String(err));
      } finally {
        usePerformanceStore.getState().setLoading(false);
      }
    },
    []
  );

  const loadIndexStats = useCallback(
    async (connectionId: string, schemaName?: string) => {
      const s = usePerformanceStore.getState();
      s.setLoading(true);
      s.setError(null);
      try {
        const stats = await performanceService.getIndexStats(
          connectionId,
          schemaName
        );
        usePerformanceStore.getState().setIndexStats(stats);
      } catch (err) {
        usePerformanceStore.getState().setError(String(err));
      } finally {
        usePerformanceStore.getState().setLoading(false);
      }
    },
    []
  );

  return {
    planNode: store.planNode,
    tableStats: store.tableStats,
    indexStats: store.indexStats,
    loading: store.loading,
    error: store.error,
    activeTab: store.activeTab,
    setActiveTab: store.setActiveTab,
    analyzePlan,
    loadTableStats,
    loadIndexStats,
  };
}
