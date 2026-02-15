import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { resetMocks } from './mocks/tauri'

// Wrapper component that provides all necessary context/providers
const TestWrapper = ({ children }: { children: ReactElement }) => {
  return (
    // Wrap with any providers (theme provider, store provider, etc.)
    // For this app, stores are global singletons so no provider needed
    <>{children}</>
  )
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options })
}

// Re-export everything from React Testing Library for convenience
export * from '@testing-library/react'
export { renderWithProviders as render }
