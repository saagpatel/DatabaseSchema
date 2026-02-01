import type { TableStats } from "@/types/performance";

interface TableStatsPanelProps {
  stats: TableStats[];
}

function formatNumber(n: number | null): string {
  if (n === null) return "-";
  return n.toLocaleString();
}

function deadTupRatio(live: number | null, dead: number | null): number | null {
  if (live === null || dead === null || live === 0) return null;
  return dead / (live + dead);
}

export function TableStatsPanel({ stats }: TableStatsPanelProps) {
  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        No table statistics available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 py-1.5 border-b border-border bg-bg-secondary text-xs text-text-muted">
        <span>
          {stats.length} table{stats.length !== 1 ? "s" : ""} in{" "}
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
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Seq Scans
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Idx Scans
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Live Rows
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Dead Rows
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Inserts
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Updates
              </th>
              <th className="px-3 py-1.5 text-right font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Deletes
              </th>
              <th className="px-3 py-1.5 text-left font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Last Vacuum
              </th>
              <th className="px-3 py-1.5 text-left font-semibold text-text-muted bg-bg-tertiary border-b border-border">
                Last Analyze
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.map((t) => {
              const ratio = deadTupRatio(t.nLiveTup, t.nDeadTup);
              const needsVacuum = ratio !== null && ratio > 0.1;
              const seqHeavy =
                t.seqScan !== null &&
                t.idxScan !== null &&
                t.seqScan > t.idxScan * 2 &&
                t.seqScan > 100;

              return (
                <tr
                  key={`${t.schemaname}.${t.relname}`}
                  className="hover:bg-bg-secondary"
                >
                  <td className="px-3 py-1.5 border-b border-border/50 font-medium text-text-primary">
                    {t.relname}
                  </td>
                  <td
                    className={`px-3 py-1.5 border-b border-border/50 text-right font-mono ${
                      seqHeavy ? "text-warning" : "text-text-secondary"
                    }`}
                  >
                    {formatNumber(t.seqScan)}
                    {seqHeavy && (
                      <span className="ml-1" title="High sequential scan ratio">
                        !
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(t.idxScan)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(t.nLiveTup)}
                  </td>
                  <td
                    className={`px-3 py-1.5 border-b border-border/50 text-right font-mono ${
                      needsVacuum ? "text-danger" : "text-text-secondary"
                    }`}
                  >
                    {formatNumber(t.nDeadTup)}
                    {needsVacuum && (
                      <span
                        className="ml-1"
                        title={`${((ratio ?? 0) * 100).toFixed(1)}% dead tuples — needs VACUUM`}
                      >
                        !
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(t.nTupIns)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(t.nTupUpd)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-right font-mono text-text-secondary">
                    {formatNumber(t.nTupDel)}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-text-muted whitespace-nowrap">
                    {t.lastVacuum ?? t.lastAutovacuum ?? "-"}
                  </td>
                  <td className="px-3 py-1.5 border-b border-border/50 text-text-muted whitespace-nowrap">
                    {t.lastAnalyze ?? t.lastAutoanalyze ?? "-"}
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
