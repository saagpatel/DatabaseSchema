use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SchemaInfo {
    pub schema_name: String,
    pub tables: Vec<TableInfo>,
    pub foreign_keys: Vec<ForeignKeyInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TableInfo {
    pub schema_name: String,
    pub table_name: String,
    pub table_type: String, // "BASE TABLE" or "VIEW"
    pub columns: Vec<ColumnInfo>,
    pub indexes: Vec<IndexInfo>,
    pub row_estimate: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnInfo {
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub column_default: Option<String>,
    pub ordinal_position: i32,
    pub character_maximum_length: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyInfo {
    pub constraint_name: String,
    pub source_schema: String,
    pub source_table: String,
    pub source_column: String,
    pub target_schema: String,
    pub target_table: String,
    pub target_column: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndexInfo {
    pub index_name: String,
    pub is_unique: bool,
    pub is_primary: bool,
    pub columns: Vec<String>,
}

/// Row types for PostgreSQL introspection queries

#[derive(Debug, sqlx::FromRow)]
pub struct SchemaRow {
    pub schema_name: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct TableRow {
    pub table_schema: String,
    pub table_name: String,
    pub table_type: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct ColumnRow {
    pub table_schema: String,
    pub table_name: String,
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: String,
    pub column_default: Option<String>,
    pub ordinal_position: i32,
    pub character_maximum_length: Option<i32>,
    pub is_primary_key: bool,
}

#[derive(Debug, sqlx::FromRow)]
pub struct ForeignKeyRow {
    pub constraint_name: String,
    pub source_schema: String,
    pub source_table: String,
    pub source_column: String,
    pub target_schema: String,
    pub target_table: String,
    pub target_column: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct IndexRow {
    pub table_schema: String,
    pub table_name: String,
    pub index_name: String,
    pub is_unique: bool,
    pub is_primary: bool,
    pub column_name: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct RowEstimateRow {
    pub schemaname: String,
    pub relname: String,
    pub n_live_tup: i64,
}
