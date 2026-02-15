import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SchemaView } from './SchemaView'
import { useSchema } from '@/hooks/useSchema'
import { useConnectionStore } from '@/stores/connectionStore'

vi.mock('@/hooks/useSchema')
vi.mock('@/stores/connectionStore')

describe('SchemaView', () => {
  beforeEach(() => {
    vi.mocked(useSchema).mockReturnValue({
      schemas: [],
      selectedSchema: null,
      schemaInfo: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      setSchemas: vi.fn(),
      setSelectedSchema: vi.fn(),
      setSchemaInfo: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSearchQuery: vi.fn(),
      loadSchemas: vi.fn(),
      loadSchema: vi.fn(),
      ensureSchemaReady: vi.fn(),
      refreshSchema: vi.fn()
    })

    vi.mocked(useConnectionStore).mockReturnValue({
      connections: [],
      activeId: null,
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

  it('should render schema view', () => {
    const { container } = render(<SchemaView />)
    expect(container).toBeInTheDocument()
  })

  it('should show message when no schema loaded', () => {
    render(<SchemaView />)
    expect(screen.getByText(/No schema/i) || screen.getByText(/Connect to a database/i)).toBeInTheDocument()
  })

  it('should display schema toolbar', () => {
    vi.mocked(useSchema).mockReturnValue({
      schemas: ['public'],
      selectedSchema: 'public',
      schemaInfo: { tables: [] },
      isLoading: false,
      error: null,
      searchQuery: '',
      setSchemas: vi.fn(),
      setSelectedSchema: vi.fn(),
      setSchemaInfo: vi.fn(),
      setLoading: vi.fn(),
      setError: vi.fn(),
      setSearchQuery: vi.fn(),
      loadSchemas: vi.fn(),
      loadSchema: vi.fn(),
      ensureSchemaReady: vi.fn(),
      refreshSchema: vi.fn()
    })

    render(<SchemaView />)
    expect(screen.getByRole('toolbar') || screen.getByPlaceholderText(/search/i)).toBeTruthy()
  })
})
