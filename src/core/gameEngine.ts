// 填字游戏的状态与操作。纯 TS，无框架依赖。
// 交互规则见 docs/PRD.md §4.3。状态用普通对象（便于响应式包装与序列化到 sessionStorage）。

import { cellKey } from './puzzleModel'
import type { Tile } from './trayGenerator'
import type { Cell, DerivedEntry, DerivedPuzzle, Direction } from './types'

export interface GameState {
  /** 字盘全量，顺序在开局时一次性确定，之后不变。 */
  tray: Tile[]
  /** cellKey -> 用户填入的字符（仅待填格）。 */
  fills: Record<string, string>
  /** cellKey -> 占用该格的 tile id。 */
  cellTile: Record<string, string>
  /** 当前选中的待填格 cellKey。 */
  selectedKey: string | null
  /** 当前输入方向。 */
  direction: Direction
}

export function createGameState(tray: Tile[]): GameState {
  return {
    tray,
    fills: {},
    cellTile: {},
    selectedKey: null,
    direction: 'horizontal',
  }
}

/** 已被占用的 tile id 集合。 */
export function usedTileIds(state: GameState): Set<string> {
  return new Set(Object.values(state.cellTile))
}

/** 字盘中当前可用（未被占用）的 tile。 */
export function availableTiles(state: GameState): Tile[] {
  const used = usedTileIds(state)
  return state.tray.filter((t) => !used.has(t.id))
}

function isBlank(derived: DerivedPuzzle, key: string): boolean {
  const c = derived.cells.get(key)
  return !!c && !c.isPrefilled
}

/** 覆盖某格的词条（1 或 2 条）。 */
export function entriesAt(derived: DerivedPuzzle, key: string): DerivedEntry[] {
  const c = derived.cells.get(key)
  if (!c) return []
  return derived.entries.filter((e) => c.entryIds.includes(e.id))
}

/** 当前选中格所属、且方向匹配的词条。 */
export function currentEntry(
  state: GameState,
  derived: DerivedPuzzle,
): DerivedEntry | null {
  if (!state.selectedKey) return null
  const es = entriesAt(derived, state.selectedKey)
  return es.find((e) => e.direction === state.direction) ?? es[0] ?? null
}

/** 当前词条的全部 cellKey（用于高亮）。 */
export function currentEntryKeys(
  state: GameState,
  derived: DerivedPuzzle,
): string[] {
  const entry = currentEntry(state, derived)
  return entry ? entry.cells.map((c) => cellKey(c.row, c.col)) : []
}

/** 选中格沿当前方向前进到下一个空的待填格；无后继则保持不动。 */
function advanceSelection(state: GameState, derived: DerivedPuzzle): void {
  const entry = currentEntry(state, derived)
  if (!entry || !state.selectedKey) return
  const keys = entry.cells.map((c) => cellKey(c.row, c.col))
  const idx = keys.indexOf(state.selectedKey)
  for (let i = idx + 1; i < keys.length; i++) {
    const k = keys[i]
    if (isBlank(derived, k) && !state.fills[k]) {
      state.selectedKey = k
      return
    }
  }
}

/**
 * 点一个格：
 * - 非待填格：忽略。
 * - 已选中的交叉格：切换方向。
 * - 已选中的非交叉、且已填字的格：清空该格。
 * - 其它：选中该格，方向优先沿用当前方向，否则取该格实际拥有的方向。
 */
export function selectCell(
  state: GameState,
  derived: DerivedPuzzle,
  cell: Cell,
): void {
  const key = cellKey(cell.row, cell.col)
  if (!isBlank(derived, key)) return
  const es = entriesAt(derived, key)
  const isCrossing = es.length === 2

  if (state.selectedKey === key) {
    if (isCrossing) {
      state.direction =
        state.direction === 'horizontal' ? 'vertical' : 'horizontal'
    } else if (state.fills[key]) {
      delete state.fills[key]
      delete state.cellTile[key]
    }
    return
  }

  state.selectedKey = key
  const dirs = es.map((e) => e.direction)
  if (!dirs.includes(state.direction)) state.direction = dirs[0]
}

/** 把字盘中某 tile 填入当前选中格；若该格已有字，原 tile 退回字盘；随后前进选中格。 */
export function placeTile(
  state: GameState,
  derived: DerivedPuzzle,
  tileId: string,
): void {
  const key = state.selectedKey
  if (!key || !isBlank(derived, key)) return
  const tile = state.tray.find((t) => t.id === tileId)
  if (!tile) return
  if (usedTileIds(state).has(tileId)) return

  if (state.cellTile[key]) {
    delete state.fills[key]
    delete state.cellTile[key]
  }
  state.fills[key] = tile.char
  state.cellTile[key] = tile.id
  advanceSelection(state, derived)
}

/** 清空某格，其 tile 退回字盘。 */
export function clearCell(
  state: GameState,
  _derived: DerivedPuzzle,
  cell: Cell,
): void {
  const key = cellKey(cell.row, cell.col)
  if (state.cellTile[key]) {
    delete state.fills[key]
    delete state.cellTile[key]
  }
}

/** 清空当前选中格。 */
export function clearSelected(state: GameState, derived: DerivedPuzzle): void {
  if (!state.selectedKey) return
  const c = derived.cells.get(state.selectedKey)
  if (c) clearCell(state, derived, { row: c.row, col: c.col })
}

/** 是否所有待填格都已填且与答案一致（完成判定，步骤 4 使用）。 */
export function isSolved(state: GameState, derived: DerivedPuzzle): boolean {
  return derived.blankCells.every((c) => {
    const key = cellKey(c.row, c.col)
    return state.fills[key] === derived.cells.get(key)!.char
  })
}
