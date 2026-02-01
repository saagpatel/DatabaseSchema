interface StatusBadgeProps {
  connected: boolean;
}

export function StatusBadge({ connected }: StatusBadgeProps) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        connected ? "bg-success" : "bg-text-muted"
      }`}
      role="img"
      aria-label={connected ? "Connected" : "Disconnected"}
      title={connected ? "Connected" : "Disconnected"}
    />
  );
}
