import { useCallback, useEffect, useRef, useState } from "react";

import { OllamaStatusBadge } from "./OllamaStatusBadge";
import { SuggestionCard } from "./SuggestionCard";
import { AiHistoryPanel } from "./AiHistoryPanel";
import { useAi } from "@/hooks/useAi";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useQueryStore } from "@/stores/queryStore";
import { showToast } from "@/components/common/Toast";
import type { SuggestionType, AiSuggestion } from "@/types/ai";

const SUGGESTION_TYPES: { value: SuggestionType; label: string; placeholder: string }[] = [
  {
    value: "query_optimization",
    label: "Query Optimization",
    placeholder: "Paste a SQL query to optimize...",
  },
  {
    value: "index_suggestion",
    label: "Index Suggestion",
    placeholder:
      "Describe your table, query patterns, or paste table stats...",
  },
  {
    value: "schema_review",
    label: "Schema Review",
    placeholder: "Paste your CREATE TABLE statements or schema info...",
  },
  {
    value: "general",
    label: "General Question",
    placeholder: "Ask any PostgreSQL question...",
  },
];

export function AiView() {
  const [selectedType, setSelectedType] = useState<SuggestionType>("query_optimization");
  const [context, setContext] = useState("");
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const activeConnection = connections.find((c) => c.id === activeId);

  const settings = useSettingsStore((s) => s.settings);

  const {
    ollamaStatus,
    suggestions,
    history,
    generating,
    error,
    showHistory,
    setShowHistory,
    clearSuggestions,
    checkStatus,
    suggest,
    loadHistory,
    acceptSuggestion,
    clearHistory,
  } = useAi();

  // Check Ollama status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Load history when connection changes
  useEffect(() => {
    if (activeId && activeConnection?.isConnected) {
      loadHistory(activeId);
    }
  }, [activeId, activeConnection?.isConnected, loadHistory]);

  // Scroll to bottom when new suggestions arrive
  useEffect(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [suggestions.length]);

  const handleSubmit = useCallback(() => {
    if (!activeId || !activeConnection?.isConnected) {
      showToast("error", "Not connected to a database");
      return;
    }
    if (!context.trim()) {
      showToast("error", "Enter some context for the AI suggestion");
      return;
    }
    if (!ollamaStatus?.available) {
      showToast(
        "error",
        `Ollama is not available at ${settings?.ollamaEndpoint ?? "http://localhost:11434"}. Please start Ollama first.`
      );
      return;
    }
    suggest(activeId, selectedType, context);
  }, [activeId, activeConnection, context, selectedType, ollamaStatus, settings, suggest]);

  const handleCopyToQuery = useCallback((sql: string) => {
    useQueryStore.getState().setSql(sql);
    showToast("success", "SQL copied to Query editor");
  }, []);

  const handleHistorySelect = useCallback(
    (item: AiSuggestion) => {
      setContext(item.inputContext);
      setSelectedType(item.suggestionType as SuggestionType);
      setShowHistory(false);
    },
    [setShowHistory]
  );

  const currentType = SUGGESTION_TYPES.find((t) => t.value === selectedType);

  if (!activeId || !activeConnection?.isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">AI Assistant</p>
          <p className="text-sm">
            Connect to a database to use AI-powered suggestions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary">
        <OllamaStatusBadge status={ollamaStatus} onRefresh={checkStatus} />

        {settings && (
          <span className="text-[10px] text-text-muted">
            Model: {settings.ollamaModel}
          </span>
        )}

        <div className="flex-1" />

        {suggestions.length > 0 && (
          <button
            onClick={clearSuggestions}
            className="px-2 py-1 text-[11px] text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        )}

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
          {/* Suggestions area */}
          <div className="flex-1 overflow-auto p-4">
            {suggestions.length === 0 && !error && !generating && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <p className="text-text-muted text-sm mb-3">
                    Get AI-powered suggestions for your PostgreSQL database.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {SUGGESTION_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => {
                          setSelectedType(t.value);
                          setContext("");
                        }}
                        className={`p-3 rounded-lg border text-left text-xs ${
                          selectedType === t.value
                            ? "border-accent bg-accent/5 text-accent"
                            : "border-border text-text-secondary hover:bg-bg-secondary"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {suggestions.map((s) => (
              <div key={s.id} className="mb-4">
                <SuggestionCard
                  suggestion={s}
                  onAccept={acceptSuggestion}
                  onCopyToQuery={handleCopyToQuery}
                />
              </div>
            ))}

            {generating && (
              <div className="flex items-center gap-2 p-4 text-text-muted text-sm">
                <span className="animate-pulse">Generating suggestion...</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-sm text-danger">
                <p className="font-semibold mb-1">AI Error</p>
                <p className="font-mono text-xs">{error}</p>
              </div>
            )}

            <div ref={resultsEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-bg-secondary p-3">
            <div className="flex gap-2 mb-2">
              {SUGGESTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  className={`px-2 py-1 text-[11px] rounded ${
                    selectedType === t.value
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-muted hover:text-text-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={currentType?.placeholder}
                className="flex-1 px-3 py-2 text-xs font-mono bg-bg-primary border border-border rounded-md text-text-primary resize-none focus:outline-none focus:border-accent"
                rows={3}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={generating || !context.trim()}
                className="px-4 py-2 text-xs bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-50 font-medium self-end"
              >
                {generating ? "..." : "Ask"}
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              {navigator.platform.includes("Mac") ? "\u2318" : "Ctrl"}+Enter to
              submit
            </p>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="w-72 border-l border-border flex-shrink-0 overflow-hidden">
            <AiHistoryPanel
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
