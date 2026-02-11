import { useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor, languages, IRange } from "monaco-editor";

import { ResultsTable } from "./ResultsTable";
import { ExplainView } from "./ExplainView";
import { QueryHistory } from "./QueryHistory";
import { useQuery } from "@/hooks/useQuery";
import { useQueryStore } from "@/stores/queryStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSchemaStore } from "@/stores/schemaStore";
import { useSchema } from "@/hooks/useSchema";
import { useMonacoTheme } from "@/hooks/useTheme";
import { showToast } from "@/components/common/Toast";

export function QueryView() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const {
    sql,
    result,
    explainResult,
    history,
    executing,
    error,
    showHistory,
    setSql,
    setShowHistory,
    executeQuery,
    explainQuery,
    loadHistory,
    clearHistory,
  } = useQuery();

  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const activeConnection = connections.find((c) => c.id === activeId);

  const settings = useSettingsStore((s) => s.settings);
  const schemaInfo = useSchemaStore((s) => s.schemaInfo);
  const { selectedSchema, ensureSchemaReady } = useSchema();
  const monacoTheme = useMonacoTheme();

  const fontSize = settings?.editorFontSize
    ? parseInt(settings.editorFontSize, 10)
    : 14;
  const tabSize = settings?.editorTabSize
    ? parseInt(settings.editorTabSize, 10)
    : 2;
  const queryLimit = settings?.queryLimit
    ? parseInt(settings.queryLimit, 10)
    : 1000;

  // Refs to avoid stale closures in Monaco callbacks
  const schemaInfoRef = useRef(schemaInfo);
  const handleRunRef = useRef<() => void>(() => {});
  const handleExplainRef = useRef<() => void>(() => {});

  // Keep refs in sync
  useEffect(() => {
    schemaInfoRef.current = schemaInfo;
  }, [schemaInfo]);

  // Ensure schema is available for autocomplete even if user never opened Schema view
  useEffect(() => {
    if (activeId && activeConnection?.isConnected) {
      ensureSchemaReady(activeId, selectedSchema ?? undefined);
    }
  }, [activeId, activeConnection?.isConnected, selectedSchema, ensureSchemaReady]);

  // Load history when connection changes
  useEffect(() => {
    if (activeId && activeConnection?.isConnected) {
      loadHistory(activeId);
    }
  }, [activeId, activeConnection?.isConnected, loadHistory]);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Register SQL autocomplete — reads from ref for fresh schema data
      monaco.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model: editor.ITextModel, position: { lineNumber: number; column: number }) => {
          const word = model.getWordUntilPosition(position);
          const range: IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: languages.CompletionItem[] = [];
          const currentSchema = schemaInfoRef.current;

          // Add table names
          if (currentSchema?.tables) {
            for (const table of currentSchema.tables) {
              suggestions.push({
                label: table.tableName,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: table.tableName,
                detail: `${table.tableType} (~${table.rowEstimate} rows)`,
                range,
              });

              // Add column names prefixed with table
              for (const col of table.columns) {
                suggestions.push({
                  label: `${table.tableName}.${col.columnName}`,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: `${table.tableName}.${col.columnName}`,
                  detail: `${col.dataType}${col.isNullable ? "" : " NOT NULL"}`,
                  range,
                });

                // Also bare column name
                suggestions.push({
                  label: col.columnName,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.columnName,
                  detail: `${table.tableName}.${col.dataType}`,
                  range,
                });
              }
            }
          }

          // SQL keywords
          const keywords = [
            "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "RIGHT JOIN",
            "INNER JOIN", "ON", "AND", "OR", "NOT", "IN", "EXISTS",
            "BETWEEN", "LIKE", "ILIKE", "IS NULL", "IS NOT NULL",
            "ORDER BY", "GROUP BY", "HAVING", "LIMIT", "OFFSET", "AS",
            "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX",
            "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM",
            "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
            "UNION", "UNION ALL", "CASE", "WHEN", "THEN", "ELSE", "END",
            "COALESCE", "NULLIF", "CAST",
          ];

          for (const kw of keywords) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range,
            });
          }

          return { suggestions };
        },
      });

      // Ctrl/Cmd+Enter to execute — uses ref for latest handler
      editor.addAction({
        id: "execute-query",
        label: "Execute Query",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          handleRunRef.current();
        },
      });

      // Ctrl/Cmd+Shift+Enter to explain — uses ref for latest handler
      editor.addAction({
        id: "explain-query",
        label: "Explain Query",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        ],
        run: () => {
          handleExplainRef.current();
        },
      });
    },
    []
  );

  const getSelectedOrAllSql = useCallback((): string => {
    const ed = editorRef.current;
    if (!ed) return useQueryStore.getState().sql;
    const selection = ed.getSelection();
    if (selection && !selection.isEmpty()) {
      return ed.getModel()?.getValueInRange(selection) ?? useQueryStore.getState().sql;
    }
    return useQueryStore.getState().sql;
  }, []);

  const handleRun = useCallback(() => {
    const connId = useConnectionStore.getState().activeId;
    const conns = useConnectionStore.getState().connections;
    const conn = conns.find((c) => c.id === connId);
    if (!connId || !conn?.isConnected) {
      showToast("error", "Not connected to a database");
      return;
    }
    const query = getSelectedOrAllSql();
    if (!query.trim()) return;
    executeQuery(connId, query, queryLimit);
  }, [getSelectedOrAllSql, executeQuery, queryLimit]);

  const handleExplain = useCallback(() => {
    const connId = useConnectionStore.getState().activeId;
    const conns = useConnectionStore.getState().connections;
    const conn = conns.find((c) => c.id === connId);
    if (!connId || !conn?.isConnected) {
      showToast("error", "Not connected to a database");
      return;
    }
    const query = getSelectedOrAllSql();
    if (!query.trim()) return;
    explainQuery(connId, query);
  }, [getSelectedOrAllSql, explainQuery]);

  // Keep handler refs current
  useEffect(() => {
    handleRunRef.current = handleRun;
  }, [handleRun]);

  useEffect(() => {
    handleExplainRef.current = handleExplain;
  }, [handleExplain]);

  const handleHistorySelect = useCallback(
    (selectedSql: string) => {
      setSql(selectedSql);
      setShowHistory(false);
    },
    [setSql, setShowHistory]
  );

  // Not connected state
  if (!activeId || !activeConnection?.isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">Query Builder</p>
          <p className="text-sm">Connect to a database to run queries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary">
        <button
          onClick={handleRun}
          disabled={executing}
          className="px-3 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 font-medium"
        >
          {executing ? "Running..." : "Run"}
        </button>
        <button
          onClick={handleExplain}
          disabled={executing}
          className="px-3 py-1.5 text-xs border border-border rounded-md text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
        >
          Explain
        </button>

        <span className="text-[10px] text-text-muted">
          {navigator.platform.includes("Mac") ? "\u2318" : "Ctrl"}+Enter to run
        </span>

        <div className="flex-1" />

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-3 py-1.5 text-xs border rounded-md ${
            showHistory
              ? "border-accent text-accent bg-accent/10"
              : "border-border text-text-secondary hover:bg-bg-tertiary"
          }`}
        >
          History
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor */}
          <div className="h-[280px] border-b border-border flex-shrink-0">
            <Editor
              language="sql"
              theme={monacoTheme}
              value={sql}
              onChange={(value) => setSql(value ?? "")}
              onMount={handleEditorMount}
              options={{
                fontSize,
                tabSize,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 8 },
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="p-4 text-sm text-danger">
                <p className="font-semibold mb-1">Query Error</p>
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}
            {result && <ResultsTable result={result} />}
            {explainResult && <ExplainView result={explainResult} />}
            {!result && !explainResult && !error && (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                Run a query to see results here.
              </div>
            )}
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="w-72 border-l border-border flex-shrink-0 overflow-hidden">
            <QueryHistory
              history={history}
              onSelect={handleHistorySelect}
              onClear={() => activeId && clearHistory(activeId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
