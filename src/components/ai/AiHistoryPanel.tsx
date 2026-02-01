import type { AiSuggestion } from "@/types/ai";

interface AiHistoryPanelProps {
  history: AiSuggestion[];
  onSelect: (suggestion: AiSuggestion) => void;
  onClear: () => void;
}

function typeLabel(t: string): string {
  switch (t) {
    case "query_optimization":
      return "Query Opt.";
    case "index_suggestion":
      return "Index Sug.";
    case "schema_review":
      return "Schema Rev.";
    default:
      return "General";
  }
}

export function AiHistoryPanel({ history, onSelect, onClear }: AiHistoryPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-secondary">
          Suggestion History
        </span>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-text-muted hover:text-danger"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="p-3 text-xs text-text-muted">No history yet.</div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 border-b border-border/50 hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
                  {typeLabel(item.suggestionType)}
                </span>
                {item.accepted && (
                  <span className="text-[10px] text-green-500">accepted</span>
                )}
              </div>
              <p className="text-xs text-text-secondary truncate">
                {item.inputContext.slice(0, 80)}
                {item.inputContext.length > 80 ? "..." : ""}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {item.createdAt}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
