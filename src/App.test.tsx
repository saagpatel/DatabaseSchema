import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from './App'
import { resetMocks, mockInvoke } from '@/test/mocks/tauri'

// Mock hooks to avoid loading real data
vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn()
}))

describe('App', () => {
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

  afterEach(() => {
    resetMocks()
  })

  it('should render without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeInTheDocument()
  })

  it('should display welcome view when no connections', () => {
    render(<App />)
    expect(screen.getByText(/Database Schema Visualizer/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Get started by creating your first database connection/i)
    ).toBeInTheDocument()
  })

  it('should show quick start instructions', () => {
    render(<App />)
    expect(screen.getByText(/Quick Start/i)).toBeInTheDocument()
    expect(screen.getByText(/Click "Add" in the sidebar to create a connection/i)).toBeInTheDocument()
  })

  it('should display feature cards', () => {
    render(<App />)
    expect(screen.getByText(/Schema/i)).toBeInTheDocument()
    expect(screen.getByText(/Interactive ERD with table relationships/i)).toBeInTheDocument()
    expect(screen.getByText(/Query/i)).toBeInTheDocument()
    expect(screen.getByText(/AI/i)).toBeInTheDocument()
  })

  it('should render error boundary', () => {
    const { container } = render(<App />)
    // Error boundary should wrap the app
    expect(container.querySelector('.error-boundary, [role="alert"]')).toBeTruthy()
  })
})
