import { describe, expect, it } from 'vitest'
import { pickInitialPuzzleId, pickNextPuzzleId } from '../src/core/puzzleSelect'

const IDS = ['a', 'b', 'c']

describe('pickInitialPuzzleId', () => {
  it('按 randomInt 的下标取', () => {
    expect(pickInitialPuzzleId(IDS, () => 0)).toBe('a')
    expect(pickInitialPuzzleId(IDS, () => 2)).toBe('c')
  })

  it('空库抛错', () => {
    expect(() => pickInitialPuzzleId([], () => 0)).toThrow()
  })
})

describe('pickNextPuzzleId', () => {
  it('从排除当前后的候选里取', () => {
    // 候选为 ['a', 'c']
    expect(pickNextPuzzleId(IDS, 'b', () => 0)).toBe('a')
    expect(pickNextPuzzleId(IDS, 'b', () => 1)).toBe('c')
  })

  it('永不返回当前 puzzleId（遍历所有下标）', () => {
    for (const current of IDS) {
      for (let i = 0; i < IDS.length - 1; i++) {
        expect(pickNextPuzzleId(IDS, current, () => i)).not.toBe(current)
      }
    }
  })

  it('库中仅一个谜题时返回当前', () => {
    expect(pickNextPuzzleId(['only'], 'only', () => 0)).toBe('only')
  })

  it('当前 id 不在库中时，从全库取', () => {
    expect(pickNextPuzzleId(IDS, 'zzz', () => 1)).toBe('b')
  })
})
