import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../use-local-storage'

function setupLocalStorageMock(initialData: Record<string, string> = {}) {
  const store = { ...initialData }
  const mock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  }
  vi.stubGlobal('localStorage', mock)
  // Ensure window is defined for SSR check
  vi.stubGlobal('window', { localStorage: mock })
  return { store, mock }
}

describe('useLocalStorage()', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('首次读取空 localStorage，返回 initialValue', () => {
    setupLocalStorageMock({})
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultVal'))
    expect(result.current[0]).toBe('defaultVal')
  })

  it('读取已存在的值，返回解析后的 JSON', () => {
    setupLocalStorageMock({ testKey: JSON.stringify({ name: 'Alice' }) })
    const { result } = renderHook(() => useLocalStorage('testKey', {}))
    expect(result.current[0]).toEqual({ name: 'Alice' })
  })

  it('JSON 解析异常时降级返回 initialValue', () => {
    setupLocalStorageMock({ testKey: '{broken-json' })
    const { result } = renderHook(() => useLocalStorage('testKey', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('setValue 写入后 state 和 localStorage 同步', () => {
    const { mock } = setupLocalStorageMock({})
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'))

    act(() => {
      result.current[1]('newValue')
    })

    expect(result.current[0]).toBe('newValue')
    expect(mock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('newValue'))
  })

  it('函数式更新：setValue(prev => ...)', () => {
    setupLocalStorageMock({})
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1]((prev: number) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
  })
})
