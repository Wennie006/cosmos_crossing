// 谜题库：加载 src/puzzles/*.json，暴露 id 列表、按 id 取谜题、以及选关逻辑。
// 依赖 Vite 的 import.meta.glob，仅供应用侧使用（构建脚本用 fs 自行加载）。

import { derivePuzzle } from './puzzleModel'
import { pickInitialPuzzleId, pickNextPuzzleId, type RandomInt } from './puzzleSelect'
import type { DerivedPuzzle, PuzzleSpec } from './types'

const modules = import.meta.glob<{ default: PuzzleSpec }>('../puzzles/*.json', {
  eager: true,
})

// 片段音频：由 Vite 打包，URL 带 hash。文件由用户放入 src/assets/clips/{puzzleId}.mp3。
const clipUrls = import.meta.glob<string>('../assets/clips/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
})

const specs: PuzzleSpec[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.puzzleId - b.puzzleId)

/** 谜题库中全部 puzzleId（按编号升序）。 */
export const puzzleIds: readonly number[] = specs.map((s) => s.puzzleId)

const specById = new Map(specs.map((s) => [s.puzzleId, s]))

export function getPuzzleSpec(id: number): PuzzleSpec {
  const spec = specById.get(id)
  if (!spec) throw new Error(`未知 puzzleId: ${id}`)
  return spec
}

export function getDerivedPuzzle(id: number): DerivedPuzzle {
  return derivePuzzle(getPuzzleSpec(id))
}

/** 片段音频路径：优先用 song.clipSrc，否则默认 assets/clips/{puzzleId}.mp3。 */
export function clipSrcOf(spec: PuzzleSpec): string {
  return spec.song.clipSrc ?? `assets/clips/${spec.puzzleId}.mp3`
}

/** 片段音频打包后的可用 URL；文件不存在时返回 null。 */
export function clipUrlOf(spec: PuzzleSpec): string | null {
  const suffix = `/${spec.puzzleId}.mp3`
  for (const [path, url] of Object.entries(clipUrls)) {
    if (path.endsWith(suffix)) return url
  }
  return null
}

/** 片段时长（秒），默认 15。 */
export function clipDurationOf(spec: PuzzleSpec): number {
  return spec.song.clipDuration ?? 15
}

/** 首次进入：均匀随机选一关。 */
export function pickInitialPuzzle(randomInt?: RandomInt): number {
  return pickInitialPuzzleId(puzzleIds, randomInt)
}

/** 再来一局：从 puzzleId 不等于 currentId 的谜题中均匀随机选一关。 */
export function pickNextPuzzle(currentId: number, randomInt?: RandomInt): number {
  return pickNextPuzzleId(puzzleIds, currentId, randomInt)
}
