import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiView } from './AiView'
import { useConnectionStore } from '@/stores/connectionStore'

vi.mock('@/stores/connectionStore')
vi.mock('@/hooks/useAi', () => ({
  useAi: () => ({
    suggestions: [],
    ollamaStatus: { online: false, models: [], error: null },
    isLoading: false,
    error: null,
    checkOllamaStatus: vi.fn(),
    getSuggestion: vi.fn(),
    loadHistory: vi.fn(),
    acceptSuggestion: vi.fn(),
    clearHistory: vi.fn()
  })
}))

describe('AiView', () => {
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

  it('should render AI view', () => {
    const { container } = render(<AiView />)
    expect(container).toBeInTheDocument()
  })

  it('should show Ollama status indicator', () => {
    render(<AiView />)
    expect(screen.getByText(/ollama|status|offline|online/i)).toBeTruthy()
  })

  it('should display suggestion types', () => {
    render(<AiView />)
    expect(
      screen.getByText(/query optimization|index suggestion|schema review|general/i) ||
      screen.getByRole('button', { name: /suggest/i })
    ).toBeTruthy()
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

    render(<AiView />)
    expect(screen.getByText(/connect to a database/i) || screen.getByText(/no connection/i)).toBeTruthy()
  })
})
