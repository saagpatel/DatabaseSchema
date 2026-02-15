import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConnectionForm } from './ConnectionForm'

describe('ConnectionForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnTest = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockReset()
    mockOnTest.mockReset()
    mockOnCancel.mockReset()
    mockOnTest.mockResolvedValue('PostgreSQL 14.5')
  })

  it('should render form fields', () => {
    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText(/Connection Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Host/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Port/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Database/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
  })

  it('should populate form with initial values', () => {
    const initial = {
      id: '1',
      name: 'Production DB',
      host: 'db.example.com',
      port: 5432,
      database: 'prod_db',
      username: 'postgres',
      sslMode: 'require' as const,
      color: '#3b82f6',
      isConnected: false
    }

    render(
      <ConnectionForm
        initial={initial}
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('Production DB')).toBeInTheDocument()
    expect(screen.getByDisplayValue('db.example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5432')).toBeInTheDocument()
    expect(screen.getByDisplayValue('prod_db')).toBeInTheDocument()
    expect(screen.getByDisplayValue('postgres')).toBeInTheDocument()
  })

  it('should call onSubmit when form is submitted', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValue(undefined)

    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    // Fill form
    await user.type(screen.getByLabelText(/Connection Name/i), 'Test DB')
    await user.type(screen.getByLabelText(/Host/i), 'localhost')
    await user.clear(screen.getByLabelText(/Port/i))
    await user.type(screen.getByLabelText(/Port/i), '5432')
    await user.type(screen.getByLabelText(/Database/i), 'test_db')
    await user.type(screen.getByLabelText(/Username/i), 'postgres')
    await user.type(screen.getByLabelText(/Password/i), 'password123')

    // Submit
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test DB',
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        username: 'postgres',
        password: 'password123',
        sslMode: 'prefer',
        color: expect.any(String)
      })
    })
  })

  it('should call onTest when test button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    // Fill minimal form
    await user.type(screen.getByLabelText(/Connection Name/i), 'Test DB')
    await user.type(screen.getByLabelText(/Database/i), 'test_db')
    await user.type(screen.getByLabelText(/Username/i), 'postgres')
    await user.type(screen.getByLabelText(/Password/i), 'password123')

    // Click test button
    const testButton = screen.getByRole('button', { name: /test/i })
    await user.click(testButton)

    await waitFor(() => {
      expect(mockOnTest).toHaveBeenCalled()
    })
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()

    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    // Form should not submit due to HTML5 validation
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should disable buttons during submission', async () => {
    const user = userEvent.setup()
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(
      <ConnectionForm
        onSubmit={mockOnSubmit}
        onTest={mockOnTest}
        onCancel={mockOnCancel}
      />
    )

    // Fill minimal form
    await user.type(screen.getByLabelText(/Connection Name/i), 'Test DB')
    await user.type(screen.getByLabelText(/Database/i), 'test_db')
    await user.type(screen.getByLabelText(/Username/i), 'postgres')
    await user.type(screen.getByLabelText(/Password/i), 'password')

    // Submit
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    // Buttons should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })

    // Resolve and verify buttons are enabled again
    resolveSubmit!()
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
  })
})
