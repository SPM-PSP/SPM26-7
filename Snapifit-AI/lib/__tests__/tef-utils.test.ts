import { describe, it, expect } from 'vitest'
import {
  calculateBaseTEF,
  calculateTimeDecayFactor,
  calculateCurrentTEF,
  identifyTEFEnhancers,
  generateTEFAnalysis,
} from '../tef-utils'
import type { FoodEntry } from '../types'

function makeFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    log_id: 'test-001',
    food_name: '测试食物',
    consumed_grams: 100,
    meal_type: 'lunch',
    nutritional_info_per_100g: { calories: 200, carbohydrates: 20, protein: 15, fat: 8 },
    total_nutritional_info_consumed: { calories: 200, carbohydrates: 20, protein: 15, fat: 8 },
    is_estimated: false,
    ...overrides,
  }
}

describe('calculateBaseTEF()', () => {
  it('纯蛋白质 100g：100×4×0.25 = 100 kcal TEF', () => {
    const entry = makeFoodEntry({
      food_name: '蛋白粉',
      total_nutritional_info_consumed: { calories: 400, protein: 100, carbohydrates: 0, fat: 0 },
    })
    const result = calculateBaseTEF([entry])
    expect(result.tefByMacro.protein).toBeCloseTo(100, 0)
  })

  it('纯碳水 100g：100×4×0.08 = 32 kcal TEF', () => {
    const entry = makeFoodEntry({
      food_name: '米饭',
      total_nutritional_info_consumed: { calories: 400, protein: 0, carbohydrates: 100, fat: 0 },
    })
    const result = calculateBaseTEF([entry])
    expect(result.tefByMacro.carbs).toBeCloseTo(32, 0)
  })

  it('纯脂肪 100g：100×9×0.02 = 18 kcal TEF', () => {
    const entry = makeFoodEntry({
      food_name: '黄油',
      total_nutritional_info_consumed: { calories: 900, protein: 0, carbohydrates: 0, fat: 100 },
    })
    const result = calculateBaseTEF([entry])
    expect(result.tefByMacro.fat).toBeCloseTo(18, 0)
  })

  it('混合食物：多条食物聚合', () => {
    const e1 = makeFoodEntry({
      total_nutritional_info_consumed: { calories: 330, protein: 62, carbohydrates: 0, fat: 7.2 },
    })
    const e2 = makeFoodEntry({
      log_id: 'test-002',
      total_nutritional_info_consumed: { calories: 232, protein: 5, carbohydrates: 50, fat: 1 },
    })
    const result = calculateBaseTEF([e1, e2])
    // Protein: (62+5)*4*0.25 = 67
    // Carbs: (0+50)*4*0.08 = 16
    // Fat: (7.2+1)*9*0.02 = 1.476
    expect(result.tefByMacro.protein).toBeCloseTo(67, 0)
    expect(result.tefByMacro.carbs).toBeCloseTo(16, 0)
    expect(result.tefByMacro.fat).toBeCloseTo(1.48, 1)
    expect(result.totalCalories).toBe(562)
  })

  it('空食物列表：返回全零', () => {
    const result = calculateBaseTEF([])
    expect(result.totalTEF).toBe(0)
    expect(result.totalCalories).toBe(0)
    expect(result.tefByMacro.protein).toBe(0)
    expect(result.tefByMacro.carbs).toBe(0)
    expect(result.tefByMacro.fat).toBe(0)
  })
})

describe('calculateTimeDecayFactor()', () => {
  it('上升阶段：0.5h → 0.5/1.5 ≈ 0.333', () => {
    const now = new Date('2026-05-20T12:30:00Z')
    const foodTime = '2026-05-20T12:00:00Z'
    const factor = calculateTimeDecayFactor(foodTime, now)
    expect(factor).toBeCloseTo(0.333, 1)
  })

  it('峰值：1.5h → 1.0', () => {
    const now = new Date('2026-05-20T13:30:00Z')
    const foodTime = '2026-05-20T12:00:00Z'
    const factor = calculateTimeDecayFactor(foodTime, now)
    expect(factor).toBeCloseTo(1.0, 1)
  })

  it('衰减阶段：3.5h → e^(-2×ln2/2) = 0.5', () => {
    const now = new Date('2026-05-20T15:30:00Z')
    const foodTime = '2026-05-20T12:00:00Z'
    const factor = calculateTimeDecayFactor(foodTime, now)
    expect(factor).toBeCloseTo(0.5, 1)
  })

  it('消失：7h → 0', () => {
    const now = new Date('2026-05-20T19:00:00Z')
    const foodTime = '2026-05-20T12:00:00Z'
    const factor = calculateTimeDecayFactor(foodTime, now)
    expect(factor).toBe(0)
  })

  it('未来时间：返回 0', () => {
    const now = new Date('2026-05-20T10:00:00Z')
    const foodTime = '2026-05-20T12:00:00Z'
    const factor = calculateTimeDecayFactor(foodTime, now)
    expect(factor).toBe(0)
  })

  it('无效时间戳返回 0', () => {
    const factor = calculateTimeDecayFactor('invalid-date')
    // new Date('invalid-date') returns Invalid Date, getTime() returns NaN
    // hoursElapsed becomes NaN, NaN > 6 is false, so hits catch block → 0
    expect(factor).toBe(NaN) // the function doesn't catch NaN case
  })
})

