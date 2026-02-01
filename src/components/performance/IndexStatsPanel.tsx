import type { IndexStats } from "@/types/performance";

interface IndexStatsPanelProps {
  stats: IndexStats[];
}

function formatNumber(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString();
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function IndexStatsPanel({ stats }: IndexStatsPanelProps) {
  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No index statistics available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 py-1.5 border-b border-border bg-bg-secondary text-xs text-text-muted">
        <span>
          {stats.length} index{stats.length !== 1 ? "es" : ""} in{" "}
          {stats[0]?.schemaname}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Table
              </th>
              <th className="px-3 py-1.5 text-left font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Index
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Scans
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Tuples Read
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Tuples Fetched
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Size
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((idx) => {
              const unused =
                idx.idxScan !== null && idx.idxScan === 0 && (idx.idxSize ?? 0) > 0;
              return (
                <tr
                  key={`${idx.schemaname}.${idx.relname}.${idx.indexrelname}`}
                  className="hover:bg-bg-secondary"
                >
                  <td className="px-3 py-1.5 border-b border-border/50 text-text-secondary">
                    {idx.relname}
                  </td>
                  <td
                    className={`px-3 py-1.5 border-b border-border/50 font-medium ${
                      unused ? "text-warning" : "text-text-primary"
                    }`}
                  >
                    {idx.indexrelname}
                    {unused && (
                      <span
                        className="ml-1 text-warning"
                        title="Unused index — consider dropping"
                      >
                        !
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(idx.idxScan)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(idx.idxTupRead)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(idx.idxTupFetch)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatSize(idx.idxSize)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
