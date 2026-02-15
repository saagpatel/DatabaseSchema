// Test data fixtures for consistent testing

export const mockConnectionData = {
  id: 'test-conn-1',
  name: 'Test Connection',
  user_name: 'postgres',
  host: 'localhost',
  port: 5432,
  database_name: 'test_db',
  ssl_mode: 'prefer' as const,
  color: '#3b82f6',
  isConnected: false
}

export const mockConnectedConnectionData = {
  ...mockConnectionData,
  id: 'test-conn-2',
  name: 'Connected Test DB',
  isConnected: true
}

export const mockSchemaData = {
  tables: [
    {
      name: 'users',
      type: 'BASE TABLE' as const,
      schema: 'public',
      rowEstimate: 1000,
      columns: [
        {
          name: 'id',
          type: 'bigint',
          nullable: false,
          default: 'nextval(\'users_id_seq\'::regclass)',
          characterMaxLength: null,
          ordinalPosition: 1
        },
        {
          name: 'email',
          type: 'character varying',
          nullable: false,
          default: null,
          characterMaxLength: 255,
          ordinalPosition: 2
        },
        {
          name: 'created_at',
          type: 'timestamp without time zone',
          nullable: false,
          default: 'now()',
          characterMaxLength: null,
          ordinalPosition: 3
        }
      ],
      primaryKey: ['id'],
      foreignKeys: [],
      indexes: [
        {
          name: 'users_pkey',
          columns: ['id'],
          isUnique: true,
          isPrimary: true
        },
        {
          name: 'users_email_idx',
          columns: ['email'],
          isUnique: true,
          isPrimary: false
        }
      ]
    },
    {
      name: 'posts',
      type: 'BASE TABLE' as const,
      schema: 'public',
      rowEstimate: 5000,
      columns: [
        {
          name: 'id',
          type: 'bigint',
          nullable: false,
          default: 'nextval(\'posts_id_seq\'::regclass)',
          characterMaxLength: null,
          ordinalPosition: 1
        },
        {
          name: 'user_id',
          type: 'bigint',
          nullable: false,
          default: null,
          characterMaxLength: null,
          ordinalPosition: 2
        },
        {
          name: 'title',
          type: 'character varying',
          nullable: false,
          default: null,
          characterMaxLength: 200,
          ordinalPosition: 3
        }
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          constraintName: 'posts_user_id_fkey',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id']
        }
      ],
      indexes: [
        {
          name: 'posts_pkey',
          columns: ['id'],
          isUnique: true,
          isPrimary: true
        },
        {
          name: 'posts_user_id_idx',
          columns: ['user_id'],
          isUnique: false,
          isPrimary: false
        }
      ]
    }
  ]
}

export const mockQueryResult = {
  rows: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ],
  columnNames: ['id', 'name', 'email'],
  rowCount: 3,
  executionTimeMs: 145,
  isLimited: false
}

export const mockExplainResult = {
  plan: {
    nodeType: 'Seq Scan',
    relationName: 'users',
    startupCost: 0,
    totalCost: 100.5,
    planRows: 1000,
    planWidth: 256,
    actualRows: 950,
    actualTime: 45.2,
    actualLoops: 1,
    sharedReadBlocks: 50,
    warnings: ['Sequential scan on large table (>10k rows)']
  },
  planJson: '{"Plan": {"Node Type": "Seq Scan", "Relation Name": "users"}}'
}

export const mockTableStats = {
  seq_scan: 1234,
  seq_tup_read: 50000,
  idx_scan: 5678,
  idx_tup_fetch: 12000,
  n_tup_ins: 1000,
  n_tup_upd: 500,
  n_tup_del: 100,
  n_live_tup: 10000,
  n_dead_tup: 50,
  last_vacuum: '2024-01-15T10:30:00Z',
  last_analyze: '2024-01-15T10:35:00Z'
}

export const mockIndexStats = {
  idx_scan: 5678,
  idx_tup_read: 12000,
  idx_tup_fetch: 11500,
  size_bytes: 2048576
}

export const mockAiSuggestion = {
  id: 'ai-sugg-1',
  suggestion_type: 'query_optimization' as const,
  input_context: 'SELECT * FROM users WHERE email = \'test@example.com\'',
  suggestion: 'Consider adding an index on the email column:\nCREATE INDEX idx_users_email ON users(email);',
  confidence: 0.85,
  accepted: false,
  created_at: '2024-01-20T12:00:00Z'
}

export const mockSettings = {
  theme: 'system' as const,
  query_limit: 1000,
  ollama_endpoint: 'http://localhost:11434',
  ollama_model: 'llama3.2',
  editor_font_size: 14,
  editor_tab_size: 2,
  graph_layout: 'dagre' as const,
  graph_show_columns: true,
  graph_show_types: true
}

export const mockQueryHistory = [
  {
    id: 'hist-1',
    sql_text: 'SELECT * FROM users LIMIT 10',
    execution_time_ms: 100,
    row_count: 10,
    status: 'success' as const,
    error_message: null,
    executed_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'hist-2',
    sql_text: 'SELECT COUNT(*) FROM posts',
    execution_time_ms: 50,
    row_count: 1,
    status: 'success' as const,
    error_message: null,
    executed_at: '2024-01-20T10:05:00Z'
  },
  {
    id: 'hist-3',
    sql_text: 'INVALID SQL SYNTAX',
    execution_time_ms: 0,
    row_count: 0,
    status: 'error' as const,
    error_message: 'syntax error at or near "INVALID"',
    executed_at: '2024-01-20T10:10:00Z'
  }
]
