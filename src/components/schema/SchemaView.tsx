import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TableNode, type TableNodeData } from "./TableNode";
import { SchemaToolbar } from "./SchemaToolbar";
import { useSchema } from "@/hooks/useSchema";
import { useConnectionStore } from "@/stores/connectionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettings } from "@/hooks/useSettings";
import { applyDagreLayout, applyForceLayout } from "@/utils/layout";
import type { SchemaInfo } from "@/types/schema";
import { showToast } from "@/components/common/Toast";

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
};

function buildNodesAndEdges(
  schemaInfo: SchemaInfo,
  searchQuery: string,
  showColumns: boolean,
  showTypes: boolean,
  connectionColor: string
): { nodes: Node[]; edges: Edge[] } {
  const query = searchQuery.toLowerCase();

  const filteredTables = schemaInfo.tables.filter((t) =>
    query ? t.tableName.toLowerCase().includes(query) : true
  );

  // Build FK lookup per table
  const fkSourceByTable = new Map<string, Set<string>>();
  const fkTargetByTable = new Map<string, Set<string>>();
  for (const fk of schemaInfo.foreignKeys) {
    if (!fkSourceByTable.has(fk.sourceTable)) {
      fkSourceByTable.set(fk.sourceTable, new Set());
    }
    fkSourceByTable.get(fk.sourceTable)!.add(fk.sourceColumn);

    if (!fkTargetByTable.has(fk.targetTable)) {
      fkTargetByTable.set(fk.targetTable, new Set());
    }
    fkTargetByTable.get(fk.targetTable)!.add(fk.targetColumn);
  }

  const filteredTableNames = new Set(filteredTables.map((t) => t.tableName));

  const nodes: Node[] = filteredTables.map((table) => ({
    id: table.tableName,
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: {
      tableName: table.tableName,
      tableType: table.tableType,
      columns: table.columns,
      rowEstimate: table.rowEstimate,
      color: connectionColor,
      showColumns,
      showTypes,
      columnCount: table.columns.length,
      fkSourceColumns: fkSourceByTable.get(table.tableName) ?? new Set<string>(),
      fkTargetColumns: fkTargetByTable.get(table.tableName) ?? new Set<string>(),
    } satisfies TableNodeData,
  }));

  const edges: Edge[] = schemaInfo.foreignKeys
    .filter(
      (fk) =>
        filteredTableNames.has(fk.sourceTable) &&
        filteredTableNames.has(fk.targetTable)
    )
    .map((fk) => ({
      id: fk.constraintName,
      source: fk.sourceTable,
      target: fk.targetTable,
      label: `${fk.sourceColumn} → ${fk.targetColumn}`,
      type: "smoothstep",
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
      },
      style: { stroke: "var(--accent)", strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: "var(--text-muted)" },
      labelBgStyle: {
        fill: "var(--bg-primary)",
        fillOpacity: 0.85,
      },
    }));

  return { nodes, edges };
}

function SchemaFlowInner() {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const settings = useSettingsStore((s) => s.settings);
  const { saveSettings } = useSettings();
  const [layout, setLayout] = useState<"dagre" | "force">(() =>
    settings?.graphLayout === "force" ? "force" : "dagre"
  );
  const layoutApplied = useRef(false);

  const {
    schemas,
    selectedSchema,
    schemaInfo,
    loading,
    error,
    searchQuery,
    setSelectedSchema,
    setSearchQuery,
    refreshSchema,
  } = useSchema();

  const connections = useConnectionStore((s) => s.connections);
  const activeId = useConnectionStore((s) => s.activeId);
  const activeConnection = connections.find((c) => c.id === activeId);

  const showColumns = settings?.graphShowColumns !== "false";
  const showTypes = settings?.graphShowTypes !== "false";

  useEffect(() => {
    if (settings?.graphLayout === "force" || settings?.graphLayout === "dagre") {
      setLayout(settings.graphLayout);
    }
  }, [settings?.graphLayout]);


  // Build nodes/edges when schema info or filters change
  const { builtNodes, builtEdges } = useMemo(() => {
    if (!schemaInfo) return { builtNodes: [], builtEdges: [] };
    const { nodes: n, edges: e } = buildNodesAndEdges(
      schemaInfo,
      searchQuery,
      showColumns,
      showTypes,
      activeConnection?.color ?? "#3b82f6"
    );
    return { builtNodes: n, builtEdges: e };
  }, [schemaInfo, searchQuery, showColumns, showTypes, activeConnection?.color]);

  // Apply layout when nodes/edges change
  useEffect(() => {
    if (builtNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const laid =
      layout === "dagre"
        ? applyDagreLayout(builtNodes, builtEdges)
        : applyForceLayout(builtNodes, builtEdges);

    setNodes(laid);
    setEdges(builtEdges);
    layoutApplied.current = true;
  }, [builtNodes, builtEdges, layout, setNodes, setEdges]);

  // Fit view after layout applies
  useEffect(() => {
    if (layoutApplied.current && nodes.length > 0) {
      // Small delay to let React Flow measure nodes
      const timer = setTimeout(() => fitView({ padding: 0.1 }), 50);
      layoutApplied.current = false;
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView]);

  const handleSchemaChange = useCallback(
    (schema: string) => {
      setSelectedSchema(schema);
    },
    [setSelectedSchema]
  );

  const handleRefresh = useCallback(() => {
    if (activeId && selectedSchema) {
      refreshSchema(activeId, selectedSchema);
      showToast("info", "Refreshing schema...");
    }
  }, [activeId, selectedSchema, refreshSchema]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.1 });
  }, [fitView]);

  const handleLayoutChange = useCallback(
    async (newLayout: "dagre" | "force") => {
      setLayout(newLayout);
      if (!settings) return;
      try {
        await saveSettings({ ...settings, graphLayout: newLayout });
      } catch {
        // Ignore persistence errors; in-memory layout is still applied
      }
    },
    [settings, saveSettings]
  );

  // Not connected state
  if (!activeId || !activeConnection?.isConnected) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <div className="text-center">
          <p className="text-lg mb-2">Schema Visualization</p>
          <p className="text-sm">
            Connect to a database to explore its schema.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-danger">
        <div className="text-center">
          <p className="text-lg mb-2">Error loading schema</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SchemaToolbar
        schemas={schemas}
        selectedSchema={selectedSchema}
        onSchemaChange={handleSchemaChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        onRefresh={handleRefresh}
        onFitView={handleFitView}
        loading={loading}
        tableCount={nodes.length}
      />
      <div className="flex-1">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Loading schema...
          </div>
        ) : nodes.length === 0 && selectedSchema ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            No tables found{searchQuery ? ` matching "${searchQuery}"` : ""}.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(node) => {
                const d = node.data as unknown as TableNodeData | undefined;
                return d?.color ?? "#3b82f6";
              }}
              maskColor="rgba(0,0,0,0.1)"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export function SchemaView() {
  return (
    <ReactFlowProvider>
      <SchemaFlowInner />
    </ReactFlowProvider>
  );
}
