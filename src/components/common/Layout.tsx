import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Sidebar, type View } from "./Sidebar";

interface LayoutProps {
  children: (view: View) => ReactNode;
}

const VIEW_KEYS: Record<string, View> = {
  "1": "connections",
  "2": "schema",
  "3": "query",
  "4": "performance",
  "5": "ai",
  "6": "settings",
};

export function Layout({ children }: LayoutProps) {
  const [currentView, setCurrentView] = useState<View>("connections");
  const [collapsed, setCollapsed] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + number to switch views
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const view = VIEW_KEYS[e.key];
        if (view) {
          e.preventDefault();
          setCurrentView(view);
        }

        // Cmd+B to toggle sidebar
        if (e.key === "b") {
          e.preventDefault();
          setCollapsed((prev) => !prev);
        }
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-bg-primary">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 overflow-hidden">{children(currentView)}</main>
    </div>
  );
}
