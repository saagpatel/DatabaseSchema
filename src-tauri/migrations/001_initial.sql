CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL,
    port TEXT NOT NULL,
    database TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    ssl_mode TEXT NOT NULL DEFAULT 'prefer',
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('theme', 'system'),
    ('query_limit', '1000'),
    ('ollama_endpoint', 'http://localhost:11434'),
    ('ollama_model', 'llama3.2'),
    ('editor_font_size', '14'),
    ('editor_tab_size', '2'),
    ('graph_layout', 'dagre'),
    ('graph_show_columns', 'true'),
    ('graph_show_types', 'true');

CREATE TABLE IF NOT EXISTS query_history (
    id TEXT PRIMARY KEY NOT NULL,
    connection_id TEXT NOT NULL,
    sql_text TEXT NOT NULL,
    execution_time_ms INTEGER,
    row_count INTEGER,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schema_cache (
    id TEXT PRIMARY KEY NOT NULL,
    connection_id TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    cache_data TEXT NOT NULL,
    cached_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE,
    UNIQUE(connection_id, schema_name)
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY NOT NULL,
    connection_id TEXT NOT NULL,
    type TEXT NOT NULL,
    input_context TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    confidence REAL,
    accepted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
);
