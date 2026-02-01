import { invoke } from "@tauri-apps/api/core";
import type { PlanNode, TableStats, IndexStats } from "@/types/performance";

export async function parseExplainPlan(
  connectionId: string,
  sql: string
): Promise<PlanNode> {
  return invoke("parse_explain_plan", { connectionId, sql });
}

export async function getTableStats(
  connectionId: string,
  schemaName?: string
): Promise<TableStats[]> {
  return invoke("get_table_stats", { connectionId, schemaName });
}

export async function getIndexStats(
  connectionId: string,
  schemaName?: string
): Promise<IndexStats[]> {
  return invoke("get_index_stats", { connectionId, schemaName });
}
