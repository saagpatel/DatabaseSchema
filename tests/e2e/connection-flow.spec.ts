import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { mockInvoke, resetMocks } from '@/test/mocks/tauri'

describe('E2E: Connection Flow', () => {
  beforeEach(() => {
    resetMocks()
    mockInvoke('list_connections', { success: true, data: [] })
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
  })

  afterEach(resetMocks)

  it('should complete connection workflow: create → test → connect → introspect', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText(/Database Schema Visualizer/i)).toBeInTheDocument()
    })

    // 1. Open connection form by clicking "Add" button
    const newConnBtn = screen.getByRole('button', { name: /add|new connection/i })
    await user.click(newConnBtn)

    // 2. Fill form fields
    const nameInput = screen.getByLabelText(/connection name/i)
    await user.type(nameInput, 'Test DB')

    const hostInput = screen.getByLabelText(/host/i)
    await user.clear(hostInput)
    await user.type(hostInput, 'localhost')

    const dbInput = screen.getByLabelText(/database/i)
    await user.type(dbInput, 'test_db')

    const userInput = screen.getByLabelText(/username/i)
    await user.type(userInput, 'postgres')

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')

    // 3. Test connection
    mockInvoke('test_connection', { success: true, data: 'PostgreSQL 14.5' })
    const testBtn = screen.getByRole('button', { name: /test/i })
    await user.click(testBtn)

    await waitFor(() => {
      expect(screen.getByText(/connected|success/i)).toBeInTheDocument()
    })

    // 4. Save connection
    mockInvoke('create_connection', { success: true, data: { id: 'conn-1' } })
    mockInvoke('list_connections', {
      success: true,
      data: [
        {
          id: 'conn-1',
          name: 'Test DB',
          user_name: 'postgres',
          host: 'localhost',
          port: 5432,
          database_name: 'test_db',
          ssl_mode: 'prefer',
          color: '#3b82f6',
          isConnected: false
        }
      ]
    })

    const submitBtn = screen.getByRole('button', { name: /save/i })
    await user.click(submitBtn)

    // 5. Verify connection appears in list
    await waitFor(() => {
      expect(screen.getByText('Test DB')).toBeInTheDocument()
    })

    // 6. Connect to database
    mockInvoke('connect', { success: true, data: null })
    mockInvoke('list_connections', {
      success: true,
      data: [
        {
          id: 'conn-1',
          name: 'Test DB',
          user_name: 'postgres',
          host: 'localhost',
          port: 5432,
          database_name: 'test_db',
          ssl_mode: 'prefer',
          color: '#3b82f6',
          isConnected: true
        }
      ]
    })

    const connectBtn = screen.getByRole('button', { name: /connect/i })
    await user.click(connectBtn)

    // 7. Verify connected state
    await waitFor(() => {
      expect(screen.getByText(/connected|online/i)).toBeInTheDocument()
    })

    // 8. Introspect schema
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
              {
                name: 'id',
                type: 'bigint',
                nullable: false,
                default: null,
                characterMaxLength: null,
                ordinalPosition: 1
              }
            ],
            primaryKey: ['id'],
            foreignKeys: [],
            indexes: []
          }
        ]
      }
    })

    // Navigate to schema view
    const schemaNavBtn = screen.getByRole('button', { name: /schema/i })
    await user.click(schemaNavBtn)

    // 9. Verify schema is displayed
    await waitFor(() => {
      expect(screen.getByText('users')).toBeInTheDocument()
    })
  }, 30000) // 30 second timeout for full E2E flow

  it('should handle connection creation errors', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open form
    const newConnBtn = screen.getByRole('button', { name: /add|new connection/i })
    await user.click(newConnBtn)

    // Fill minimal form
    await user.type(screen.getByLabelText(/connection name/i), 'Duplicate DB')
    await user.type(screen.getByLabelText(/database/i), 'test')
    await user.type(screen.getByLabelText(/username/i), 'user')
    await user.type(screen.getByLabelText(/password/i), 'pass')

    // Mock error response
    mockInvoke('create_connection', {
      success: false,
      error: 'Connection with this name already exists'
    })

    // Submit
    const submitBtn = screen.getByRole('button', { name: /save/i })
    await user.click(submitBtn)

    // Verify error is displayed
    await waitFor(() => {
      expect(
        screen.getByText(/connection with this name already exists/i)
      ).toBeInTheDocument()
    })
  })
})
