import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultsTable } from './ResultsTable'

describe('ResultsTable', () => {
  const mockResult = {
    rows: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' }
    ],
    columnNames: ['id', 'name', 'email'],
    rowCount: 2,
    executionTimeMs: 145,
    isLimited: false
  }

  it('should render table with data', () => {
    render(<ResultsTable result={mockResult} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('should display column headers', () => {
    render(<ResultsTable result={mockResult} />)
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('should show row count', () => {
    render(<ResultsTable result={mockResult} />)
    expect(screen.getByText(/2 row/i)).toBeInTheDocument()
  })

  it('should show execution time', () => {
    render(<ResultsTable result={mockResult} />)
    expect(screen.getByText(/145.*ms/i)).toBeInTheDocument()
  })

  it('should handle empty results', () => {
    const emptyResult = {
      rows: [],
      columnNames: ['id', 'name'],
      rowCount: 0,
      executionTimeMs: 50,
      isLimited: false
    }

    render(<ResultsTable result={emptyResult} />)
    expect(screen.getByText(/no rows|0 row/i)).toBeInTheDocument()
  })

  it('should show limited indicator when results are limited', () => {
    const limitedResult = {
      ...mockResult,
      isLimited: true
    }

    render(<ResultsTable result={limitedResult} />)
    expect(screen.getByText(/limited|showing/i)).toBeTruthy()
  })
})
