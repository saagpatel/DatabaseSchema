import { invoke } from "@tauri-apps/api/core";
import type { SchemaInfo } from "@/types/schema";

export async function listSchemas(connectionId: string): Promise<string[]> {
  return invoke("list_schemas", { connectionId });
}

export async function introspectSchema(
  connectionId: string,
  schemaName: string
): Promise<SchemaInfo> {
  return invoke("introspect_schema", { connectionId, schemaName });
}

export async function getCachedSchema(
  connectionId: string,
  schemaName: string
): Promise<SchemaInfo | null> {
  return invoke("get_cached_schema", { connectionId, schemaName });
}

export async function clearSchemaCache(connectionId: string): Promise<void> {
  return invoke("clear_schema_cache", { connectionId });
}
