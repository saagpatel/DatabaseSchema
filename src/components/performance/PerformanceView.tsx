import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { PlanTree } from "./PlanTree";
import { TableStatsPanel } from "./TableStatsPanel";
import { IndexStatsPanel } from "./IndexStatsPanel";
import { usePerformance } from "@/hooks/usePerformance";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSchemaStore } from "@/stores/schemaStore";
import { useMonacoTheme } from "@/hooks/useTheme";
import { showToast } from "@/components/common/Toast";

type PerfTab = "explain" | "tables" | "indexes";

export function PerformanceView() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [sql, setSql] = useState("");

  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const activeConnection = connections.find((c) => c.id === activeId);

  const schemas = useSchemaStore((s) => s.schemas);
  const monacoTheme = useMonacoTheme();
  const [selectedSchema, setSelectedSchema] = useState("public");

  const {
    planNode,
    tableStats,
    indexStats,
    loading,
    error,
    activeTab,
    setActiveTab,
    analyzePlan,
    loadTableStats,
    loadIndexStats,
  } = usePerformance();

  // Reset SQL when connection changes
  useEffect(() => {
    setSql("");
  }, [activeId]);

  // Load stats when connection or schema changes
  useEffect(() => {
    if (activeId && activeConnection?.isConnected) {
      loadTableStats(activeId, selectedSchema);
      loadIndexStats(activeId, selectedSchema);
    }
  }, [
    activeId,
    activeConnection?.isConnected,
    selectedSchema,
    loadTableStats,
    loadIndexStats,
  ]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!activeId || !activeConnection?.isConnected) {
      showToast("error", "Not connected to a database");
      return;
    }
    const query = sql.trim();
    if (!query) {
      showToast("error", "Enter a SQL query to analyze");
      return;
    }
    analyzePlan(activeId, query);
  }, [activeId, activeConnection, sql, analyzePlan]);

  const handleRefreshStats = useCallback(() => {
    if (!activeId || !activeConnection?.isConnected) return;
    loadTableStats(activeId, selectedSchema);
    loadIndexStats(activeId, selectedSchema);
  }, [
    activeId,
    activeConnection,
    selectedSchema,
    loadTableStats,
    loadIndexStats,
  ]);

  const tabClasses = (tab: PerfTab) =>
    `px-3 py-1.5 text-xs border-b-2 ${
      activeTab === tab
        ? "border-accent text-accent"
        : "border-transparent text-text-secondary hover:text-text-primary"
    }`;

  if (!activeId || !activeConnection?.isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">Performance Analysis</p>
          <p className="text-sm">
            Connect to a database to analyze query performance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary">
        {/* Tabs */}
        <button
          onClick={() => setActiveTab("explain")}
          className={tabClasses("explain")}
        >
          EXPLAIN
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={tabClasses("tables")}
        >
          Table Stats
        </button>
        <button
          onClick={() => setActiveTab("indexes")}
          className={tabClasses("indexes")}
        >
          Index Stats
        </button>

        <div className="flex-1" />

        {/* Schema selector for stats tabs */}
        {(activeTab === "tables" || activeTab === "indexes") && (
          <>
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="px-2 py-1 text-xs bg-bg-primary border border-border rounded-md text-text-primary"
            >
              {schemas.length > 0 ? (
                schemas.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              ) : (
                <option value="public">public</option>
              )}
            </select>
            <button
              onClick={handleRefreshStats}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-border rounded-md text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
            >
              Refresh
            </button>
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "explain" && (
          <div className="flex flex-col h-full">
            {/* SQL input */}
            <div className="h-[180px] border-b border-border flex-shrink-0">
              <Editor
                language="sql"
                theme={monacoTheme}
                value={sql}
                onChange={(value) => setSql(value ?? "")}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 8 },
                }}
              />
            </div>

            {/* Analyze button */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 font-medium"
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
              <span className="text-[10px] text-text-muted">
                Runs EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
              </span>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-hidden">
              {error && (
                <div className="p-4 text-sm text-danger">
                  <p className="font-semibold mb-1">Analysis Error</p>
                  <p className="font-mono text-xs">{error}</p>
                </div>
              )}
              {planNode && <PlanTree node={planNode} />}
              {!planNode && !error && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Enter a query above and click Analyze to see the execution
                  plan.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tables" && (
          <div className="h-full overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-danger">
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Loading table statistics...
              </div>
            ) : (
              <TableStatsPanel stats={tableStats} />
            )}
          </div>
        )}

        {activeTab === "indexes" && (
          <div className="h-full overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-danger">
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Loading index statistics...
              </div>
            ) : (
              <IndexStatsPanel stats={indexStats} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
