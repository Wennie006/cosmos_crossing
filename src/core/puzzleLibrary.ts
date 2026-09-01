// 谜题库：加载 src/puzzles/*.json，暴露 id 列表、按 id 取谜题、以及选关逻辑。
// 依赖 Vite 的 import.meta.glob，仅供应用侧使用（构建脚本用 fs 自行加载）。

import { derivePuzzle } from './puzzleModel'
import { pickInitialPuzzleId, pickNextPuzzleId, type RandomInt } from './puzzleSelect'
import type { DerivedPuzzle, PuzzleSpec } from './types'

const modules = import.meta.glob<{ default: PuzzleSpec }>('../puzzles/*.json', {
  eager: true,
})

const specs: PuzzleSpec[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.puzzleId.localeCompare(b.puzzleId))

/** 谜题库中全部 puzzleId（稳定排序）。 */
export const puzzleIds: readonly string[] = specs.map((s) => s.puzzleId)

const specById = new Map(specs.map((s) => [s.puzzleId, s]))

export function getPuzzleSpec(id: string): PuzzleSpec {
  const spec = specById.get(id)
  if (!spec) throw new Error(`未知 puzzleId: ${id}`)
  return spec
}

export function getDerivedPuzzle(id: string): DerivedPuzzle {
  return derivePuzzle(getPuzzleSpec(id))
}

/** 首次进入：均匀随机选一关。 */
export function pickInitialPuzzle(randomInt?: RandomInt): string {
  return pickInitialPuzzleId(puzzleIds, randomInt)
}

/** 再来一局：从 puzzleId 不等于 currentId 的谜题中均匀随机选一关。 */
export function pickNextPuzzle(currentId: string, randomInt?: RandomInt): string {
  return pickNextPuzzleId(puzzleIds, currentId, randomInt)
}
