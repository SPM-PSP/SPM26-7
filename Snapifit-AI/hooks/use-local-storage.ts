"use client"

import { useState, useCallback } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // 状态用于在组件中存储值
  const [storedValue, setStoredValue] = useState<T>(() => {
    // 在初始化时就从 localStorage 读取值
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // 返回一个包装版的 setState 函数，同时更新 localStorage
  const setValue = useCallback(
    (value: T) => {
      try {
        // 允许值是一个函数，就像 React 的 setState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // 保存到 state
        setStoredValue(valueToStore)

        // 保存到 localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue],
  )

  return [storedValue, setValue]
}
