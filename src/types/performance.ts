export interface PlanNode {
  nodeType: string;
  relationName: string | null;
  schemaName: string | null;
  alias: string | null;
  startupCost: number;
  totalCost: number;
  planRows: number;
  actualRows: number | null;
  actualStartupTime: number | null;
  actualTotalTime: number | null;
  planWidth: number;
  loops: number | null;
  filter: string | null;
  joinType: string | null;
  indexName: string | null;
  indexCond: string | null;
  sortKey: string[] | null;
  output: string[] | null;
  sharedHitBlocks: number | null;
  sharedReadBlocks: number | null;
  workersPlanned: number | null;
  workersLaunched: number | null;
  children: PlanNode[];
  warnings: string[];
}

export interface TableStats {
  schemaname: string;
  relname: string;
  seqScan: number | null;
  seqTupRead: number | null;
  idxScan: number | null;
  idxTupFetch: number | null;
  nTupIns: number | null;
  nTupUpd: number | null;
  nTupDel: number | null;
  nLiveTup: number | null;
  nDeadTup: number | null;
  lastVacuum: string | null;
  lastAutovacuum: string | null;
  lastAnalyze: string | null;
  lastAutoanalyze: string | null;
}

export interface IndexStats {
  schemaname: string;
  relname: string;
  indexrelname: string;
  idxScan: number | null;
  idxTupRead: number | null;
  idxTupFetch: number | null;
  idxSize: number | null;
}
