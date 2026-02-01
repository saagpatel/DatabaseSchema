import { create } from "zustand";
import type { ConnectionDisplay } from "@/types/connection";

interface ConnectionState {
  connections: ConnectionDisplay[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  setConnections: (connections: ConnectionDisplay[]) => void;
  setActiveId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConnection: (connection: ConnectionDisplay) => void;
  removeConnection: (id: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  activeId: null,
  loading: false,
  error: null,
  setConnections: (connections) => set({ connections }),
  setActiveId: (activeId) => set({ activeId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  updateConnection: (connection) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === connection.id ? connection : c
      ),
    })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    })),
}));
