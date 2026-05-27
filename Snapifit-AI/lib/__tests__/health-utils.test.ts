import { describe, it, expect } from 'vitest'
import {
  calculateMifflinStJeorBMR,
  calculateHarrisBenedictBMR,
  calculateKatchMcArdleBMR,
  calculateTDEE,
  calculateMetabolicRates,
} from '../health-utils'
import type { UserProfile } from '../types'

describe('calculateMifflinStJeorBMR()', () => {
  it('男性：70kg/170cm/30y → 约 1655 kcal', () => {
    const bmr = calculateMifflinStJeorBMR(70, 170, 30, 'male')
    // 10*70 + 6.25*170 - 5*30 + 5 = 700 + 1062.5 - 150 + 5 = 1617.5
    expect(bmr).toBeCloseTo(1617.5, 0)
  })

  it('女性：70kg/170cm/30y → 约 1489 kcal', () => {
    const bmr = calculateMifflinStJeorBMR(70, 170, 30, 'female')
    // 10*70 + 6.25*170 - 5*30 - 161 = 700 + 1062.5 - 150 - 161 = 1451.5
    expect(bmr).toBeCloseTo(1451.5, 0)
  })

  it('other 性别：取男女平均值', () => {
    const male = calculateMifflinStJeorBMR(70, 170, 30, 'male')
    const female = calculateMifflinStJeorBMR(70, 170, 30, 'female')
    const other = calculateMifflinStJeorBMR(70, 170, 30, 'other')
    expect(other).toBeCloseTo((male + female) / 2, 0)
  })
})

describe('calculateHarrisBenedictBMR()', () => {
  it('男性：70kg/170cm/30y', () => {
    const bmr = calculateHarrisBenedictBMR(70, 170, 30, 'male')
    // 13.397*70 + 4.799*170 - 5.677*30 + 88.362
    // = 937.79 + 815.83 - 170.31 + 88.362 = 1671.67
    expect(bmr).toBeCloseTo(1671.67, 0)
  })

  it('女性：70kg/170cm/30y', () => {
    const bmr = calculateHarrisBenedictBMR(70, 170, 30, 'female')
    // 9.247*70 + 3.098*170 - 4.33*30 + 447.593
    // = 647.29 + 526.66 - 129.9 + 447.593 = 1491.64
    expect(bmr).toBeCloseTo(1491.64, 0)
  })

  it('other 性别：取男女平均值', () => {
    const male = calculateHarrisBenedictBMR(70, 170, 30, 'male')
    const female = calculateHarrisBenedictBMR(70, 170, 30, 'female')
    const other = calculateHarrisBenedictBMR(70, 170, 30, 'other')
    expect(other).toBeCloseTo((male + female) / 2, 0)
  })
})

describe('calculateKatchMcArdleBMR()', () => {
  it('LBM=56kg → 370 + 21.6*56 = 1579.6 kcal', () => {
    const bmr = calculateKatchMcArdleBMR(56)
    expect(bmr).toBeCloseTo(1579.6, 0)
  })

  it('LBM ≤ 0 返回 0', () => {
    expect(calculateKatchMcArdleBMR(0)).toBe(0)
    expect(calculateKatchMcArdleBMR(-5)).toBe(0)
  })
})

describe('calculateTDEE()', () => {
  it('sedentary → BMR × 1.2', () => {
    const tdee = calculateTDEE(1500, 'sedentary')
    expect(tdee).toBeCloseTo(1800, 0)
  })

  it('moderate（默认）→ BMR × 1.55', () => {
    const tdee = calculateTDEE(1500, 'moderate')
    expect(tdee).toBeCloseTo(2325, 0)
  })

  it('非常活跃 → BMR × 1.9', () => {
    const tdee = calculateTDEE(1500, 'very_active')
    expect(tdee).toBeCloseTo(2850, 0)
  })

  it('未知活动水平回退默认 1.55', () => {
    const tdee = calculateTDEE(1500, 'unknown_level')
    expect(tdee).toBeCloseTo(2325, 0)
  })

  it('带 additionalTEF 时加上', () => {
    const tdee = calculateTDEE(1500, 'moderate', 50)
    expect(tdee).toBeCloseTo(2375, 0) // 1500*1.55 + 50
  })
})

describe('calculateMetabolicRates()', () => {
  const baseProfile: UserProfile = {
    weight: 70, height: 170, age: 30, gender: 'male',
    activityLevel: 'moderate', goal: 'maintain',
  }

  it('端到端：完整参数返回 {bmr, tdee}', () => {
    const result = calculateMetabolicRates(baseProfile, {})
    expect(result).toBeDefined()
    expect(result!.bmr).toBeGreaterThan(1000)
    expect(result!.tdee).toBeGreaterThan(result!.bmr)
  })

  it('优先使用当日体重', () => {
    const result = calculateMetabolicRates(baseProfile, { weight: 80 })
    // 80kg 比 70kg 的 BMR 大
    const result70 = calculateMetabolicRates(baseProfile, { weight: 70 })
    expect(result!.bmr).toBeGreaterThan(result70!.bmr!)
  })

  it('当日体重为 0 时回退到用户配置', () => {
    const result = calculateMetabolicRates(baseProfile, { weight: 0 })
    expect(result).toBeDefined()
  })

  it('缺少必要参数时返回 undefined', () => {
    const incompleteProfile: UserProfile = {
      weight: 0, height: 0, age: 0, gender: '',
      activityLevel: '', goal: '',
    }
    const result = calculateMetabolicRates(incompleteProfile, {})
    expect(result).toBeUndefined()
  })

  it('使用 Katch-McArdle 路径（leanBodyMass + 有效体脂率）', () => {
    const profile: UserProfile = {
      ...baseProfile,
      bmrCalculationBasis: 'leanBodyMass',
      bodyFatPercentage: 20,
    }
    const result = calculateMetabolicRates(profile, { weight: 70 })
    expect(result).toBeDefined()
    expect(result!.bmr).toBeGreaterThan(0)
  })

  it('leanBodyMass 但无效体脂率回退到总体重计算', () => {
    const profile: UserProfile = {
      ...baseProfile,
      bmrCalculationBasis: 'leanBodyMass',
      bodyFatPercentage: undefined,
    }
    const result = calculateMetabolicRates(profile, { weight: 70 })
    expect(result).toBeDefined()
  })

  it('Harris-Benedict 公式选择', () => {
    const profile: UserProfile = {
      ...baseProfile,
      bmrFormula: 'harris-benedict',
    }
    const result = calculateMetabolicRates(profile, { weight: 70 })
    expect(result).toBeDefined()
    // HB 公式结果应不同于 MSJ
    const msjResult = calculateMetabolicRates(
      { ...baseProfile, bmrFormula: 'mifflin-st-jeor' },
      { weight: 70 }
    )
    expect(result!.bmr).not.toBe(msjResult!.bmr)
  })
})
