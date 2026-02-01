import type { ExplainResult } from "@/types/query";

interface ExplainViewProps {
  result: ExplainResult;
}

export function ExplainView({ result }: ExplainViewProps) {
  const plan = result.plan;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-secondary text-xs text-text-muted">
        <span>EXPLAIN ANALYZE</span>
        <span>{result.executionTimeMs}ms</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap">
          {JSON.stringify(plan, null, 2)}
        </pre>
      </div>
    </div>
  );
}
