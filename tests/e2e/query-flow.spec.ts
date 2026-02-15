import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { mockInvoke, resetMocks } from '@/test/mocks/tauri'

describe('E2E: Query Flow', () => {
  const connectedConnection = {
    id: 'conn-1',
    name: 'Test DB',
    user_name: 'postgres',
    host: 'localhost',
    port: 5432,
    database_name: 'test_db',
    ssl_mode: 'prefer' as const,
    color: '#3b82f6',
    isConnected: true
  }

  beforeEach(() => {
    resetMocks()
    // Set up with existing connected connection
    mockInvoke('list_connections', { success: true, data: [connectedConnection] })
    mockInvoke('get_settings', {
      success: true,
      data: {
        theme: 'system',
        query_limit: 1000,
        ollama_endpoint: 'http://localhost:11434',
        ollama_model: 'llama3.2',
        editor_font_size: 14,
        editor_tab_size: 2,
        graph_layout: 'dagre',
        graph_show_columns: true,
        graph_show_types: true
      }
    })

    // Mock schema introspection
    mockInvoke('list_schemas', { success: true, data: ['public'] })
    mockInvoke('get_cached_schema', { success: true, data: null })
    mockInvoke('introspect_schema', {
      success: true,
      data: {
        tables: [
          {
            name: 'users',
            type: 'BASE TABLE',
            schema: 'public',
            rowEstimate: 100,
            columns: [
              { name: 'id', type: 'bigint', nullable: false, default: null, characterMaxLength: null, ordinalPosition: 1 },
              { name: 'name', type: 'text', nullable: false, default: null, characterMaxLength: null, ordinalPosition: 2 }
            ],
            primaryKey: ['id'],
            foreignKeys: [],
            indexes: []
          }
        ]
      }
    })
  })

  afterEach(resetMocks)

  it('should complete query workflow: write → execute → see results', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Test DB')).toBeInTheDocument()
    })

    // 1. Navigate to Query view
    const queryNavBtn = screen.getByRole('button', { name: /query/i })
    await user.click(queryNavBtn)

    // 2. Wait for query view to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /execute|run/i })).toBeInTheDocument()
    })

    // 3. Type SQL query in editor (simplified - in real app, Monaco editor needs special handling)
    // For testing purposes, we'll assume the SQL state gets updated
    const sqlQuery = 'SELECT * FROM users LIMIT 10'

    // Mock the query execution
    mockInvoke('execute_query', {
      success: true,
      data: {
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' }
        ],
        columnNames: ['id', 'name'],
        rowCount: 3,
        executionTimeMs: 145,
        isLimited: false
      }
    })

    // 4. Execute query
    const executeBtn = screen.getByRole('button', { name: /execute|run/i })
    await user.click(executeBtn)

    // 5. Verify results are displayed
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })

    // 6. Verify execution stats
    await waitFor(() => {
      expect(screen.getByText(/3 row/i)).toBeInTheDocument()
      expect(screen.getByText(/145.*ms/i)).toBeInTheDocument()
    })
  }, 30000)

  it('should complete EXPLAIN workflow: write → explain → see plan', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Test DB')).toBeInTheDocument()
    })

    // Navigate to Query view
    const queryNavBtn = screen.getByRole('button', { name: /query/i })
    await user.click(queryNavBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /explain/i })).toBeInTheDocument()
    })

    // Mock EXPLAIN query
    mockInvoke('explain_query', {
      success: true,
      data: {
        plan: {
          nodeType: 'Seq Scan',
          relationName: 'users',
          startupCost: 0,
          totalCost: 100.5,
          planRows: 1000,
          actualRows: 950,
          actualTime: 45.2,
          warnings: ['Sequential scan on large table (>10k rows)']
        },
        planJson: '{"Plan": {"Node Type": "Seq Scan"}}'
      }
    })

    // Click EXPLAIN button
    const explainBtn = screen.getByRole('button', { name: /explain/i })
    await user.click(explainBtn)

    // Verify EXPLAIN plan is displayed
    await waitFor(() => {
      expect(screen.getByText(/seq scan|sequential scan/i)).toBeInTheDocument()
      expect(screen.getByText(/users/i)).toBeInTheDocument()
      expect(screen.getByText(/100\.5|cost/i)).toBeInTheDocument()
    })

    // Verify warnings are shown
    await waitFor(() => {
      expect(screen.getByText(/sequential scan on large table/i)).toBeInTheDocument()
    })
  }, 30000)

  it('should handle query execution errors', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test DB')).toBeInTheDocument()
    })

    // Navigate to Query view
    const queryNavBtn = screen.getByRole('button', { name: /query/i })
    await user.click(queryNavBtn)

    // Mock query error
    mockInvoke('execute_query', {
      success: false,
      error: 'SQL error: syntax error at or near "INVALID"'
    })

    // Execute query
    const executeBtn = screen.getByRole('button', { name: /execute|run/i })
    await user.click(executeBtn)

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/SQL error|syntax error/i)).toBeInTheDocument()
    })
  })

  it('should load and display query history', async () => {
    const user = userEvent.setup()

    // Mock query history
    mockInvoke('get_query_history', {
      success: true,
      data: [
        {
          id: 'hist-1',
          sql_text: 'SELECT * FROM users LIMIT 10',
          execution_time_ms: 100,
          row_count: 10,
          status: 'success',
          error_message: null,
          executed_at: '2024-01-20T10:00:00Z'
        },
        {
          id: 'hist-2',
          sql_text: 'SELECT COUNT(*) FROM posts',
          execution_time_ms: 50,
          row_count: 1,
          status: 'success',
          error_message: null,
          executed_at: '2024-01-20T10:05:00Z'
        }
      ]
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Test DB')).toBeInTheDocument()
    })

    // Navigate to Query view
    const queryNavBtn = screen.getByRole('button', { name: /query/i })
    await user.click(queryNavBtn)

    // Open history panel
    const historyBtn = screen.getByRole('button', { name: /history/i })
    await user.click(historyBtn)

    // Verify history items are displayed
    await waitFor(() => {
      expect(screen.getByText(/SELECT \* FROM users/i)).toBeInTheDocument()
      expect(screen.getByText(/SELECT COUNT/i)).toBeInTheDocument()
    })
  })
})
