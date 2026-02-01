import type { OllamaStatus } from "@/types/ai";

interface OllamaStatusBadgeProps {
  status: OllamaStatus | null;
  onRefresh: () => void;
}

export function OllamaStatusBadge({ status, onRefresh }: OllamaStatusBadgeProps) {
  if (!status) {
    return (
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-primary"
      >
        <span className="w-2 h-2 rounded-full bg-text-muted" />
        Checking Ollama...
      </button>
    );
  }

  return (
    <button
      onClick={onRefresh}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted hover:text-text-primary"
      title={
        status.available
          ? `Connected to ${status.endpoint} (${status.models.length} models)`
          : status.error ?? "Ollama not available"
      }
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status.available ? "bg-success" : "bg-danger"
        }`}
      />
      {status.available
        ? `Ollama (${status.models.length} model${status.models.length !== 1 ? "s" : ""})`
        : "Ollama offline"}
    </button>
  );
}
