import { useEffect } from "react";
import { Layout } from "@/components/common/Layout";
import { Toast } from "@/components/common/Toast";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ConnectionDetail } from "@/components/connections/ConnectionDetail";
import { QueryView } from "@/components/query/QueryView";
import { SchemaView } from "@/components/schema/SchemaView";
import { PerformanceView } from "@/components/performance/PerformanceView";
import { AiView } from "@/components/ai/AiView";
import { SettingsView } from "@/components/settings/SettingsView";
import { useConnections } from "@/hooks/useConnections";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useSchema } from "@/hooks/useSchema";
import type { View } from "@/components/common/Sidebar";

function AppContent({ view }: { view: View }) {
  const { connections, activeId, loadConnections } = useConnections();
  const { selectedSchema, ensureSchemaReady } = useSchema();
  const activeConnection = connections.find((c) => c.id === activeId);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (!activeId || !activeConnection?.isConnected) return;
    ensureSchemaReady(activeId, selectedSchema ?? undefined);
  }, [activeId, activeConnection?.isConnected, selectedSchema, ensureSchemaReady]);

  if (view === "settings") {
    return <SettingsView />;
  }

  if (view === "schema") {
    return <SchemaView />;
  }

  if (view === "query") {
    return <QueryView />;
  }

  if (view === "performance") {
    return <PerformanceView />;
  }

  if (view === "ai") {
    return <AiView />;
  }

  // connections view
  if (activeConnection) {
    return <ConnectionDetail connection={activeConnection} />;
  }

  // Welcome / onboarding state
  return <WelcomeView hasConnections={connections.length > 0} />;
}

function WelcomeView({ hasConnections }: { hasConnections: boolean }) {
  const mod = navigator.platform.includes("Mac") ? "\u2318" : "Ctrl";

  return (
    <div className="flex items-center justify-center h-full text-text-muted">
      <div className="text-center max-w-lg">
        <div className="text-5xl mb-4">
          <span className="text-accent">DB</span>Viz
        </div>
        <p className="text-lg text-text-secondary mb-6">
          Database Schema Visualizer
        </p>

        {!hasConnections ? (
          <div className="space-y-4">
            <p className="text-sm">
              Get started by creating your first database connection.
            </p>
            <div className="bg-bg-secondary border border-border rounded-lg p-4 text-left text-sm space-y-2">
              <p className="font-medium text-text-primary">Quick Start</p>
              <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                <li>Click "Add" in the sidebar to create a connection</li>
                <li>Enter your PostgreSQL connection details</li>
                <li>Click "Test" to verify, then "Save"</li>
                <li>Click "Connect" to start exploring</li>
              </ol>
            </div>
          </div>
        ) : (
          <p className="text-sm">
            Select a connection from the sidebar to get started.
          </p>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-text-muted">
          <div className="bg-bg-secondary border border-border/50 rounded-lg p-3">
            <p className="font-medium text-text-secondary mb-1">Schema</p>
            <p>Interactive ERD with table relationships</p>
            <p className="mt-1 text-[10px]">{mod}+2</p>
          </div>
          <div className="bg-bg-secondary border border-border/50 rounded-lg p-3">
            <p className="font-medium text-text-secondary mb-1">Query</p>
            <p>SQL editor with autocomplete</p>
            <p className="mt-1 text-[10px]">{mod}+3</p>
          </div>
          <div className="bg-bg-secondary border border-border/50 rounded-lg p-3">
            <p className="font-medium text-text-secondary mb-1">AI</p>
            <p>Ollama-powered suggestions</p>
            <p className="mt-1 text-[10px]">{mod}+5</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { loadSettings } = useSettings();

  // Load settings on mount (needed for theme)
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Apply theme based on settings
  useTheme();

  return (
    <ErrorBoundary>
      <Toast />
      <Layout>
        {(view) => (
          <ErrorBoundary>
            <AppContent view={view} />
          </ErrorBoundary>
        )}
      </Layout>
    </ErrorBoundary>
  );
}
