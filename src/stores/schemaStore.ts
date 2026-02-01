import { create } from "zustand";
import type { SchemaInfo } from "@/types/schema";

interface SchemaState {
  schemas: string[];
  selectedSchema: string | null;
  schemaInfo: SchemaInfo | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSchemas: (schemas: string[]) => void;
  setSelectedSchema: (schema: string | null) => void;
  setSchemaInfo: (info: SchemaInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useSchemaStore = create<SchemaState>((set) => ({
  schemas: [],
  selectedSchema: null,
  schemaInfo: null,
  loading: false,
  error: null,
  searchQuery: "",
  setSchemas: (schemas) => set({ schemas }),
  setSelectedSchema: (selectedSchema) => set({ selectedSchema }),
  setSchemaInfo: (schemaInfo) => set({ schemaInfo }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
