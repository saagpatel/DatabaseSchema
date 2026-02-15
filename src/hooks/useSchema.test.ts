import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSchema } from './useSchema'
import { mockInvoke, mockInvokeError, resetMocks } from '@/test/mocks/tauri'
import { useSchemaStore } from '@/stores/schemaStore'
import { useConnectionStore } from '@/stores/connectionStore'

const mockSchemaData = {
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

describe('useSchema', () => {
  beforeEach(() => {
    resetMocks()
    // Reset store state
    useSchemaStore.setState({
      schemas: [],
      selectedSchema: null,
      schemaInfo: null,
      isLoading: false,
      error: null,
      searchQuery: ''
    })
    useConnectionStore.setState({
      activeId: 'conn-1',
      connections: [],
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    resetMocks()
  })

  describe('loadSchemas', () => {
    it('should load schemas list', async () => {
      const mockSchemas = ['public', 'app_schema', 'user_data']
      mockInvoke('list_schemas', { success: true, data: mockSchemas })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchemas('conn-1')
      })

      await waitFor(() => {
        expect(result.current.schemas).toEqual(mockSchemas)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })

    it('should auto-select public schema if available', async () => {
      const mockSchemas = ['public', 'other']
      mockInvoke('list_schemas', { success: true, data: mockSchemas })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchemas('conn-1')
      })

      await waitFor(() => {
        expect(result.current.selectedSchema).toBe('public')
      })
    })

    it('should handle schema list errors', async () => {
      mockInvokeError('list_schemas', 'Connection not found')

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchemas('conn-1')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Connection not found')
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('loadSchema', () => {
    it('should load schema from cache if available', async () => {
      mockInvoke('get_cached_schema', { success: true, data: mockSchemaData })
      mockInvoke('introspect_schema', { success: true, data: mockSchemaData })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchema('conn-1', 'public')
      })

      await waitFor(() => {
        expect(result.current.schemaInfo).toEqual(mockSchemaData)
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should introspect schema if no cache', async () => {
      mockInvoke('get_cached_schema', { success: true, data: null })
      mockInvoke('introspect_schema', { success: true, data: mockSchemaData })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchema('conn-1', 'public')
      })

      await waitFor(() => {
        expect(result.current.schemaInfo).toEqual(mockSchemaData)
      })
    })

    it('should handle introspection errors', async () => {
      mockInvoke('get_cached_schema', { success: true, data: null })
      mockInvokeError('introspect_schema', 'Schema not found')

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.loadSchema('conn-1', 'public')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Schema not found')
      })
    })
  })

  describe('ensureSchemaReady', () => {
    it('should load schemas and default schema', async () => {
      mockInvoke('list_schemas', { success: true, data: ['public'] })
      mockInvoke('get_cached_schema', { success: true, data: null })
      mockInvoke('introspect_schema', { success: true, data: mockSchemaData })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.ensureSchemaReady('conn-1')
      })

      await waitFor(() => {
        expect(result.current.schemas).toEqual(['public'])
        expect(result.current.selectedSchema).toBe('public')
        expect(result.current.schemaInfo).toEqual(mockSchemaData)
      })
    })

    it('should use preferred schema if provided', async () => {
      mockInvoke('list_schemas', { success: true, data: ['public', 'app_schema'] })
      mockInvoke('get_cached_schema', { success: true, data: null })
      mockInvoke('introspect_schema', { success: true, data: mockSchemaData })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.ensureSchemaReady('conn-1', 'app_schema')
      })

      await waitFor(() => {
        expect(result.current.selectedSchema).toBe('app_schema')
      })
    })
  })

  describe('refreshSchema', () => {
    it('should refresh schema from introspection', async () => {
      mockInvoke('introspect_schema', { success: true, data: mockSchemaData })

      const { result } = renderHook(() => useSchema())

      await act(async () => {
        await result.current.refreshSchema('conn-1', 'public')
      })

      await waitFor(() => {
        expect(result.current.schemaInfo).toEqual(mockSchemaData)
      })
    })
  })
})
