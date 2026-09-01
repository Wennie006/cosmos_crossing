import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { derivePuzzle } from '../src/core/puzzleModel'
import { generateTray, seededShuffle } from '../src/core/trayGenerator'
import type { PuzzleSpec } from '../src/core/types'

const puzzlesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/puzzles',
)
const spec = JSON.parse(
  readFileSync(join(puzzlesDir, '1.json'), 'utf8'),
) as PuzzleSpec
const derived = derivePuzzle(spec)

describe('seededShuffle', () => {
  it('相同 seed 结果一致，不同 seed 一般不同', () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 42)
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 42)
    const c = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 43)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('generateTray', () => {
  it('数量 = 待填格数 + ceil(0.3 × 待填格数)', () => {
    const blanks = derived.blankCells.length // 22
    const tray = generateTray(derived)
    expect(tray.length).toBe(blanks + Math.ceil(0.3 * blanks))
  })

  it('包含每个待填格的正确字符（按多重集）', () => {
    const tray = generateTray(derived)
    const need = new Map<string, number>()
    for (const c of derived.blankCells) {
      const ch = derived.cells.get(`${c.row},${c.col}`)!.char
      need.set(ch, (need.get(ch) ?? 0) + 1)
    }
    const have = new Map<string, number>()
    for (const t of tray) have.set(t.char, (have.get(t.char) ?? 0) + 1)
    for (const [ch, n] of need) {
      expect(have.get(ch) ?? 0, `字符 ${ch}`).toBeGreaterThanOrEqual(n)
    }
  })

  it('tile id 唯一，确定性', () => {
    const t1 = generateTray(derived)
    const t2 = generateTray(derived)
    expect(t1.map((t) => t.id)).toEqual(t2.map((t) => t.id))
    expect(new Set(t1.map((t) => t.id)).size).toBe(t1.length)
  })
})
