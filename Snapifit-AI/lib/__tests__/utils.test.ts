import { describe, it, expect } from 'vitest'
import { cn, formatDailyStatusForAI } from '../utils'
import type { DailyStatus } from '../types'

describe('cn()', () => {
  it('应合并多个类名', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toContain('px-2')
    expect(result).toContain('py-1')
  })

  it('应处理后者的冲突覆盖', () => {
    const result = cn('px-2 py-1', 'py-2')
    expect(result).toContain('px-2')
    expect(result).toContain('py-2')
    expect(result).not.toContain('py-1')
  })
})

describe('formatDailyStatusForAI()', () => {
  it('应正确格式化完整的每日状态', () => {
    const status: DailyStatus = {
      stress: 3,
      mood: 4,
      health: 3,
      sleepQuality: 4,
      bedTime: '23:00',
      wakeTime: '07:00',
    }
    const result = formatDailyStatusForAI(status)
    expect(result).toContain('压力水平: 3/6(一般)')
    expect(result).toContain('心情状态: 4/6(良好)')
    expect(result).toContain('健康状况: 3/6(一般)')
    expect(result).toContain('睡眠质量: 4/6(良好)')
    expect(result).toContain('睡眠时间: 23:00 - 07:00')
  })

  it('压力高数值应显示反向描述', () => {
    const status: DailyStatus = { stress: 5, mood: 3, health: 3 }
    const result = formatDailyStatusForAI(status)
    expect(result).toContain('压力水平: 5/6(很高)')
  })

  it('压力低数值应显示反向描述', () => {
    const status: DailyStatus = { stress: 1, mood: 3, health: 3 }
    const result = formatDailyStatusForAI(status)
    expect(result).toContain('压力水平: 1/6(很低)')
  })

  it('undefined 状态应返回"未记录"', () => {
    const result = formatDailyStatusForAI(undefined)
    expect(result).toBe('未记录')
  })

  it('应正确显示睡眠时间', () => {
    const status: DailyStatus = { stress: 3, mood: 3, health: 3, bedTime: '23:00', wakeTime: '07:00' }
    const result = formatDailyStatusForAI(status)
    expect(result).toContain('睡眠时间: 23:00 - 07:00')
  })

  it('应正确显示备注信息', () => {
    const status: DailyStatus = {
      stress: 3, mood: 3, health: 3,
      stressNotes: '工作压力大',
      sleepNotes: '失眠',
    }
    const result = formatDailyStatusForAI(status)
    expect(result).toContain('压力备注: 工作压力大')
    expect(result).toContain('睡眠备注: 失眠')
  })
})
