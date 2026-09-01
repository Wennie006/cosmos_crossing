// 候选字符集合（字盘）的生成。纯 TS。规则见 docs/puzzle-generation.md §7。

import { DEFAULTS, cellKey } from './puzzleModel'
import type { DerivedPuzzle } from './types'

export interface Tile {
  /** 稳定、唯一的 tile 实例 id（重复字符也各自有 id）。 */
  id: string
  char: string
}

/** mulberry32：小巧的确定性伪随机数发生器。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 按 seed 做确定性 Fisher–Yates 打乱，返回新数组。 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export interface TrayOptions {
  distractorRatio?: number
}

/**
 * 字盘 = 每个待填格一枚正确字（多重集，重复字符按次数）
 *      + ceil(distractorRatio × 待填格数) 枚干扰字符（取自 distractorPool），
 * 按 traySeed 确定性打乱。
 */
export function generateTray(
  derived: DerivedPuzzle,
  options: TrayOptions = {},
): Tile[] {
  const distractorRatio = options.distractorRatio ?? DEFAULTS.distractorRatio
  const seed = derived.spec.traySeed ?? 1

  const correct = derived.blankCells.map(
    (c) => derived.cells.get(cellKey(c.row, c.col))!.char,
  )
  const nDistractors = Math.ceil(distractorRatio * correct.length)
  const distractors = (derived.spec.distractorPool ?? []).slice(0, nDistractors)

  return seededShuffle([...correct, ...distractors], seed).map((char, i) => ({
    id: `t${i}-${char}`,
    char,
  }))
}
