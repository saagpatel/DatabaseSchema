import type { ConnectionDisplay } from "@/types/connection";
import { StatusBadge } from "@/components/common/StatusBadge";

interface ConnectionDetailProps {
  connection: ConnectionDisplay;
}

export function ConnectionDetail({ connection }: ConnectionDetailProps) {
  const fields = [
    { label: "Host", value: connection.host },
    { label: "Port", value: String(connection.port) },
    { label: "Database", value: connection.database },
    { label: "Username", value: connection.username },
    { label: "SSL Mode", value: connection.sslMode },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: connection.color }}
        />
        <h2 className="text-xl font-semibold text-text-primary">
          {connection.name}
        </h2>
        <StatusBadge connected={connection.isConnected} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-text-muted uppercase tracking-wider mb-1">
              {label}
            </dt>
            <dd className="text-sm text-text-primary font-mono">{value}</dd>
          </div>
        ))}
      </div>

      {!connection.isConnected && (
        <p className="mt-6 text-sm text-text-muted">
          Connect to this database to view its schema.
        </p>
      )}
    </div>
  );
}
