import { useCallback } from "react";
import { useSchemaStore } from "@/stores/schemaStore";
import { useConnectionStore } from "@/stores/connectionStore";
import * as schemaService from "@/services/schema";

export function useSchema() {
  const store = useSchemaStore();

  const loadSchemas = useCallback(async (connectionId: string) => {
    const s = useSchemaStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const schemas = await schemaService.listSchemas(connectionId);
      const current = useSchemaStore.getState();
      current.setSchemas(schemas);
      if (schemas.includes("public") && !current.selectedSchema) {
        current.setSelectedSchema("public");
      }
    } catch (e) {
      useSchemaStore.getState().setError(String(e));
    } finally {
      useSchemaStore.getState().setLoading(false);
    }
  }, []);

  const loadSchema = useCallback(async (connectionId: string, schemaName: string) => {
    const s = useSchemaStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const cached = await schemaService.getCachedSchema(connectionId, schemaName);
      if (cached) {
        useSchemaStore.getState().setSchemaInfo(cached);
        useSchemaStore.getState().setLoading(false);
        // Refresh in background — only update if still viewing same connection
        schemaService
          .introspectSchema(connectionId, schemaName)
          .then((fresh) => {
            if (useConnectionStore.getState().activeId === connectionId) {
              useSchemaStore.getState().setSchemaInfo(fresh);
            }
          })
          .catch(() => {});
        return;
      }
      const info = await schemaService.introspectSchema(connectionId, schemaName);
      useSchemaStore.getState().setSchemaInfo(info);
    } catch (e) {
      useSchemaStore.getState().setError(String(e));
    } finally {
      useSchemaStore.getState().setLoading(false);
    }
  }, []);

  const ensureSchemaReady = useCallback(
    async (connectionId: string, preferredSchema?: string) => {
      const before = useSchemaStore.getState();
      if (before.schemas.length === 0) {
        await loadSchemas(connectionId);
      }

      const state = useSchemaStore.getState();
      const schemaToLoad =
        preferredSchema ??
        state.selectedSchema ??
        (state.schemas.includes("public") ? "public" : state.schemas[0]);

      if (!schemaToLoad) return;

      if (state.selectedSchema !== schemaToLoad) {
        state.setSelectedSchema(schemaToLoad);
      }

      await loadSchema(connectionId, schemaToLoad);
    },
    [loadSchemas, loadSchema]
  );

  const refreshSchema = useCallback(async (connectionId: string, schemaName: string) => {
    const s = useSchemaStore.getState();
    s.setLoading(true);
    s.setError(null);
    try {
      const info = await schemaService.introspectSchema(connectionId, schemaName);
      useSchemaStore.getState().setSchemaInfo(info);
    } catch (e) {
      useSchemaStore.getState().setError(String(e));
    } finally {
      useSchemaStore.getState().setLoading(false);
    }
  }, []);

  return {
    ...store,
    loadSchemas,
    loadSchema,
    ensureSchemaReady,
    refreshSchema,
  };
}
