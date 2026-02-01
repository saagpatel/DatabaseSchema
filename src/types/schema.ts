export interface SchemaInfo {
  schemaName: string;
  tables: TableInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface TableInfo {
  schemaName: string;
  tableName: string;
  tableType: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowEstimate: number;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault: string | null;
  ordinalPosition: number;
  characterMaximumLength: number | null;
}

export interface ForeignKeyInfo {
  constraintName: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
}

export interface IndexInfo {
  indexName: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
}
