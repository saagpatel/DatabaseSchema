import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SettingsView } from './SettingsView'

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      theme: 'system',
      query_limit: 1000,
      ollama_endpoint: 'http://localhost:11434',
      ollama_model: 'llama3.2',
      editor_font_size: 14,
      editor_tab_size: 2,
      graph_layout: 'dagre',
      graph_show_columns: true,
      graph_show_types: true
    },
    isLoading: false,
    error: null,
    loadSettings: vi.fn(),
    updateSettings: vi.fn()
  })
}))

describe('SettingsView', () => {
  it('should render settings view', () => {
    const { container } = render(<SettingsView />)
    expect(container).toBeInTheDocument()
  })

  it('should display theme settings', () => {
    render(<SettingsView />)
    expect(screen.getByText(/theme/i)).toBeInTheDocument()
    expect(screen.getByText(/system|light|dark/i)).toBeTruthy()
  })

  it('should display editor settings', () => {
    render(<SettingsView />)
    expect(screen.getByText(/editor|font|tab/i)).toBeTruthy()
  })

  it('should display query limit setting', () => {
    render(<SettingsView />)
    expect(screen.getByText(/query limit|limit/i)).toBeTruthy()
    expect(screen.getByDisplayValue('1000') || screen.getByText('1000')).toBeTruthy()
  })

  it('should display Ollama settings', () => {
    render(<SettingsView />)
    expect(screen.getByText(/ollama/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/localhost:11434|llama/i)).toBeTruthy()
  })

  it('should display graph settings', () => {
    render(<SettingsView />)
    expect(screen.getByText(/graph|layout|dagre|force/i)).toBeTruthy()
  })

  it('should show save button', () => {
    render(<SettingsView />)
    expect(screen.getByRole('button', { name: /save|update/i })).toBeInTheDocument()
  })

  it('should allow changing settings', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    // Find and interact with a setting
    const limitInput = screen.getByDisplayValue('1000')
    await user.clear(limitInput)
    await user.type(limitInput, '500')

    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
  })
})
