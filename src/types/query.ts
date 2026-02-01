export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface ExplainResult {
  plan: unknown;
  executionTimeMs: number;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  sqlText: string;
  executionTimeMs: number | null;
  rowCount: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}
