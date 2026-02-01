use sqlx::PgPool;
use std::collections::HashMap;

use crate::error::AppError;
use crate::models::schema::*;

/// List all user-accessible schemas (excludes pg_ and information_schema)
pub async fn list_schemas(pool: &PgPool) -> Result<Vec<String>, AppError> {
    let rows: Vec<SchemaRow> = sqlx::query_as(
        "SELECT schema_name::text
         FROM information_schema.schemata
         WHERE schema_name NOT LIKE 'pg_%'
           AND schema_name != 'information_schema'
         ORDER BY schema_name",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|r| r.schema_name).collect())
}

/// Full schema introspection: tables, columns, foreign keys, indexes, row estimates
pub async fn introspect_schema(
    pool: &PgPool,
    schema_name: &str,
) -> Result<SchemaInfo, AppError> {
    // Fetch tables
    let table_rows: Vec<TableRow> = sqlx::query_as(
        "SELECT table_schema::text, table_name::text, table_type::text
         FROM information_schema.tables
         WHERE table_schema = $1
           AND table_type IN ('BASE TABLE', 'VIEW')
         ORDER BY table_name",
    )
    .bind(schema_name)
    .fetch_all(pool)
    .await?;

    // Fetch columns with primary key info
    let column_rows: Vec<ColumnRow> = sqlx::query_as(
        "SELECT
            c.table_schema::text,
            c.table_name::text,
            c.column_name::text,
            c.data_type::text,
            c.is_nullable::text,
            c.column_default::text,
            c.ordinal_position::int4,
            c.character_maximum_length::int4,
            COALESCE(
                EXISTS(
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                        AND tc.table_schema = c.table_schema
                        AND tc.table_name = c.table_name
                        AND kcu.column_name = c.column_name
                ), false
            ) AS is_primary_key
         FROM information_schema.columns c
         WHERE c.table_schema = $1
         ORDER BY c.table_name, c.ordinal_position",
    )
    .bind(schema_name)
    .fetch_all(pool)
    .await?;

    // Fetch foreign keys using pg_catalog to correctly handle composite FKs
    // (information_schema.constraint_column_usage doesn't expose ordinal position,
    //  causing Cartesian products on composite foreign keys)
    let fk_rows: Vec<ForeignKeyRow> = sqlx::query_as(
        "SELECT
            con.conname::text AS constraint_name,
            src_ns.nspname::text AS source_schema,
            src_cl.relname::text AS source_table,
            src_att.attname::text AS source_column,
            tgt_ns.nspname::text AS target_schema,
            tgt_cl.relname::text AS target_table,
            tgt_att.attname::text AS target_column
         FROM pg_constraint con
         JOIN pg_class src_cl ON src_cl.oid = con.conrelid
         JOIN pg_namespace src_ns ON src_ns.oid = src_cl.relnamespace
         JOIN pg_class tgt_cl ON tgt_cl.oid = con.confrelid
         JOIN pg_namespace tgt_ns ON tgt_ns.oid = tgt_cl.relnamespace
         CROSS JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS cols(src_attnum, tgt_attnum, ord)
         JOIN pg_attribute src_att ON src_att.attrelid = con.conrelid AND src_att.attnum = cols.src_attnum
         JOIN pg_attribute tgt_att ON tgt_att.attrelid = con.confrelid AND tgt_att.attnum = cols.tgt_attnum
         WHERE con.contype = 'f'
           AND src_ns.nspname = $1
         ORDER BY con.conname, cols.ord",
    )
    .bind(schema_name)
    .fetch_all(pool)
    .await?;

    // Fetch indexes
    let index_rows: Vec<IndexRow> = sqlx::query_as(
        "SELECT
            t.schemaname::text AS table_schema,
            t.tablename::text AS table_name,
            i.indexname::text AS index_name,
            ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary,
            a.attname::text AS column_name
         FROM pg_indexes i
         JOIN pg_class c ON c.relname = i.indexname
         JOIN pg_index ix ON ix.indexrelid = c.oid
         JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
         JOIN pg_tables t ON t.tablename = i.tablename AND t.schemaname = i.schemaname
         WHERE i.schemaname = $1
         ORDER BY i.indexname, a.attnum",
    )
    .bind(schema_name)
    .fetch_all(pool)
    .await?;

    // Fetch row count estimates from pg_stat_user_tables
    let estimate_rows: Vec<RowEstimateRow> = sqlx::query_as(
        "SELECT schemaname::text, relname::text, n_live_tup::int8
         FROM pg_stat_user_tables
         WHERE schemaname = $1",
    )
    .bind(schema_name)
    .fetch_all(pool)
    .await?;

    // Build lookup maps
    let mut columns_by_table: HashMap<String, Vec<ColumnInfo>> = HashMap::new();
    for row in column_rows {
        columns_by_table
            .entry(row.table_name.clone())
            .or_default()
            .push(ColumnInfo {
                column_name: row.column_name,
                data_type: row.data_type,
                is_nullable: row.is_nullable == "YES",
                is_primary_key: row.is_primary_key,
                column_default: row.column_default,
                ordinal_position: row.ordinal_position,
                character_maximum_length: row.character_maximum_length,
            });
    }

    let mut indexes_by_table: HashMap<String, HashMap<String, IndexInfo>> = HashMap::new();
    for row in index_rows {
        let table_indexes = indexes_by_table.entry(row.table_name.clone()).or_default();
        let index = table_indexes
            .entry(row.index_name.clone())
            .or_insert_with(|| IndexInfo {
                index_name: row.index_name,
                is_unique: row.is_unique,
                is_primary: row.is_primary,
                columns: Vec::new(),
            });
        index.columns.push(row.column_name);
    }

    let mut estimates: HashMap<String, i64> = HashMap::new();
    for row in estimate_rows {
        estimates.insert(row.relname, row.n_live_tup);
    }

    // Assemble tables
    let tables: Vec<TableInfo> = table_rows
        .into_iter()
        .map(|row| {
            let columns = columns_by_table
                .remove(&row.table_name)
                .unwrap_or_default();
            let indexes: Vec<IndexInfo> = indexes_by_table
                .remove(&row.table_name)
                .map(|m| m.into_values().collect())
                .unwrap_or_default();
            let row_estimate = estimates.get(&row.table_name).copied().unwrap_or(0);

            TableInfo {
                schema_name: row.table_schema,
                table_name: row.table_name,
                table_type: row.table_type,
                columns,
                indexes,
                row_estimate,
            }
        })
        .collect();

    let foreign_keys: Vec<ForeignKeyInfo> = fk_rows
        .into_iter()
        .map(|row| ForeignKeyInfo {
            constraint_name: row.constraint_name,
            source_schema: row.source_schema,
            source_table: row.source_table,
            source_column: row.source_column,
            target_schema: row.target_schema,
            target_table: row.target_table,
            target_column: row.target_column,
        })
        .collect();

    Ok(SchemaInfo {
        schema_name: schema_name.to_string(),
        tables,
        foreign_keys,
    })
}
