import { useState } from "react";
import type { PlanNode } from "@/types/performance";

interface PlanTreeProps {
  node: PlanNode;
  maxCost: number;
  depth?: number;
}

function costColor(ratio: number): string {
  if (ratio > 0.8) return "text-danger";
  if (ratio > 0.5) return "text-warning";
  if (ratio > 0.2) return "text-accent";
  return "text-text-secondary";
}

function formatTime(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatRows(n: number | null): string {
  if (n === null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function PlanNodeRow({ node, maxCost, depth = 0 }: PlanTreeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const costRatio = maxCost > 0 ? node.totalCost / maxCost : 0;
  const hasWarnings = node.warnings.length > 0;

  return (
    <div>
      <div
        className={`flex items-start gap-2 py-1.5 px-2 hover:bg-bg-secondary rounded text-xs ${
          hasWarnings ? "bg-warning/5" : ""
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-4 h-4 flex items-center justify-center text-text-muted flex-shrink-0 mt-0.5"
        >
          {hasChildren ? (expanded ? "\u25BC" : "\u25B6") : "\u00B7"}
        </button>

        {/* Node info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">
              {node.nodeType}
            </span>
            {node.relationName && (
              <span className="text-accent">
                on {node.schemaName ? `${node.schemaName}.` : ""}
                {node.relationName}
                {node.alias && node.alias !== node.relationName
                  ? ` (${node.alias})`
                  : ""}
              </span>
            )}
            {node.joinType && (
              <span className="text-text-muted">[{node.joinType}]</span>
            )}
            {node.indexName && (
              <span className="text-text-muted">
                using {node.indexName}
              </span>
            )}
          </div>

          {/* Details row */}
          <div className="flex gap-3 mt-0.5 text-text-muted">
            <span className={costColor(costRatio)}>
              cost: {node.totalCost.toFixed(1)}
            </span>
            <span>
              rows: {formatRows(node.planRows)}
              {node.actualRows !== null && (
                <span className="text-text-muted">
                  {" "}
                  (actual: {formatRows(node.actualRows)})
                </span>
              )}
            </span>
            {node.actualTotalTime !== null && (
              <span>time: {formatTime(node.actualTotalTime)}</span>
            )}
            {node.loops !== null && node.loops > 1 && (
              <span>loops: {node.loops}</span>
            )}
            {node.sharedHitBlocks !== null && (
              <span>
                buffers: {node.sharedHitBlocks} hit
                {node.sharedReadBlocks
                  ? ` / ${node.sharedReadBlocks} read`
                  : ""}
              </span>
            )}
          </div>

          {/* Filter / conditions */}
          {node.filter && (
            <div className="mt-0.5 text-text-muted font-mono truncate">
              Filter: {node.filter}
            </div>
          )}
          {node.indexCond && (
            <div className="mt-0.5 text-text-muted font-mono truncate">
              Index Cond: {node.indexCond}
            </div>
          )}
          {node.sortKey && (
            <div className="mt-0.5 text-text-muted font-mono truncate">
              Sort Key: {node.sortKey.join(", ")}
            </div>
          )}

          {/* Warnings */}
          {hasWarnings &&
            node.warnings.map((w, i) => (
              <div
                key={i}
                className="mt-1 text-warning text-[11px] flex items-start gap-1"
              >
                <span className="flex-shrink-0">!</span>
                <span>{w}</span>
              </div>
            ))}
        </div>

        {/* Cost bar */}
        <div className="w-16 flex-shrink-0 mt-1">
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                costRatio > 0.8
                  ? "bg-danger"
                  : costRatio > 0.5
                    ? "bg-warning"
                    : costRatio > 0.2
                      ? "bg-accent"
                      : "bg-text-muted"
              }`}
              style={{ width: `${Math.max(costRatio * 100, 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        hasChildren &&
        node.children.map((child, i) => (
          <PlanNodeRow
            key={i}
            node={child}
            maxCost={maxCost}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

function getMaxCost(node: PlanNode): number {
  let max = node.totalCost;
  for (const child of node.children) {
    max = Math.max(max, getMaxCost(child));
  }
  return max;
}

function countWarnings(node: PlanNode): number {
  let count = node.warnings.length;
  for (const child of node.children) {
    count += countWarnings(child);
  }
  return count;
}

export function PlanTree({ node }: { node: PlanNode }) {
  const maxCost = getMaxCost(node);
  const totalWarnings = countWarnings(node);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-secondary text-xs text-text-muted">
        <span>EXPLAIN ANALYZE + BUFFERS</span>
        <div className="flex gap-3">
          {totalWarnings > 0 && (
            <span className="text-warning">
              {totalWarnings} warning{totalWarnings !== 1 ? "s" : ""}
            </span>
          )}
          <span>Root cost: {node.totalCost.toFixed(1)}</span>
          {node.actualTotalTime !== null && (
            <span>Total: {formatTime(node.actualTotalTime)}</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <PlanNodeRow node={node} maxCost={maxCost} />
      </div>
    </div>
  );
}
