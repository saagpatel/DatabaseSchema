import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryView } from './QueryView'
import { useQuery } from '@/hooks/useQuery'
import { useConnectionStore } from '@/stores/connectionStore'

vi.mock('@/hooks/useQuery')
vi.mock('@/stores/connectionStore')

describe('QueryView', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      sql: '',
      result: null,
      explainResult: null,
      isExecuting: false,
      error: null,
      history: [],
      setSql: vi.fn(),
      setResult: vi.fn(),
      setExplainResult: vi.fn(),
      setExecuting: vi.fn(),
      setError: vi.fn(),
      setHistory: vi.fn(),
      executeQuery: vi.fn(),
      explainQuery: vi.fn(),
      loadHistory: vi.fn(),
      clearHistory: vi.fn()
    })

    vi.mocked(useConnectionStore).mockReturnValue({
      connections: [{ id: '1', name: 'Test', host: 'localhost', port: 5432, database: 'test', username: 'user', sslMode: 'prefer', color: '#fff', isConnected: true }],
      activeId: '1',
      isLoading: false,
      error: null,
      setConnections: vi.fn(),
      setActiveId: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn()
    })
  })

  it('should render query editor', () => {
    render(<QueryView />)
    expect(screen.getByRole('textbox') || document.querySelector('.monaco-editor')).toBeTruthy()
  })

  it('should show execute button', () => {
    render(<QueryView />)
    expect(screen.getByRole('button', { name: /execute|run/i })).toBeInTheDocument()
  })

  it('should display results when available', () => {
    vi.mocked(useQuery).mockReturnValue({
      sql: 'SELECT * FROM users',
      result: {
        rows: [{ id: 1, name: 'Alice' }],
        columnNames: ['id', 'name'],
        rowCount: 1,
        executionTimeMs: 100,
        isLimited: false
      },
      explainResult: null,
      isExecuting: false,
      error: null,
      history: [],
      setSql: vi.fn(),
      setResult: vi.fn(),
      setExplainResult: vi.fn(),
      setExecuting: vi.fn(),
      setError: vi.fn(),
      setHistory: vi.fn(),
      executeQuery: vi.fn(),
      explainQuery: vi.fn(),
      loadHistory: vi.fn(),
      clearHistory: vi.fn()
    })

    render(<QueryView />)
    expect(screen.getByText(/Alice/i) || screen.getByText(/1 row/i)).toBeTruthy()
  })

  it('should show error message when query fails', () => {
    vi.mocked(useQuery).mockReturnValue({
      sql: 'INVALID SQL',
      result: null,
      explainResult: null,
      isExecuting: false,
      error: 'SQL syntax error',
      history: [],
      setSql: vi.fn(),
      setResult: vi.fn(),
      setExplainResult: vi.fn(),
      setExecuting: vi.fn(),
      setError: vi.fn(),
      setHistory: vi.fn(),
      executeQuery: vi.fn(),
      explainQuery: vi.fn(),
      loadHistory: vi.fn(),
      clearHistory: vi.fn()
    })

    render(<QueryView />)
    expect(screen.getByText(/SQL syntax error/i) || screen.getByRole('alert')).toBeTruthy()
  })
})
