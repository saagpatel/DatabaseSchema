import { describe, it, expect, beforeEach } from "vitest";
import { usePerformanceStore } from "./performanceStore";
import type { PlanNode, TableStats, IndexStats } from "@/types/performance";

const mockPlanNode: PlanNode = {
  nodeType: "Seq Scan",
  relationName: "users",
  schemaName: "public",
  alias: null,
  startupCost: 0,
  totalCost: 25.5,
  planRows: 1000,
  actualRows: 1000,
  actualStartupTime: 0,
  actualTotalTime: 1.5,
  planWidth: 64,
  loops: 1,
  filter: "(active = true)",
  joinType: null,
  indexName: null,
  indexCond: null,
  sortKey: null,
  output: null,
  sharedHitBlocks: 10,
  sharedReadBlocks: 0,
  workersPlanned: null,
  workersLaunched: null,
  children: [],
  warnings: [],
};

const mockTableStats: TableStats[] = [
  {
    schemaname: "public",
    relname: "users",
    seqScan: 100,
    seqTupRead: 50000,
    idxScan: 5000,
    idxTupFetch: 4500,
    nTupIns: 1000,
    nTupUpd: 500,
    nTupDel: 50,
    nLiveTup: 950,
    nDeadTup: 10,
    lastVacuum: null,
    lastAutovacuum: "2024-01-01 00:00:00",
    lastAnalyze: null,
    lastAutoanalyze: "2024-01-01 00:00:00",
  },
];

const mockIndexStats: IndexStats[] = [
  {
    schemaname: "public",
    relname: "users",
    indexrelname: "users_pkey",
    idxScan: 5000,
    idxTupRead: 5000,
    idxTupFetch: 4500,
    idxSize: 8192,
  },
];

describe("performanceStore", () => {
  beforeEach(() => {
    usePerformanceStore.setState({
      planNode: null,
      tableStats: [],
      indexStats: [],
      loading: false,
      error: null,
      activeTab: "tables",
    });
  });

  it("sets plan node and clears error", () => {
    usePerformanceStore.getState().setError("old error");
    usePerformanceStore.getState().setPlanNode(mockPlanNode);
    const state = usePerformanceStore.getState();
    expect(state.planNode?.nodeType).toBe("Seq Scan");
    expect(state.error).toBeNull();
  });

  it("sets table stats", () => {
    usePerformanceStore.getState().setTableStats(mockTableStats);
    expect(usePerformanceStore.getState().tableStats).toHaveLength(1);
    expect(usePerformanceStore.getState().tableStats[0]?.relname).toBe("users");
  });

  it("sets index stats", () => {
    usePerformanceStore.getState().setIndexStats(mockIndexStats);
    expect(usePerformanceStore.getState().indexStats).toHaveLength(1);
    expect(usePerformanceStore.getState().indexStats[0]?.indexrelname).toBe(
      "users_pkey"
    );
  });

  it("sets loading state", () => {
    usePerformanceStore.getState().setLoading(true);
    expect(usePerformanceStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    usePerformanceStore.getState().setError("Query failed");
    expect(usePerformanceStore.getState().error).toBe("Query failed");
  });

  it("sets active tab", () => {
    usePerformanceStore.getState().setActiveTab("explain");
    expect(usePerformanceStore.getState().activeTab).toBe("explain");
  });
});
