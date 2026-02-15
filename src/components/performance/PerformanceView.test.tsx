import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PerformanceView } from './PerformanceView'
import { useConnectionStore } from '@/stores/connectionStore'

vi.mock('@/stores/connectionStore')
vi.mock('@/hooks/usePerformance', () => ({
  usePerformance: () => ({
    tableStats: null,
    indexStats: null,
    isLoading: false,
    error: null,
    loadTableStats: vi.fn(),
    loadIndexStats: vi.fn()
  })
}))

describe('PerformanceView', () => {
  beforeEach(() => {
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

  it('should render performance view', () => {
    const { container } = render(<PerformanceView />)
    expect(container).toBeInTheDocument()
  })

  it('should show tabs for different stats', () => {
    render(<PerformanceView />)
    expect(screen.getByText(/table|index/i)).toBeTruthy()
  })

  it('should show message when not connected', () => {
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

    render(<PerformanceView />)
    expect(screen.getByText(/connect to a database/i) || screen.getByText(/no connection/i)).toBeTruthy()
  })
})
