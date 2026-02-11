import { useRef, useCallback, useState, useEffect } from "react";
import type { QueryResult } from "@/types/query";

interface ResultsTableProps {
  result: QueryResult;
}

const ROW_HEIGHT = 32;
const OVERSCAN = 5;

export function ResultsTable({ result }: ResultsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setContainerHeight(entry.contentRect.height);
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(result.rows.length, startIdx + visibleCount);
  const visibleRows = result.rows.slice(startIdx, endIdx);
  const offsetY = startIdx * ROW_HEIGHT;

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-secondary text-xs text-text-muted">
        <span>
          {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
        </span>
        <span>{result.executionTimeMs}ms</span>
      </div>

      {/* Table */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="px-3 py-1.5 text-left text-xs font-semibold text-text-muted bg-bg-tertiary border-b border-border w-10">
                #
              </th>
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left text-xs font-semibold text-text-muted bg-bg-tertiary border-b border-border whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Spacer for virtual scroll */}
            {offsetY > 0 && (
              <tr style={{ height: offsetY }}>
                <td colSpan={result.columns.length + 1} />
              </tr>
            )}
            {visibleRows.map((row, i) => {
              const rowIdx = startIdx + i;
              return (
                <tr
                  key={rowIdx}
                  className="hover:bg-bg-secondary"
                  style={{ height: ROW_HEIGHT }}
                >
                  <td className="px-3 py-1 text-text-muted text-xs border-b border-border/50">
                    {rowIdx + 1}
                  </td>
                  {result.columns.map((col) => {
                    const val = row[col];
                    const isNull = val === null || val === undefined;
                    return (
                      <td
                        key={col}
                        className={`px-3 py-1 border-b border-border/50 font-mono text-xs whitespace-nowrap max-w-xs truncate ${
                          isNull ? "text-text-muted italic" : "text-text-primary"
                        }`}
                        title={formatValue(val)}
                      >
                        {formatValue(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Bottom spacer */}
            {endIdx < result.rows.length && (
              <tr
                style={{
                  height: (result.rows.length - endIdx) * ROW_HEIGHT,
                }}
              >
                <td colSpan={result.columns.length + 1} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
