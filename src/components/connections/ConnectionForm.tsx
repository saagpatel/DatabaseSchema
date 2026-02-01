import { useState } from "react";
import type { ConnectionInput, ConnectionDisplay } from "@/types/connection";
import { showToast } from "@/components/common/Toast";

interface ConnectionFormProps {
  initial?: ConnectionDisplay;
  onSubmit: (input: ConnectionInput) => Promise<void>;
  onTest: (input: ConnectionInput) => Promise<string>;
  onCancel: () => void;
}

const SSL_MODES = ["disable", "prefer", "require", "verify-ca", "verify-full"];
const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function ConnectionForm({
  initial,
  onSubmit,
  onTest,
  onCancel,
}: ConnectionFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [host, setHost] = useState(initial?.host ?? "localhost");
  const [port, setPort] = useState(initial?.port ?? 5432);
  const [database, setDatabase] = useState(initial?.database ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [sslMode, setSslMode] = useState(initial?.sslMode ?? "prefer");
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [testing, setTesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buildInput = (): ConnectionInput => ({
    name,
    host,
    port,
    database,
    username,
    password,
    sslMode,
    color,
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const version = await onTest(buildInput());
      showToast("success", `Connected! ${version}`);
    } catch (e) {
      showToast("error", `Connection failed: ${String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(buildInput());
      showToast("success", initial ? "Connection updated" : "Connection created");
    } catch (e) {
      showToast("error", String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent";
  const labelClass = "block text-sm font-medium text-text-secondary mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Connection Name</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Database"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={labelClass}>Host</label>
          <input
            className={inputClass}
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="localhost"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input
            type="number"
            className={inputClass}
            value={port}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPort(Number.isNaN(n) ? 5432 : n);
            }}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Database</label>
        <input
          className={inputClass}
          value={database}
          onChange={(e) => setDatabase(e.target.value)}
          placeholder="postgres"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Username</label>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="postgres"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={initial ? "(unchanged)" : ""}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>SSL Mode</label>
        <select
          className={inputClass}
          value={sslMode}
          onChange={(e) => setSslMode(e.target.value)}
        >
          {SSL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Color</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}${color === c ? " (selected)" : ""}`}
              className={`w-7 h-7 rounded-full border-2 ${
                color === c ? "border-text-primary scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-border rounded-lg text-text-secondary hover:bg-bg-tertiary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? "Saving..." : initial ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
