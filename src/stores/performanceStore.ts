import { create } from "zustand";
import type { PlanNode, TableStats, IndexStats } from "@/types/performance";

type PerfTab = "explain" | "tables" | "indexes";

interface PerformanceState {
  planNode: PlanNode | null;
  tableStats: TableStats[];
  indexStats: IndexStats[];
  loading: boolean;
  error: string | null;
  activeTab: PerfTab;
  setPlanNode: (node: PlanNode | null) => void;
  setTableStats: (stats: TableStats[]) => void;
  setIndexStats: (stats: IndexStats[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: PerfTab) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  planNode: null,
  tableStats: [],
  indexStats: [],
  loading: false,
  error: null,
  activeTab: "tables",
  setPlanNode: (planNode) => set({ planNode, error: null }),
  setTableStats: (tableStats) => set({ tableStats }),
  setIndexStats: (indexStats) => set({ indexStats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
