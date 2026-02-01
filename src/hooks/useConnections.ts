import { useCallback } from "react";
import { useConnectionStore } from "@/stores/connectionStore";
import * as connectionService from "@/services/connections";
import type { ConnectionInput } from "@/types/connection";

export function useConnections() {
  const store = useConnectionStore();

  const loadConnections = useCallback(async () => {
    const s = useConnectionStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const connections = await connectionService.listConnections();
      useConnectionStore.getState().setConnections(connections);
    } catch (e) {
      useConnectionStore.getState().setError(String(e));
    } finally {
      useConnectionStore.getState().setLoading(false);
    }
  }, []);

  const createConnection = useCallback(
    async (input: ConnectionInput) => {
      useConnectionStore.getState().setError(null);
      try {
        await connectionService.createConnection(input);
        await loadConnections();
      } catch (e) {
        useConnectionStore.getState().setError(String(e));
        throw e;
      }
    },
    [loadConnections]
  );

  const updateConnection = useCallback(
    async (id: string, input: ConnectionInput) => {
      useConnectionStore.getState().setError(null);
      try {
        const updated = await connectionService.updateConnection(id, input);
        useConnectionStore.getState().updateConnection(updated);
      } catch (e) {
        useConnectionStore.getState().setError(String(e));
        throw e;
      }
    },
    []
  );

  const deleteConnection = useCallback(
    async (id: string) => {
      useConnectionStore.getState().setError(null);
      try {
        await connectionService.deleteConnection(id);
        useConnectionStore.getState().removeConnection(id);
      } catch (e) {
        useConnectionStore.getState().setError(String(e));
        throw e;
      }
    },
    []
  );

  const testConnection = useCallback(
    async (input: ConnectionInput): Promise<string> => {
      return connectionService.testConnection(input);
    },
    []
  );

  const connectToDb = useCallback(
    async (id: string) => {
      useConnectionStore.getState().setError(null);
      try {
        await connectionService.connect(id);
        await loadConnections();
      } catch (e) {
        useConnectionStore.getState().setError(String(e));
        throw e;
      }
    },
    [loadConnections]
  );

  const disconnectFromDb = useCallback(
    async (id: string) => {
      useConnectionStore.getState().setError(null);
      try {
        await connectionService.disconnect(id);
        await loadConnections();
      } catch (e) {
        useConnectionStore.getState().setError(String(e));
        throw e;
      }
    },
    [loadConnections]
  );

  return {
    ...store,
    loadConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    connectToDb,
    disconnectFromDb,
  };
}
