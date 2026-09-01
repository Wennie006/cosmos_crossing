import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import * as engine from '../src/core/gameEngine'
import type { GameState } from '../src/core/gameEngine'
import { cellKey, derivePuzzle } from '../src/core/puzzleModel'
import { generateTray } from '../src/core/trayGenerator'
import type { DerivedPuzzle, PuzzleSpec } from '../src/core/types'

const puzzlesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/puzzles',
)
const spec = JSON.parse(
  readFileSync(join(puzzlesDir, '1.json'), 'utf8'),
) as PuzzleSpec
const derived: DerivedPuzzle = derivePuzzle(spec)

// yiwanxiaoshi 关键格：
//  (4,0) A1 首格「让」待填、非交叉
//  (4,1) A1×V1 交叉格、提示字（不可选）
//  (5,1) V1 待填、非交叉
//  (4,3) A1×V2 交叉格、待填（未预填）
const HANG = { row: 4, col: 0 }
const V1_CELL = { row: 5, col: 1 }
const CROSS = { row: 4, col: 3 }

let state: GameState

function tileForChar(ch: string): string {
  const t = engine.availableTiles(state).find((x) => x.char === ch)
  if (!t) throw new Error(`字盘无可用字符 ${ch}`)
  return t.id
}

beforeEach(() => {
  state = engine.createGameState(generateTray(derived))
})

describe('selectCell', () => {
  it('选中待填格', () => {
    engine.selectCell(state, derived, HANG)
    expect(state.selectedKey).toBe(cellKey(4, 0))
  })

  it('忽略提示字格', () => {
    engine.selectCell(state, derived, { row: 4, col: 1 })
    expect(state.selectedKey).toBeNull()
  })

  it('再点已选中的交叉格切换方向', () => {
    engine.selectCell(state, derived, CROSS)
    const first = state.direction
    engine.selectCell(state, derived, CROSS)
    expect(state.direction).not.toBe(first)
    engine.selectCell(state, derived, CROSS)
    expect(state.direction).toBe(first)
  })

  it('再点已选中的非交叉已填格清空该格', () => {
    engine.selectCell(state, derived, HANG)
    engine.placeTile(state, derived, tileForChar('让'))
    expect(state.fills[cellKey(4, 0)]).toBe('让')
    engine.selectCell(state, derived, HANG) // 选中
    engine.selectCell(state, derived, HANG) // 再点 -> 清空
    expect(state.fills[cellKey(4, 0)]).toBeUndefined()
  })
})

describe('placeTile', () => {
  it('填入并前进到下一个待填格', () => {
    engine.selectCell(state, derived, HANG) // A1 (4,0)，方向 horizontal
    engine.placeTile(state, derived, tileForChar('让'))
    expect(state.fills[cellKey(4, 0)]).toBe('让')
    // (4,1) 是提示字，跳过；下一个空待填格为 (4,2)
    expect(state.selectedKey).toBe(cellKey(4, 2))
  })

  it('覆盖已填格时原 tile 退回字盘', () => {
    engine.selectCell(state, derived, V1_CELL)
    const idBefore = engine.availableTiles(state).length
    const t1 = tileForChar('要')
    engine.placeTile(state, derived, t1)
    engine.selectCell(state, derived, V1_CELL)
    const t2 = engine.availableTiles(state).find((x) => x.char === '变')!.id
    engine.placeTile(state, derived, t2)
    expect(state.fills[cellKey(5, 1)]).toBe('变')
    // t1 回到可用集合
    expect(engine.availableTiles(state).some((x) => x.id === t1)).toBe(true)
    expect(engine.availableTiles(state).length).toBe(idBefore - 1)
  })

  it('不能填入提示字格（selectedKey 为 null 时无操作）', () => {
    engine.placeTile(state, derived, engine.availableTiles(state)[0].id)
    expect(Object.keys(state.fills)).toHaveLength(0)
  })
})

describe('availableTiles', () => {
  it('填入后从可用集合移除，清除后恢复', () => {
    const n = engine.availableTiles(state).length
    engine.selectCell(state, derived, HANG)
    const id = tileForChar('让')
    engine.placeTile(state, derived, id)
    expect(engine.availableTiles(state).length).toBe(n - 1)
    engine.clearCell(state, derived, HANG)
    expect(engine.availableTiles(state).length).toBe(n)
  })
})

describe('useHint', () => {
  it('填入阅读顺序（左上→右下）第一个空待填格', () => {
    // yiwanxiaoshi 第 0 行唯一的格是 V4 的 (0,6)="需"，在 (4,0) 之前
    const applied = engine.useHint(state, derived)
    expect(applied).toBe(true)
    expect(state.selectedKey).toBe(cellKey(0, 6))
    expect(state.fills[cellKey(0, 6)]).toBe('需')
  })

  it('消耗字盘里一枚对应字符的 tile', () => {
    const before = engine.availableTiles(state).length
    engine.useHint(state, derived)
    expect(engine.availableTiles(state).length).toBe(before - 1)
    expect(state.cellTile[cellKey(0, 6)]).toBeTruthy()
  })

  it('反复提示直至填满，返回值与待填格数一致；再提示返回 false', () => {
    let count = 0
    while (engine.useHint(state, derived)) count++
    expect(count).toBe(derived.blankCells.length)
    expect(engine.isSolved(state, derived)).toBe(true)
    expect(engine.useHint(state, derived)).toBe(false)
  })

  it('字盘中对应字符已被占用时，仍直接填入但不关联 tile', () => {
    // 需要多久的时间 的「需」只有一枚 tile；先把它错放到别处占用掉
    engine.selectCell(state, derived, V1_CELL)
    const needTileId = engine.availableTiles(state).find((t) => t.char === '需')!.id
    engine.placeTile(state, derived, needTileId)
    expect(state.fills[cellKey(5, 1)]).toBe('需') // 占位（答案其实是「要」，这里只测占用）

    const applied = engine.useHint(state, derived)
    expect(applied).toBe(true)
    expect(state.fills[cellKey(0, 6)]).toBe('需')
    expect(state.cellTile[cellKey(0, 6)]).toBeUndefined()
  })

  it('提示后可用清除格恢复', () => {
    engine.useHint(state, derived)
    const key = state.selectedKey!
    engine.clearCell(state, derived, { row: 0, col: 6 })
    expect(state.fills[key]).toBeUndefined()
  })
})

describe('isSolved', () => {
  it('全部按答案填入后为 true', () => {
    for (const c of derived.blankCells) {
      const key = cellKey(c.row, c.col)
      state.selectedKey = key
      engine.placeTile(state, derived, tileForChar(derived.cells.get(key)!.char))
    }
    expect(engine.isSolved(state, derived)).toBe(true)
  })

  it('未填满为 false', () => {
    expect(engine.isSolved(state, derived)).toBe(false)
  })
})
