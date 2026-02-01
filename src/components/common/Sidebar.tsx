import { ConnectionList } from "@/components/connections/ConnectionList";

export type View = "connections" | "schema" | "query" | "performance" | "ai" | "settings";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const mod = navigator.platform.includes("Mac") ? "\u2318" : "Ctrl";

const navItems: { id: View; label: string; icon: string; shortcut: string }[] = [
  { id: "connections", label: "Connections", icon: "\u229E", shortcut: `${mod}+1` },
  { id: "schema", label: "Schema", icon: "\u25C7", shortcut: `${mod}+2` },
  { id: "query", label: "Query", icon: "\u25B7", shortcut: `${mod}+3` },
  { id: "performance", label: "Performance", icon: "\u22BF", shortcut: `${mod}+4` },
  { id: "ai", label: "AI Assistant", icon: "\u2726", shortcut: `${mod}+5` },
  { id: "settings", label: "Settings", icon: "\u2699", shortcut: `${mod}+6` },
];

export function Sidebar({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <div
      className={`flex flex-col border-r border-border bg-bg-secondary transition-all ${
        collapsed ? "w-12" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        {!collapsed && (
          <span className="text-sm font-bold text-text-primary">
            <span className="text-accent">DB</span>Viz
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="text-text-muted hover:text-text-primary text-sm"
          title={collapsed ? `Expand sidebar (${mod}+B)` : `Collapse sidebar (${mod}+B)`}
        >
          {collapsed ? "\u25B8" : "\u25C2"}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 px-1.5 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
              currentView === item.id
                ? "bg-accent/10 text-accent font-medium"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
            title={collapsed ? `${item.label} (${item.shortcut})` : item.shortcut}
          >
            <span className="text-base">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] text-text-muted">{item.shortcut}</span>
              </>
            )}
          </button>
        ))}
      </nav>

      {!collapsed && currentView === "connections" && (
        <div className="flex-1 border-t border-border overflow-hidden">
          <ConnectionList />
        </div>
      )}
    </div>
  );
}
