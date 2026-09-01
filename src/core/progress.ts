// 当前关卡进度的 sessionStorage 持久化。规则见 docs/PRD.md §4.10、docs/puzzle-generation.md §11。
// sessionStorage：下拉刷新保留，关标签页/退出后清空——正好匹配需求。

import type { GameState } from './gameEngine'
import type { TimerState } from './timer'

const KEY = 'cosmos:progress'

export interface ProgressRecord {
  /** 用于校验恢复的是同一关。 */
  puzzleId: string
  gameState: GameState
  timer: TimerState
  hintCount: number
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    // 某些环境访问 sessionStorage 本身会抛（隐私模式等）
    return null
  }
}

export function saveProgress(record: ProgressRecord): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(KEY, JSON.stringify(record))
  } catch {
    // 配额/隐私模式：放弃持久化，不影响游戏
  }
}

export function loadProgress(): ProgressRecord | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(KEY)
    if (!raw) return null
    const rec = JSON.parse(raw) as ProgressRecord
    if (!rec || typeof rec.puzzleId !== 'string' || !rec.gameState) return null
    return rec
  } catch {
    return null
  }
}

export function clearProgress(): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(KEY)
  } catch {
    // ignore
  }
}
