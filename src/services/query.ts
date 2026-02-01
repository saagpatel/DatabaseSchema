import { invoke } from "@tauri-apps/api/core";
import type { QueryResult, ExplainResult, QueryHistoryEntry } from "@/types/query";

export async function executeQuery(
  connectionId: string,
  sql: string,
  limit?: number
): Promise<QueryResult> {
  return invoke("execute_query", { connectionId, sql, limit });
}

export async function explainQuery(
  connectionId: string,
  sql: string
): Promise<ExplainResult> {
  return invoke("explain_query", { connectionId, sql });
}

export async function getQueryHistory(
  connectionId: string,
  limit?: number
): Promise<QueryHistoryEntry[]> {
  return invoke("get_query_history", { connectionId, limit });
}

export async function clearQueryHistory(connectionId: string): Promise<void> {
  return invoke("clear_query_history", { connectionId });
}
