import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useConnections } from './useConnections'
import { mockInvoke, mockInvokeError, resetMocks } from '@/test/mocks/tauri'
import { useConnectionStore } from '@/stores/connectionStore'

describe('useConnections', () => {
  beforeEach(() => {
    resetMocks()
    // Reset store state
    useConnectionStore.setState({
      connections: [],
      activeConnectionId: null,
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    resetMocks()
  })

  describe('loadConnections', () => {
    it('should load connections on call', async () => {
      const mockConnections = [
        {
          id: '1',
          name: 'production',
          user_name: 'postgres',
          host: 'db.example.com',
          port: 5432,
          database_name: 'prod_db',
          ssl_mode: 'require',
          color: '#3b82f6',
          isConnected: false
        }
      ]
      mockInvoke('list_connections', { success: true, data: mockConnections })

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        await result.current.loadConnections()
      })

      await waitFor(() => {
        expect(result.current.connections).toEqual(mockConnections)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should handle connection errors', async () => {
      mockInvokeError('list_connections', 'Database error')

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        await result.current.loadConnections()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Database error')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should set loading state during fetch', async () => {
      mockInvoke('list_connections', { success: true, data: [] })

      const { result } = renderHook(() => useConnections())

      // Start loading
      act(() => {
        result.current.loadConnections()
      })

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('createConnection', () => {
    it('should create a new connection', async () => {
      mockInvoke('create_connection', { success: true, data: { id: 'new-id' } })
      mockInvoke('list_connections', { success: true, data: [] })

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        await result.current.createConnection({
          name: 'test',
          host: 'localhost',
          port: 5432,
          database_name: 'test_db',
          user_name: 'postgres',
          password: 'password',
          ssl_mode: 'prefer',
          color: '#3b82f6'
        })
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle creation errors', async () => {
      mockInvokeError('create_connection', 'Connection with this name already exists')

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        try {
          await result.current.createConnection({
            name: 'duplicate',
            host: 'localhost',
            port: 5432,
            database_name: 'test_db',
            user_name: 'postgres',
            password: 'password',
            ssl_mode: 'prefer',
            color: '#3b82f6'
          })
        } catch (e) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Connection with this name already exists')
    })
  })

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockInvoke('test_connection', { success: true, data: null })

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        const response = await result.current.testConnection({
          name: 'test',
          host: 'localhost',
          port: 5432,
          database_name: 'test_db',
          user_name: 'postgres',
          password: 'password',
          ssl_mode: 'prefer',
          color: '#3b82f6'
        })
        expect(response).toBeDefined()
      })
    })
  })

  describe('connectToDb', () => {
    it('should connect to database', async () => {
      mockInvoke('connect', { success: true, data: null })
      mockInvoke('list_connections', { success: true, data: [] })

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        await result.current.connectToDb('conn-1')
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle connection failures', async () => {
      mockInvokeError('connect', 'Failed to connect: invalid credentials')

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        try {
          await result.current.connectToDb('conn-1')
        } catch (e) {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to connect: invalid credentials')
    })
  })

  describe('disconnectFromDb', () => {
    it('should disconnect from database', async () => {
      mockInvoke('disconnect', { success: true, data: null })
      mockInvoke('list_connections', { success: true, data: [] })

      const { result } = renderHook(() => useConnections())

      await act(async () => {
        await result.current.disconnectFromDb('conn-1')
      })

      expect(result.current.error).toBeNull()
    })
  })
})
