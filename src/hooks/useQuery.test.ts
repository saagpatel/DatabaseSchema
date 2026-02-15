import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useQuery } from './useQuery'
import { mockInvoke, mockInvokeError, resetMocks } from '@/test/mocks/tauri'
import { useQueryStore } from '@/stores/queryStore'

const mockQueryResult = {
  rows: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ],
  columnNames: ['id', 'name'],
  rowCount: 2,
  executionTimeMs: 145,
  isLimited: false
}

const mockExplainResult = {
  plan: {
    nodeType: 'Seq Scan',
    startupCost: 0,
    totalCost: 100,
    planRows: 1000,
    actualRows: 950,
    actualTime: 50,
    warnings: []
  },
  planJson: '{}'
}

const mockHistory = [
  {
    id: 'hist-1',
    sql_text: 'SELECT * FROM users',
    execution_time_ms: 100,
    row_count: 10,
    status: 'success',
    error_message: null,
    executed_at: '2024-01-01T00:00:00Z'
  }
]

describe('useQuery', () => {
  beforeEach(() => {
    resetMocks()
    // Reset store state
    useQueryStore.setState({
      sql: '',
      result: null,
      explainResult: null,
      isExecuting: false,
      error: null,
      history: []
    })
  })

  afterEach(() => {
    resetMocks()
  })

  describe('executeQuery', () => {
    it('should execute query and set results', async () => {
      mockInvoke('execute_query', { success: true, data: mockQueryResult })

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.executeQuery('conn-1', 'SELECT * FROM users')
      })

      await waitFor(() => {
        expect(result.current.result).toEqual(mockQueryResult)
        expect(result.current.isExecuting).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle query execution errors', async () => {
      mockInvokeError('execute_query', 'SQL error: syntax error at or near "SELECT"')

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.executeQuery('conn-1', 'INVALID SQL')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('SQL error: syntax error at or near "SELECT"')
        expect(result.current.isExecuting).toBe(false)
      })
    })

    it('should set executing state during query', async () => {
      mockInvoke('execute_query', { success: true, data: mockQueryResult })

      const { result } = renderHook(() => useQuery())

      // Start executing
      act(() => {
        result.current.executeQuery('conn-1', 'SELECT 1')
      })

      // Should be executing immediately
      expect(result.current.isExecuting).toBe(true)

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false)
      })
    })

    it('should pass limit parameter', async () => {
      mockInvoke('execute_query', { success: true, data: mockQueryResult })

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.executeQuery('conn-1', 'SELECT * FROM large_table', 500)
      })

      await waitFor(() => {
        expect(result.current.result).toEqual(mockQueryResult)
      })
    })
  })

  describe('explainQuery', () => {
    it('should explain query and set plan', async () => {
      mockInvoke('explain_query', { success: true, data: mockExplainResult })

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.explainQuery('conn-1', 'SELECT * FROM users')
      })

      await waitFor(() => {
        expect(result.current.explainResult).toEqual(mockExplainResult)
        expect(result.current.isExecuting).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle EXPLAIN errors', async () => {
      mockInvokeError('explain_query', 'EXPLAIN failed: query error')

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.explainQuery('conn-1', 'INVALID SQL')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('EXPLAIN failed: query error')
      })
    })
  })

  describe('loadHistory', () => {
    it('should load query history', async () => {
      mockInvoke('get_query_history', { success: true, data: mockHistory })

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.loadHistory('conn-1')
      })

      await waitFor(() => {
        expect(result.current.history).toEqual(mockHistory)
      })
    })

    it('should handle history load errors gracefully', async () => {
      mockInvokeError('get_query_history', 'Database error')

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.loadHistory('conn-1')
      })

      // Should not crash, error is logged but not stored in state
      expect(result.current.history).toEqual([])
    })
  })

  describe('clearHistory', () => {
    it('should clear query history', async () => {
      // Set initial history
      useQueryStore.setState({ history: mockHistory })
      mockInvoke('clear_query_history', { success: true, data: null })

      const { result } = renderHook(() => useQuery())

      await act(async () => {
        await result.current.clearHistory('conn-1')
      })

      await waitFor(() => {
        expect(result.current.history).toEqual([])
      })
    })
  })
})
