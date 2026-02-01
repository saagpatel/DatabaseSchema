import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ColumnInfo } from "@/types/schema";

export interface TableNodeData {
  tableName: string;
  tableType: string;
  columns: ColumnInfo[];
  rowEstimate: number;
  color: string;
  showColumns: boolean;
  showTypes: boolean;
  columnCount: number;
  // FK source columns for this table (highlight these)
  fkSourceColumns: Set<string>;
  // FK target columns for this table (highlight these)
  fkTargetColumns: Set<string>;
}

type TableNodeProps = NodeProps & { data: TableNodeData };

function TableNodeComponent({ data, selected }: TableNodeProps) {
  const {
    tableName,
    tableType,
    columns,
    rowEstimate,
    color,
    showColumns,
    showTypes,
    fkSourceColumns,
    fkTargetColumns,
  } = data;

  const isView = tableType === "VIEW";

  const formatRowCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return String(count);
  };

  return (
    <div
      className={`bg-bg-primary border rounded-lg shadow-md min-w-[240px] overflow-hidden ${
        selected ? "ring-2 ring-accent" : ""
      }`}
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2" />

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: color + "18" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-text-muted">
            {isView ? "VIEW" : "TBL"}
          </span>
          <span className="text-sm font-semibold text-text-primary truncate">
            {tableName}
          </span>
        </div>
        <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">
          ~{formatRowCount(rowEstimate)} rows
        </span>
      </div>

      {/* Columns */}
      {showColumns && columns.length > 0 && (
        <div className="px-1 py-1">
          {columns.map((col) => {
            const isFkSource = fkSourceColumns.has(col.columnName);
            const isFkTarget = fkTargetColumns.has(col.columnName);

            return (
              <div
                key={col.columnName}
                className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded ${
                  isFkSource || isFkTarget ? "bg-accent/8" : ""
                }`}
              >
                {/* Icons */}
                <span className="w-4 text-center flex-shrink-0">
                  {col.isPrimaryKey ? (
                    <span className="text-warning" title="Primary Key">
                      ◆
                    </span>
                  ) : isFkSource ? (
                    <span className="text-accent" title="Foreign Key">
                      →
                    </span>
                  ) : isFkTarget ? (
                    <span className="text-success" title="Referenced">
                      ←
                    </span>
                  ) : null}
                </span>

                {/* Column name */}
                <span
                  className={`flex-1 truncate ${
                    col.isPrimaryKey
                      ? "font-semibold text-text-primary"
                      : "text-text-secondary"
                  }`}
                >
                  {col.columnName}
                </span>

                {/* Type */}
                {showTypes && (
                  <span className="text-text-muted font-mono text-[10px] flex-shrink-0">
                    {col.dataType}
                    {col.characterMaximumLength
                      ? `(${col.characterMaximumLength})`
                      : ""}
                  </span>
                )}

                {/* Nullable */}
                {!col.isNullable && (
                  <span
                    className="text-danger text-[10px] flex-shrink-0"
                    title="NOT NULL"
                  >
                    !
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2" />
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
