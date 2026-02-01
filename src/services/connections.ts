import { invoke } from "@tauri-apps/api/core";
import type { ConnectionDisplay, ConnectionInput } from "@/types/connection";

export async function listConnections(): Promise<ConnectionDisplay[]> {
  return invoke("list_connections");
}

export async function createConnection(
  input: ConnectionInput
): Promise<ConnectionDisplay> {
  return invoke("create_connection", { input });
}

export async function updateConnection(
  id: string,
  input: ConnectionInput
): Promise<ConnectionDisplay> {
  return invoke("update_connection", { id, input });
}

export async function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

export async function testConnection(
  input: ConnectionInput
): Promise<string> {
  return invoke("test_connection", { input });
}

export async function connect(id: string): Promise<void> {
  return invoke("connect", { id });
}

export async function disconnect(id: string): Promise<void> {
  return invoke("disconnect", { id });
}
