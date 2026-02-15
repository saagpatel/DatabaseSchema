import { vi } from 'vitest'

// Mock @tauri-apps/api/core module
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string, _payload?: any) => {
    // Return mock based on command name
    // Default: success response
    return { success: true, data: null }
  })
}))

// Helper to set mock return value for specific command
export function mockInvoke(command: string, response: any) {
  const { invoke } = require('@tauri-apps/api/core')
  invoke.mockImplementation(async (cmd: string, _payload?: any) => {
    if (cmd === command) return response
    return { success: true, data: null }
  })
}

export function mockInvokeError(command: string, error: string) {
  mockInvoke(command, { success: false, error })
}

// Reset mocks after each test
export function resetMocks() {
  vi.clearAllMocks()
}
