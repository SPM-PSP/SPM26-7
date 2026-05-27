import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockStore: Record<string, any> = {}

// Mock window.indexedDB for the direct access in loadMemories
const mockCursor = { key: null as any, value: null as any, continue: vi.fn() }
const cursorReq: any = { onsuccess: null, onerror: null }
Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: vi.fn(() => {
      const req: any = { onupgradeneeded: null, onsuccess: null, onerror: null,
        result: {
          objectStoreNames: { contains: () => false, length: 0 },
          transaction: () => ({ objectStore: () => ({ openCursor: () => cursorReq }) }),
          close: () => {},
        } }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
  },
  writable: true, configurable: true,
})

vi.mock('../use-indexed-db', () => ({
  useIndexedDB: vi.fn(() => ({
    getData: vi.fn((key: string) => Promise.resolve(mockStore[key] || null)),
    saveData: vi.fn((key: string, data: any) => {
      mockStore[key] = data
      return Promise.resolve()
    }),
    deleteData: vi.fn((key: string) => {
      delete mockStore[key]
      return Promise.resolve()
    }),
    clearAllData: vi.fn(() => {
      Object.keys(mockStore).forEach(k => delete mockStore[k])
      return Promise.resolve()
    }),
    isLoading: false,
    isInitializing: false,
    error: null,
  })),
}))

import { useAIMemory } from '../use-ai-memory'

describe('useAIMemory()', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('getMemory：不存在的键返回 null', () => {
    const { result } = renderHook(() => useAIMemory())
    expect(result.current.getMemory('ghost')).toBeNull()
  })

  it('updateMemory：超过 500 字应抛出异常', async () => {
    const { result } = renderHook(() => useAIMemory())
    await expect(
      result.current.updateMemory({ expertId: 'n', newContent: 'x'.repeat(501) })
    ).rejects.toThrow()
  })

  it('updateMemory：有效输入不抛异常', async () => {
    const { result } = renderHook(() => useAIMemory())
    // Should not throw
    await expect(
      result.current.updateMemory({ expertId: 'nutrition', newContent: '测试' })
    ).resolves.toBeUndefined()
  })

  it('clearMemory 和 clearAllMemories 不抛异常', async () => {
    const { result } = renderHook(() => useAIMemory())
    await expect(result.current.clearMemory('test')).resolves.toBeUndefined()
    await expect(result.current.clearAllMemories()).resolves.toBeUndefined()
  })
})
