import { describe, expect, it } from 'vitest'
import {
  createTimer,
  elapsedMs,
  finishTimer,
  formatDuration,
  isRunning,
  startTimer,
} from '../src/core/timer'

describe('timer', () => {
  it('未启动时已用时为 0', () => {
    const t = createTimer()
    expect(elapsedMs(t, 10_000)).toBe(0)
    expect(isRunning(t)).toBe(false)
  })

  it('启动后按 now 计算已用时', () => {
    const t = createTimer()
    startTimer(t, 1_000)
    expect(t.startEpoch).toBe(1_000)
    expect(elapsedMs(t, 4_500)).toBe(3_500)
    expect(isRunning(t)).toBe(true)
  })

  it('重复 startTimer 不改变起点', () => {
    const t = createTimer()
    startTimer(t, 1_000)
    startTimer(t, 9_999)
    expect(t.startEpoch).toBe(1_000)
  })

  it('finishTimer 停表，之后已用时固定', () => {
    const t = createTimer()
    startTimer(t, 1_000)
    finishTimer(t, 5_000)
    expect(elapsedMs(t, 999_999)).toBe(4_000)
    expect(isRunning(t)).toBe(false)
    finishTimer(t, 6_000) // 再次调用无效
    expect(t.finishEpoch).toBe(5_000)
  })

  it('未启动时 finishTimer 无效', () => {
    const t = createTimer()
    finishTimer(t, 5_000)
    expect(t.finishEpoch).toBeNull()
  })

  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(9_000)).toBe('00:09')
    expect(formatDuration(72_000)).toBe('01:12')
    expect(formatDuration(3_661_000)).toBe('1:01:01')
  })
})
