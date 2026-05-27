import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useExportReminder } from '../use-export-reminder'

function mockExportDB(logs: any[]) {
  const mockStore = {
    getAll: vi.fn(() => {
      const req: any = { onsuccess: null, onerror: null, result: logs }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
  }

  const mockDB = {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => mockStore),
    })),
    objectStoreNames: { contains: vi.fn(() => true), length: 1 },
    close: vi.fn(),
  }

  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      const req: any = { onupgradeneeded: null, onsuccess: null, onerror: null, result: mockDB }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
  })
}

describe('useExportReminder()', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('空数据库：shouldRemind = false', async () => {
    mockExportDB([])
    const { result } = renderHook(() => useExportReminder())
    // Wait for async IDB operations to resolve
    await vi.waitFor(() => {
      expect(result.current.hasEnoughData).toBe(false)
      expect(result.current.shouldRemind).toBe(false)
    }, { timeout: 3000 })
  }, 5000)

  it('从未导出且有数据：shouldRemind = true', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    mockExportDB([
      { date: today.toISOString().split('T')[0], foodEntries: [{ log_id: '1' }], exerciseEntries: [], summary: {} },
      { date: yesterday.toISOString().split('T')[0], foodEntries: [{ log_id: '2' }], exerciseEntries: [], summary: {} },
    ])

    const { result } = renderHook(() => useExportReminder())
    await vi.waitFor(() => {
      expect(result.current.hasEnoughData).toBe(true)
      expect(result.current.shouldRemind).toBe(true)
    }, { timeout: 3000 })
  }, 5000)
})
