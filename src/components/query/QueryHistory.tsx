import type { QueryHistoryEntry } from "@/types/query";

interface QueryHistoryProps {
  history: QueryHistoryEntry[];
  onSelect: (sql: string) => void;
  onClear: () => void;
}

export function QueryHistory({ history, onSelect, onClear }: QueryHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-text-muted text-sm">
        No query history yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-primary">
          History ({history.length})
        </span>
        <button
          onClick={onClear}
          className="text-xs text-danger hover:text-danger/80"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry.sqlText)}
            className="w-full text-left px-3 py-2 border-b border-border/50 hover:bg-bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  entry.status === "success" ? "bg-success" : "bg-danger"
                }`}
                role="img"
                aria-label={entry.status === "success" ? "Success" : "Error"}
              />
              <span className="text-[10px] text-text-muted">
                {entry.createdAt}
              </span>
              {entry.executionTimeMs != null && (
                <span className="text-[10px] text-text-muted">
                  {entry.executionTimeMs}ms
                </span>
              )}
              {entry.rowCount != null && entry.status === "success" && (
                <span className="text-[10px] text-text-muted">
                  {entry.rowCount} rows
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-text-secondary truncate">
              {entry.sqlText}
            </div>
            {entry.errorMessage && (
              <div className="text-[10px] text-danger mt-0.5 truncate">
                {entry.errorMessage}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
