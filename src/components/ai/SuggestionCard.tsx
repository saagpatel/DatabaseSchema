import { useState, useMemo } from "react";
import type { AiSuggestion } from "@/types/ai";

interface SuggestionCardProps {
  suggestion: AiSuggestion;
  onAccept: (id: string) => void;
  onCopyToQuery?: (sql: string) => void;
}

function typeLabel(t: string): string {
  switch (t) {
    case "query_optimization":
      return "Query Optimization";
    case "index_suggestion":
      return "Index Suggestion";
    case "schema_review":
      return "Schema Review";
    default:
      return "General";
  }
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onCopyToQuery,
}: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Extract SQL blocks from the suggestion text (memoized to avoid regex on every render)
  const sqlBlocks = useMemo(() => {
    const blocks: string[] = [];
    const sqlRegex = /```sql\n([\s\S]*?)```/g;
    let match;
    while ((match = sqlRegex.exec(suggestion.suggestion)) !== null) {
      if (match[1]) {
        blocks.push(match[1].trim());
      }
    }
    return blocks;
  }, [suggestion.suggestion]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
            {typeLabel(suggestion.suggestionType)}
          </span>
          <span className="text-[10px] text-text-muted">
            {suggestion.createdAt}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <>
          {/* Context (what was asked) */}
          <div className="px-3 py-2 bg-bg-tertiary/50 border-b border-border/50">
            <p className="text-[10px] text-text-muted mb-0.5">Input</p>
            <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-words">
              {suggestion.inputContext.length > 300
                ? suggestion.inputContext.slice(0, 300) + "..."
                : suggestion.inputContext}
            </p>
          </div>

          {/* Suggestion content */}
          <div className="px-3 py-3">
            <p className="text-xs text-text-primary whitespace-pre-wrap break-words leading-relaxed">
              {suggestion.suggestion}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-bg-secondary">
            {!suggestion.accepted && (
              <button
                onClick={() => onAccept(suggestion.id)}
                className="px-2 py-1 text-[11px] bg-success text-white rounded hover:opacity-90"
              >
                Accept
              </button>
            )}
            {suggestion.accepted && (
              <span className="text-[11px] text-success">Accepted</span>
            )}
            {sqlBlocks.length > 0 && onCopyToQuery && (
              <button
                onClick={() => onCopyToQuery(sqlBlocks.join("\n\n"))}
                className="px-2 py-1 text-[11px] border border-border rounded text-text-secondary hover:bg-bg-tertiary"
              >
                Copy SQL to Query
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
