import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDateRecords } from '../use-date-records'

function mockDateRecords(records: Set<string>) {
  const mockDB = {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        getAll: vi.fn(() => {
          const req: any = {
            onsuccess: null, onerror: null,
            result: Array.from(records).map(date => ({
              date, foodEntries: [{ log_id: '1' }],
              exerciseEntries: [], summary: {},
            })),
          }
          setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
          return req
        }),
      })),
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

describe('useDateRecords()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hasRecord：有记录返回 true', async () => {
    mockDateRecords(new Set(['2026-05-20']))
    const { result } = renderHook(() => useDateRecords())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasRecord(new Date('2026-05-20'))).toBe(true)
  })

  it('hasRecord：无记录返回 false', async () => {
    mockDateRecords(new Set(['2026-05-20']))
    const { result } = renderHook(() => useDateRecords())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasRecord(new Date('2026-05-25'))).toBe(false)
  })
})
