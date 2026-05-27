import type { FoodEntry, ExerciseEntry, DailyLog, DailyStatus, DailySummaryType, UserProfile, TEFAnalysis } from './types'

// ============ 通用测试数据工厂 ============

export function createMockFoodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    log_id: 'food-001',
    food_name: '鸡胸肉',
    consumed_grams: 200,
    meal_type: 'lunch',
    nutritional_info_per_100g: {
      calories: 165,
      carbohydrates: 0,
      protein: 31,
      fat: 3.6,
    },
    total_nutritional_info_consumed: {
      calories: 330,
      carbohydrates: 0,
      protein: 62,
      fat: 7.2,
    },
    is_estimated: false,
    ...overrides,
  }
}

export function createMockExerciseEntry(overrides: Partial<ExerciseEntry> = {}): ExerciseEntry {
  return {
    log_id: 'exercise-001',
    exercise_name: '跑步',
    exercise_type: 'cardio',
    duration_minutes: 30,
    distance_km: 5,
    estimated_mets: 8.3,
    user_weight: 70,
    calories_burned_estimated: 290,
    muscle_groups: ['腿部', '核心'],
    is_estimated: false,
    ...overrides,
  }
}

export function createMockDailyStatus(overrides: Partial<DailyStatus> = {}): DailyStatus {
  return {
    stress: 3,
    mood: 4,
    health: 3,
    bedTime: '23:00',
    wakeTime: '07:00',
    sleepQuality: 4,
    ...overrides,
  }
}

export function createMockDailySummary(overrides: Partial<DailySummaryType> = {}): DailySummaryType {
  return {
    totalCaloriesConsumed: 1800,
    totalCaloriesBurned: 400,
    macros: {
      carbs: 180,
      protein: 120,
      fat: 60,
    },
    micronutrients: {},
    ...overrides,
  }
}

export function createMockDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: '2026-05-20',
    foodEntries: [createMockFoodEntry()],
    exerciseEntries: [createMockExerciseEntry()],
    summary: createMockDailySummary(),
    weight: 70,
    activityLevel: 'moderate',
    ...overrides,
  }
}

export function createMockUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    ...overrides,
  }
}

export function createMockTEFAnalysis(overrides: Partial<TEFAnalysis> = {}): TEFAnalysis {
  return {
    baseTEF: 180,
    baseTEFPercentage: 10,
    enhancementMultiplier: 1.0,
    enhancedTEF: 180,
    enhancementFactors: [],
    analysisTimestamp: '2026-05-20T12:00:00.000Z',
    ...overrides,
  }
}

// ============ Mock 辅助 ============

export function mockGlobalFetch(responseData: any, status = 200) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
    headers: new Headers(),
    body: null,
  })
  vi.stubGlobal('fetch', mockFetch)
  return mockFetch
}

export function restoreGlobalFetch() {
  vi.unstubAllGlobals()
}