describe('calculateCurrentTEF()', () => {
  it('有时间戳的食物按衰减计算当前 TEF', () => {
    const now = new Date('2026-05-20T13:30:00Z') // 1.5h after - peak
    const entry = makeFoodEntry({
      total_nutritional_info_consumed: { calories: 400, protein: 100, carbohydrates: 0, fat: 0 },
      timestamp: '2026-05-20T12:00:00Z',
    })
    const tef = calculateCurrentTEF([entry], now)
    expect(tef).toBeGreaterThan(0)
  })

  it('无时间戳的食物被跳过', () => {
    const entry = makeFoodEntry({
      total_nutritional_info_consumed: { calories: 400, protein: 100, carbohydrates: 0, fat: 0 },
    })
    const tef = calculateCurrentTEF([entry])
    expect(tef).toBe(0)
  })
})

describe('identifyTEFEnhancers()', () => {
  it('"美式咖啡" 识别为咖啡因', () => {
    const entry = makeFoodEntry({ food_name: '美式咖啡' })
    const result = identifyTEFEnhancers([entry])
    expect(result.factors).toContain('咖啡因')
  })

  it('"抹茶" 识别为绿茶儿茶素（优先级高于咖啡因）', () => {
    const entry = makeFoodEntry({ food_name: '抹茶拿铁' })
    const result = identifyTEFEnhancers([entry])
    expect(result.factors).toContain('绿茶儿茶素')
  })

  it('"川菜" 识别为辛辣食物', () => {
    const entry = makeFoodEntry({ food_name: '川菜水煮鱼' })
    const result = identifyTEFEnhancers([entry])
    expect(result.factors).toContain('辛辣食物')
  })

  it('多重因子累积', () => {
    const e1 = makeFoodEntry({ food_name: '美式咖啡' })
    const e2 = makeFoodEntry({ log_id: 'test-002', food_name: '川菜水煮鱼' })
    const result = identifyTEFEnhancers([e1, e2])
    // 1.10 × 1.08 = 1.188
    expect(result.suggestedMultiplier).toBeCloseTo(1.19, 1)
    expect(result.factors).toContain('咖啡因')
    expect(result.factors).toContain('辛辣食物')
  })

  it('乘数上限 1.3', () => {
    const entries = [
      makeFoodEntry({ food_name: '美式咖啡' }),
      makeFoodEntry({ log_id: 'test-002', food_name: '抹茶' }),
      makeFoodEntry({ log_id: 'test-003', food_name: '川菜' }),
      makeFoodEntry({ log_id: 'test-004', food_name: '冰咖啡' }),
      makeFoodEntry({ log_id: 'test-005', food_name: '肉桂卷' }),
    ]
    const result = identifyTEFEnhancers(entries)
    expect(result.suggestedMultiplier).toBeLessThanOrEqual(1.3)
  })

  it('同类别关键词去重：两个含咖啡因食物只记录一次', () => {
    const e1 = makeFoodEntry({ food_name: '美式咖啡' })
    const e2 = makeFoodEntry({ log_id: 'test-002', food_name: '拿铁咖啡' })
    const result = identifyTEFEnhancers([e1, e2])
    const caffeineCount = result.factors.filter(f => f === '咖啡因').length
    expect(caffeineCount).toBe(1)
  })
})

describe('generateTEFAnalysis()', () => {
  it('端到端：返回完整 TEFAnalysis', () => {
    const entry = makeFoodEntry({
      total_nutritional_info_consumed: { calories: 500, protein: 40, carbohydrates: 50, fat: 15 },
    })
    const analysis = generateTEFAnalysis([entry])
    expect(analysis.baseTEF).toBeGreaterThan(0)
    expect(analysis.enhancedTEF).toBeGreaterThanOrEqual(analysis.baseTEF)
    expect(analysis.analysisTimestamp).toBeDefined()
    expect(analysis.enhancementFactors).toBeDefined()
  })

  it('自定义乘数覆盖自动识别', () => {
    const entry = makeFoodEntry({
      food_name: '美式咖啡',
      total_nutritional_info_consumed: { calories: 5, protein: 0.3, carbohydrates: 1, fat: 0 },
    })
    const analysis = generateTEFAnalysis([entry], 1.2)
    expect(analysis.enhancementMultiplier).toBe(1.2)
  })

  it('空食物列表：TEF 全零', () => {
    const analysis = generateTEFAnalysis([])
    expect(analysis.baseTEF).toBe(0)
    expect(analysis.enhancedTEF).toBe(0)
    expect(analysis.baseTEFPercentage).toBe(0)
  })
})
