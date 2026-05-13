import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DailyStatus } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 每日状态数值对应的文字描述
const statusLevels = {
  1: "很差",
  2: "较差",
  3: "一般",
  4: "良好",
  5: "很好",
  6: "极佳"
} as const

// 压力水平的反向描述（数值越高压力越大）
const stressLevels = {
  1: "很低",
  2: "较低",
  3: "一般",
  4: "较高",
  5: "很高",
  6: "极高"
} as const

// 格式化每日状态数据，包含数值和文字描述
export function formatDailyStatusForAI(dailyStatus: DailyStatus | undefined): string {
  if (!dailyStatus) {
    return "未记录"
  }

  const formatStatusItem = (value: number, label: string, isStress = false) => {
    const description = isStress
      ? (stressLevels[value as keyof typeof stressLevels] || "未知")
      : (statusLevels[value as keyof typeof statusLevels] || "未知")
    return `${label}: ${value}/6(${description})`
  }

  const statusItems = [
    formatStatusItem(dailyStatus.stress, "压力水平", true),
    formatStatusItem(dailyStatus.mood, "心情状态"),
    formatStatusItem(dailyStatus.health, "健康状况"),
  ]

  if (dailyStatus.sleepQuality) {
    statusItems.push(formatStatusItem(dailyStatus.sleepQuality, "睡眠质量"))
  }

  // 添加睡眠时间信息
  if (dailyStatus.bedTime && dailyStatus.wakeTime) {
    statusItems.push(`睡眠时间: ${dailyStatus.bedTime} - ${dailyStatus.wakeTime}`)
  }

  // 添加备注信息
  const notes = []
  if (dailyStatus.stressNotes) notes.push(`压力备注: ${dailyStatus.stressNotes}`)
  if (dailyStatus.moodNotes) notes.push(`心情备注: ${dailyStatus.moodNotes}`)
  if (dailyStatus.healthNotes) notes.push(`健康备注: ${dailyStatus.healthNotes}`)
  if (dailyStatus.sleepNotes) notes.push(`睡眠备注: ${dailyStatus.sleepNotes}`)

  let result = statusItems.join(", ")
  if (notes.length > 0) {
    result += `\n备注: ${notes.join("; ")}`
  }

  return result
}
