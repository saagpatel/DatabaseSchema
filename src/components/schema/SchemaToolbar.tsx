interface SchemaToolbarProps {
  schemas: string[];
  selectedSchema: string | null;
  onSchemaChange: (schema: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layout: "dagre" | "force";
  onLayoutChange: (layout: "dagre" | "force") => void;
  onRefresh: () => void;
  onFitView: () => void;
  loading: boolean;
  tableCount: number;
}

export function SchemaToolbar({
  schemas,
  selectedSchema,
  onSchemaChange,
  searchQuery,
  onSearchChange,
  layout,
  onLayoutChange,
  onRefresh,
  onFitView,
  loading,
  tableCount,
}: SchemaToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-bg-secondary">
      {/* Schema selector */}
      <select
        className="px-2 py-1.5 bg-bg-primary border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        value={selectedSchema ?? ""}
        onChange={(e) => onSchemaChange(e.target.value)}
      >
        <option value="" disabled>
          Select schema
        </option>
        {schemas.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Search */}
      <input
        className="px-2 py-1.5 bg-bg-primary border border-border rounded-md text-sm text-text-primary w-48 focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Filter tables..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      {/* Table count */}
      {tableCount > 0 && (
        <span className="text-xs text-text-muted">
          {tableCount} table{tableCount !== 1 ? "s" : ""}
        </span>
      )}

      <div className="flex-1" />

      {/* Layout toggle */}
      <div className="flex border border-border rounded-md overflow-hidden">
        <button
          onClick={() => onLayoutChange("dagre")}
          className={`px-3 py-1 text-xs ${
            layout === "dagre"
              ? "bg-accent text-white"
              : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
          }`}
        >
          Hierarchical
        </button>
        <button
          onClick={() => onLayoutChange("force")}
          className={`px-3 py-1 text-xs ${
            layout === "force"
              ? "bg-accent text-white"
              : "bg-bg-primary text-text-secondary hover:bg-bg-tertiary"
          }`}
        >
          Force
        </button>
      </div>

      {/* Fit view */}
      <button
        onClick={onFitView}
        className="px-2 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-bg-tertiary"
        title="Fit to view"
        aria-label="Fit to view"
      >
        ⊡
      </button>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-2 py-1 text-xs border border-border rounded-md text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
        title="Refresh schema"
        aria-label="Refresh schema"
      >
        {loading ? "⟳" : "↻"}
      </button>
    </div>
  );
}
