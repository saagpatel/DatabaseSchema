import { describe, it, expect, beforeEach } from "vitest";
import { useConnectionStore } from "./connectionStore";
import type { ConnectionDisplay } from "@/types/connection";

const mockConnection: ConnectionDisplay = {
  id: "test-id-1",
  name: "Test DB",
  host: "localhost",
  port: 5432,
  database: "testdb",
  username: "postgres",
  sslMode: "prefer",
  color: "#3b82f6",
  isConnected: false,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

describe("connectionStore", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      connections: [],
      activeId: null,
      loading: false,
      error: null,
    });
  });

  it("sets connections", () => {
    useConnectionStore.getState().setConnections([mockConnection]);
    expect(useConnectionStore.getState().connections).toHaveLength(1);
    expect(useConnectionStore.getState().connections[0]?.name).toBe("Test DB");
  });

  it("sets active id", () => {
    useConnectionStore.getState().setActiveId("test-id-1");
    expect(useConnectionStore.getState().activeId).toBe("test-id-1");
  });

  it("updates a connection", () => {
    useConnectionStore.getState().setConnections([mockConnection]);
    useConnectionStore.getState().updateConnection({
      ...mockConnection,
      isConnected: true,
    });
    expect(useConnectionStore.getState().connections[0]?.isConnected).toBe(true);
  });

  it("removes a connection", () => {
    useConnectionStore.getState().setConnections([mockConnection]);
    useConnectionStore.getState().setActiveId("test-id-1");
    useConnectionStore.getState().removeConnection("test-id-1");
    expect(useConnectionStore.getState().connections).toHaveLength(0);
    expect(useConnectionStore.getState().activeId).toBeNull();
  });

  it("sets loading state", () => {
    useConnectionStore.getState().setLoading(true);
    expect(useConnectionStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    useConnectionStore.getState().setError("Something went wrong");
    expect(useConnectionStore.getState().error).toBe("Something went wrong");
  });

  it("getState always returns fresh state", () => {
    // This verifies the pattern used in hooks (getState() avoids stale closures)
    const staleRef = useConnectionStore.getState();
    useConnectionStore.getState().setConnections([mockConnection]);

    // staleRef is now stale — it doesn't reflect the new connections
    // But getState() always returns current state
    expect(useConnectionStore.getState().connections).toHaveLength(1);
    expect(staleRef.connections).toHaveLength(0); // stale
  });

  it("removeConnection preserves other connections activeId", () => {
    const conn2: ConnectionDisplay = {
      ...mockConnection,
      id: "test-id-2",
      name: "Other DB",
    };
    useConnectionStore.getState().setConnections([mockConnection, conn2]);
    useConnectionStore.getState().setActiveId("test-id-2");
    useConnectionStore.getState().removeConnection("test-id-1");
    expect(useConnectionStore.getState().connections).toHaveLength(1);
    expect(useConnectionStore.getState().activeId).toBe("test-id-2");
  });
});
