import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useIndexedDB } from '../use-indexed-db'

function createMockIDB() {
  const data: Record<string, any> = {}

  const storeOps = {
    get: vi.fn(function (this: any, key: string) {
      const req: any = { onsuccess: null, onerror: null, result: data[key] }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
    put: vi.fn(function (this: any, value: any, key: string) {
      data[key] = value
      const req: any = { onsuccess: null, onerror: null }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
    delete: vi.fn(function (this: any, key: string) {
      delete data[key]
      const req: any = { onsuccess: null, onerror: null }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
    clear: vi.fn(function (this: any) {
      Object.keys(data).forEach(k => delete data[k])
      const req: any = { onsuccess: null, onerror: null }
      setTimeout(() => { if (req.onsuccess) req.onsuccess({ target: req }) }, 0)
      return req
    }),
  }

  const mockDB = {
    transaction: vi.fn(() => ({ objectStore: vi.fn(() => storeOps) })),
    objectStoreNames: { contains: vi.fn(() => true), length: 2 },
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

describe('useIndexedDB()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('初始化成功后 isInitializing 变为 false', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    expect(result.current.isInitializing).toBe(true)
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('saveData + getData：put 后 get 返回正确值', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    await result.current.saveData('2026-05-20', { calories: 1800 })
    const data = await result.current.getData('2026-05-20')
    expect(data).toEqual({ calories: 1800 })
  })

  it('getData 读取不存在键返回 undefined', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    const data = await result.current.getData('nonexistent')
    expect(data).toBeUndefined()
  })

  it('saveData 覆盖已有键', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    await result.current.saveData('key', { v: 1 })
    await result.current.saveData('key', { v: 2 })
    const data = await result.current.getData('key')
    expect(data).toEqual({ v: 2 })
  })

  it('deleteData：删除后 get 返回 undefined', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    await result.current.saveData('temp', { x: 1 })
    await result.current.deleteData('temp')
    const data = await result.current.getData('temp')
    expect(data).toBeUndefined()
  })

  it('clearAllData：清空后数据不可读', async () => {
    createMockIDB()
    const { result } = renderHook(() => useIndexedDB('healthLogs'))
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    await result.current.saveData('a', { v: 1 })
    await result.current.saveData('b', { v: 2 })
    await result.current.clearAllData()
    expect(await result.current.getData('a')).toBeUndefined()
    expect(await result.current.getData('b')).toBeUndefined()
  })
})
