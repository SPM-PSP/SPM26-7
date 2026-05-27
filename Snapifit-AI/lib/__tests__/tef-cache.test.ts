import { describe, it, expect, beforeEach } from 'vitest'
import { TEFCacheManager } from '../tef-cache'
import type { FoodEntry } from '../types'

function makeEntry(name: string, grams: number, calories = 200, protein = 15, carbs = 20, fat = 8): FoodEntry {
  return {
    log_id: `id-${name}`,
    food_name: name,
    consumed_grams: grams,
    meal_type: 'lunch',
    nutritional_info_per_100g: { calories, carbohydrates: carbs, protein, fat },
    total_nutritional_info_consumed: { calories, carbohydrates: carbs, protein, fat },
    is_estimated: false,
  }
}

describe('TEFCacheManager — generateFoodEntriesHash()', () => {
  let cache: TEFCacheManager
  beforeEach(() => {
    cache = new TEFCacheManager()
  })

  it('相同食物应生成相同哈希', () => {
    const a1 = [makeEntry('鸡胸肉', 200)]
    const a2 = [makeEntry('鸡胸肉', 200)]
    expect(cache.generateFoodEntriesHash(a1)).toBe(cache.generateFoodEntriesHash(a2))
  })

  it('元素顺序不应影响哈希', () => {
    const ordered = [makeEntry('鸡胸肉', 200), makeEntry('米饭', 150)]
    const reversed = [makeEntry('米饭', 150), makeEntry('鸡胸肉', 200)]
    expect(cache.generateFoodEntriesHash(ordered)).toBe(cache.generateFoodEntriesHash(reversed))
  })

  it('不同克数应生成不同哈希', () => {
    const a = [makeEntry('鸡胸肉', 200)]
    const b = [makeEntry('鸡胸肉', 300)]
    expect(cache.generateFoodEntriesHash(a)).not.toBe(cache.generateFoodEntriesHash(b))
  })

  it('不同食物应生成不同哈希', () => {
    const a = [makeEntry('鸡胸肉', 200)]
    const b = [makeEntry('牛肉', 200)]
    expect(cache.generateFoodEntriesHash(a)).not.toBe(cache.generateFoodEntriesHash(b))
  })

  it('浮点精度应一致（舍入到 2 位小数）', () => {
    const a = [makeEntry('鸡胸肉', 200.000001)]
    const b = [makeEntry('鸡胸肉', 200)]
    expect(cache.generateFoodEntriesHash(a)).toBe(cache.generateFoodEntriesHash(b))
  })
})

describe('TEFCacheManager — 缓存 CRUD', () => {
  let cache: TEFCacheManager
  beforeEach(() => {
    // Don't stub window - use real jsdom window with localStorage
    localStorage.clear()
    cache = new TEFCacheManager()
  })

  const mockAnalysis = {
    baseTEF: 100, baseTEFPercentage: 10, enhancementMultiplier: 1.1,
    enhancedTEF: 110, enhancementFactors: [], analysisTimestamp: new Date().toISOString(),
  }

  it('set + get：缓存命中', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    cache.setCachedAnalysis(entries, mockAnalysis)
    const result = cache.getCachedAnalysis(entries)
    expect(result).toEqual(mockAnalysis)
  })

  it('get 未命中：返回 null', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    const result = cache.getCachedAnalysis(entries)
    expect(result).toBeNull()
  })

  it('空条目数组：get 返回 null', () => {
    const result = cache.getCachedAnalysis([])
    expect(result).toBeNull()
  })

  it('空条目数组：set 不操作', () => {
    cache.setCachedAnalysis([], mockAnalysis)
    const stats = cache.getCacheStats()
    expect(stats.size).toBe(0)
  })

  it('过期缓存应返回 null', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    cache.setCachedAnalysis(entries, mockAnalysis)
    const hash = cache.generateFoodEntriesHash(entries)
    const internalCache = (cache as any).cache
    const cached = internalCache.get(hash)
    if (cached) {
      cached.timestamp = Date.now() - 25 * 60 * 60 * 1000
    }
    const result = cache.getCachedAnalysis(entries)
    expect(result).toBeNull()
  })
})

describe('TEFCacheManager — shouldAnalyzeTEF()', () => {
  let cache: TEFCacheManager

  beforeEach(() => {
    localStorage.clear()
    cache = new TEFCacheManager()
  })

  it('相同哈希 → false', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    const hash = cache.generateFoodEntriesHash(entries)
    expect(cache.shouldAnalyzeTEF(entries, hash)).toBe(false)
  })

  it('哈希变化且有缓存 → false（直接使用缓存）', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    cache.setCachedAnalysis(entries, {
      baseTEF: 100, baseTEFPercentage: 10, enhancementMultiplier: 1.0,
      enhancedTEF: 100, enhancementFactors: [], analysisTimestamp: new Date().toISOString(),
    })
    const result = cache.shouldAnalyzeTEF(entries, 'old-hash')
    expect(result).toBe(false)
  })

  it('哈希变化且无缓存 → true', () => {
    const entries = [makeEntry('鸡胸肉', 200)]
    const result = cache.shouldAnalyzeTEF(entries, 'old-hash')
    expect(result).toBe(true)
  })

  it('空条目 → false', () => {
    const result = cache.shouldAnalyzeTEF([], 'some-hash')
    expect(result).toBe(false)
  })
})

describe('TEFCacheManager — 持久化与清理', () => {
  it('localStorage 持久化与恢复', () => {
    localStorage.clear()
    const cache1 = new TEFCacheManager()
    const entries = [makeEntry('鸡胸肉', 200)]
    const mockAnalysis = {
      baseTEF: 100, baseTEFPercentage: 10, enhancementMultiplier: 1.0,
      enhancedTEF: 100, enhancementFactors: [], analysisTimestamp: new Date().toISOString(),
    }
    cache1.setCachedAnalysis(entries, mockAnalysis)

    const cache2 = new TEFCacheManager()
    const result = cache2.getCachedAnalysis(entries)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.baseTEF).toBe(100)
    }
  })

  it('clearCache：清空 Map + localStorage key', () => {
    localStorage.clear()
    const cache = new TEFCacheManager()
    const entries = [makeEntry('鸡胸肉', 200)]
    cache.setCachedAnalysis(entries, {
      baseTEF: 100, baseTEFPercentage: 10, enhancementMultiplier: 1.0,
      enhancedTEF: 100, enhancementFactors: [], analysisTimestamp: new Date().toISOString(),
    })
    cache.clearCache()
    expect(cache.getCacheStats().size).toBe(0)
  })

  it('getCacheStats：正确返回 size 和 oldestEntry', () => {
    localStorage.clear()
    const cache = new TEFCacheManager()
    const entries = [makeEntry('鸡胸肉', 200)]
    cache.setCachedAnalysis(entries, {
      baseTEF: 100, baseTEFPercentage: 10, enhancementMultiplier: 1.0,
      enhancedTEF: 100, enhancementFactors: [], analysisTimestamp: new Date().toISOString(),
    })
    const stats = cache.getCacheStats()
    expect(stats.size).toBe(1)
    expect(stats.oldestEntry).toBeGreaterThan(0)
  })
})
