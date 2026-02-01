import { useState } from "react";
import type { ConnectionDisplay } from "@/types/connection";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Modal } from "@/components/common/Modal";
import { ConnectionForm } from "./ConnectionForm";
import { useConnections } from "@/hooks/useConnections";
import { showToast } from "@/components/common/Toast";

export function ConnectionList() {
  const {
    connections,
    activeId,
    setActiveId,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    connectToDb,
    disconnectFromDb,
  } = useConnections();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingConn = connections.find((c) => c.id === editingId);

  const handleToggleConnect = async (conn: ConnectionDisplay) => {
    try {
      if (conn.isConnected) {
        await disconnectFromDb(conn.id);
        showToast("info", `Disconnected from ${conn.name}`);
      } else {
        await connectToDb(conn.id);
        showToast("success", `Connected to ${conn.name}`);
        setActiveId(conn.id);
      }
    } catch (e) {
      showToast("error", String(e));
    }
  };

  const handleDelete = async (conn: ConnectionDisplay) => {
    if (!window.confirm(`Delete "${conn.name}"? This cannot be undone.`)) return;
    try {
      await deleteConnection(conn.id);
      showToast("info", `Deleted ${conn.name}`);
    } catch (e) {
      showToast("error", String(e));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Connections</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs px-2.5 py-1 bg-accent text-white rounded-md hover:bg-accent-hover"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {connections.length === 0 && (
          <div className="px-4 py-8 text-center text-text-muted text-sm">
            No connections yet.
            <br />
            Click "+ Add" to get started.
          </div>
        )}

        {connections.map((conn) => (
          <div
            key={conn.id}
            onClick={() => setActiveId(conn.id)}
            className={`px-4 py-3 border-b border-border cursor-pointer hover:bg-bg-secondary transition-colors ${
              activeId === conn.id ? "bg-bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: conn.color }}
              />
              <span className="text-sm font-medium text-text-primary truncate flex-1">
                {conn.name}
              </span>
              <StatusBadge connected={conn.isConnected} />
            </div>
            <div className="text-xs text-text-muted ml-4">
              {conn.host}:{conn.port}/{conn.database}
            </div>
            <div className="flex gap-2 mt-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleConnect(conn);
                }}
                className={`text-xs px-2 py-0.5 rounded ${
                  conn.isConnected
                    ? "text-danger border border-danger hover:bg-danger/10"
                    : "text-success border border-success hover:bg-success/10"
                }`}
              >
                {conn.isConnected ? "Disconnect" : "Connect"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(conn.id);
                }}
                className="text-xs px-2 py-0.5 rounded text-text-secondary border border-border hover:bg-bg-tertiary"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conn);
                }}
                className="text-xs px-2 py-0.5 rounded text-danger border border-danger/30 hover:bg-danger/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Connection"
      >
        <ConnectionForm
          onSubmit={async (input) => {
            await createConnection(input);
            setShowCreate(false);
          }}
          onTest={testConnection}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Edit Connection"
      >
        {editingConn && (
          <ConnectionForm
            initial={editingConn}
            onSubmit={async (input) => {
              await updateConnection(editingConn.id, input);
              setEditingId(null);
            }}
            onTest={testConnection}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
