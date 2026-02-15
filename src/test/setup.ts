import "@testing-library/jest-dom/vitest";
import { beforeEach } from 'vitest'
import { mockInvoke, resetMocks } from './mocks/tauri'

// Global setup for all tests
beforeEach(() => {
  resetMocks()
  // Default mocks for common commands
  mockInvoke('list_connections', { success: true, data: [] })
  mockInvoke('get_settings', { success: true, data: {
    theme: 'system',
    query_limit: 1000,
    ollama_endpoint: 'http://localhost:11434',
    ollama_model: 'llama3.2',
    editor_font_size: 14,
    editor_tab_size: 2,
    graph_layout: 'dagre',
    graph_show_columns: true,
    graph_show_types: true
  }})
})
