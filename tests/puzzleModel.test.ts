import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  derivePuzzle,
  entryCells,
  validatePuzzle,
} from '../src/core/puzzleModel'
import type { PuzzleSpec } from '../src/core/types'

const puzzlesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/puzzles',
)

function loadPuzzle(file: string): PuzzleSpec {
  return JSON.parse(readFileSync(join(puzzlesDir, file), 'utf8')) as PuzzleSpec
}

const puzzleFiles = readdirSync(puzzlesDir).filter((f) => f.endsWith('.json'))

function clone(spec: PuzzleSpec): PuzzleSpec {
  return JSON.parse(JSON.stringify(spec)) as PuzzleSpec
}

describe('entryCells', () => {
  it('沿方向展开占用格', () => {
    expect(
      entryCells({ id: 'x', text: '往前', direction: 'horizontal', row: 2, col: 3 }),
    ).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
    ])
    expect(
      entryCells({ id: 'y', text: '往前', direction: 'vertical', row: 2, col: 3 }),
    ).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })
})

describe('内置三关校验通过', () => {
  it.each(puzzleFiles)('%s 无校验错误', (file) => {
    expect(validatePuzzle(loadPuzzle(file))).toEqual([])
  })

  it.each(puzzleFiles)('%s 每条词条恰好 2 个提示字', (file) => {
    const derived = derivePuzzle(loadPuzzle(file))
    for (const e of derived.entries) {
      expect(e.givenCells.length, `${e.id} ${e.text}`).toBe(2)
    }
  })

  it.each(puzzleFiles)('%s 交叉格字符一致且答案可派生', (file) => {
    const derived = derivePuzzle(loadPuzzle(file))
    for (const cell of derived.cellList) {
      expect(cell.char).toMatch(/^\p{Script=Han}$/u)
      if (cell.isIntersection) expect(cell.entryIds.length).toBe(2)
    }
  })
})

describe('派生数据', () => {
  it('一万小时：交叉与待填数量', () => {
    const derived = derivePuzzle(loadPuzzle('yiwanxiaoshi.json'))
    expect(derived.intersections.length).toBe(4)
    expect(derived.blankCells.length).toBe(22)
    expect(derived.entries.map((e) => e.id)).toEqual(['A1', 'V1', 'V2', 'V3', 'V4'])
  })
})

describe('校验能捕获错误', () => {
  const base = () => loadPuzzle('yiwanxiaoshi.json')

  it('交叉格字符冲突', () => {
    const spec = clone(base())
    spec.entries[1].text = '你要变成他的树' // V1 首字 你 != A1 在 (4,1) 的 我
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('字符冲突'))).toBe(true)
  })

  it('词条未与第一条连通', () => {
    const spec = clone(base())
    // 把 V4 挪到不与任何词条相交的位置
    spec.entries[4].row = 8
    spec.entries[4].col = 8
    spec.grid = { rows: 15, cols: 15 }
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('未与第一条词条连通'))).toBe(true)
  })

  it('网格声明尺寸与包围盒不符', () => {
    const spec = clone(base())
    spec.grid = { rows: 11, cols: 11 }
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('包围盒'))).toBe(true)
  })

  it('单条词条提示字超过 2 个', () => {
    const spec = clone(base())
    spec.prefilled.push({ row: 5, col: 1 }) // V1 再加一个提示字 -> 3 个
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('提示字数量为 3'))).toBe(true)
  })

  it('干扰字符不足', () => {
    const spec = clone(base())
    spec.distractorPool = ['山', '海']
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('干扰字符不足'))).toBe(true)
  })

  it('干扰字符与答案重合', () => {
    const spec = clone(base())
    spec.distractorPool = [...(spec.distractorPool ?? []), '树']
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('与答案字符重合'))).toBe(true)
  })

  it('提示字不在任何词条上', () => {
    const spec = clone(base())
    spec.prefilled.push({ row: 0, col: 0 })
    const errors = validatePuzzle(spec)
    expect(errors.some((e) => e.includes('不在任何词条上'))).toBe(true)
  })
})
