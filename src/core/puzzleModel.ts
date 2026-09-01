// 谜题的解析、交叉推导、答案派生与硬校验。纯 TS，无框架依赖。
// 规则见 docs/puzzle-generation.md §0、§6、§8.1。

import type {
  Cell,
  DerivedCell,
  DerivedEntry,
  DerivedPuzzle,
  EntrySpec,
  PuzzleSpec,
} from './types'

export const DEFAULTS = {
  maxRows: 11,
  maxCols: 11,
  givensPerEntry: 2,
  distractorRatio: 0.3,
} as const

export function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

/** 一条词条按方向占用的格坐标序列。 */
export function entryCells(entry: EntrySpec): Cell[] {
  const chars = [...entry.text]
  return chars.map((_, i) =>
    entry.direction === 'horizontal'
      ? { row: entry.row, col: entry.col + i }
      : { row: entry.row + i, col: entry.col },
  )
}

/** 由 PuzzleSpec 计算派生模型。不做校验（校验见 validatePuzzle）。 */
export function derivePuzzle(spec: PuzzleSpec): DerivedPuzzle {
  const prefilledKeys = new Set(spec.prefilled.map((c) => cellKey(c.row, c.col)))
  const cells = new Map<string, DerivedCell>()

  for (const entry of spec.entries) {
    const chars = [...entry.text]
    const positions = entryCells(entry)
    positions.forEach((pos, i) => {
      const key = cellKey(pos.row, pos.col)
      const existing = cells.get(key)
      if (existing) {
        existing.entryIds.push(entry.id)
        existing.isIntersection = existing.entryIds.length >= 2
      } else {
        cells.set(key, {
          row: pos.row,
          col: pos.col,
          char: chars[i],
          entryIds: [entry.id],
          isIntersection: false,
          isPrefilled: prefilledKeys.has(key),
        })
      }
    })
  }

  const cellList = [...cells.values()]

  const entries: DerivedEntry[] = spec.entries.map((entry) => {
    const chars = [...entry.text]
    const positions = entryCells(entry)
    const intersectionCells: Cell[] = []
    const givenCells: Cell[] = []
    const blankCells: Cell[] = []
    for (const pos of positions) {
      const dc = cells.get(cellKey(pos.row, pos.col))
      if (!dc) continue
      if (dc.isIntersection) intersectionCells.push({ row: pos.row, col: pos.col })
      if (dc.isPrefilled) givenCells.push({ row: pos.row, col: pos.col })
      else blankCells.push({ row: pos.row, col: pos.col })
    }
    return {
      ...entry,
      cells: positions,
      chars,
      intersectionCells,
      givenCells,
      blankCells,
    }
  })

  const intersections = cellList
    .filter((c) => c.isIntersection)
    .map((c) => ({ row: c.row, col: c.col }))

  const blankCells = cellList
    .filter((c) => !c.isPrefilled)
    .map((c) => ({ row: c.row, col: c.col }))

  return { spec, cells, cellList, entries, intersections, blankCells }
}

export function answerAt(
  derived: DerivedPuzzle,
  row: number,
  col: number,
): string | undefined {
  return derived.cells.get(cellKey(row, col))?.char
}

// ---- 校验 ----

export interface ValidateOptions {
  maxRows?: number
  maxCols?: number
  givensPerEntry?: number
  distractorRatio?: number
}

/**
 * 硬校验。返回错误信息数组；空数组表示通过。
 * 对应 docs/puzzle-generation.md §8.1（puzzleId 全局唯一性在 validate-puzzles 脚本层跨文件校验）。
 */
export function validatePuzzle(
  spec: PuzzleSpec,
  options: ValidateOptions = {},
): string[] {
  const opts = { ...DEFAULTS, ...options }
  const errors: string[] = []
  const push = (msg: string) => errors.push(msg)

  const { rows, cols } = spec.grid

  if (rows > opts.maxRows || cols > opts.maxCols) {
    push(`网格 ${rows}×${cols} 超过上限 ${opts.maxRows}×${opts.maxCols}`)
  }

  if (spec.entries.length === 0) {
    push('没有词条')
    return errors
  }

  if (spec.entries[0].direction !== 'horizontal') {
    push(`entries[0]（第一条词条 ${spec.entries[0].id}）方向必须为 horizontal`)
  }

  const ids = spec.entries.map((e) => e.id)
  const dupIds = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupIds.length) push(`词条 id 重复：${[...new Set(dupIds)].join(', ')}`)

  // 逐条：非空、落在网格内
  for (const entry of spec.entries) {
    const chars = [...entry.text]
    if (chars.length === 0) {
      push(`词条 ${entry.id} text 为空`)
      continue
    }
    for (const pos of entryCells(entry)) {
      if (
        pos.row < 0 ||
        pos.col < 0 ||
        pos.row >= rows ||
        pos.col >= cols
      ) {
        push(
          `词条 ${entry.id}（${entry.text}）越出网格：格 (${pos.row}, ${pos.col})`,
        )
        break
      }
    }
  }

  // 占用表 + 一致性 + 每格至多一横一纵
  const occ = new Map<string, { char: string; entries: EntrySpec[] }>()
  for (const entry of spec.entries) {
    const chars = [...entry.text]
    entryCells(entry).forEach((pos, i) => {
      const key = cellKey(pos.row, pos.col)
      const cur = occ.get(key)
      if (!cur) {
        occ.set(key, { char: chars[i], entries: [entry] })
      } else {
        if (cur.char !== chars[i]) {
          push(
            `交叉格 (${pos.row}, ${pos.col}) 字符冲突：` +
              `${cur.entries.map((e) => `${e.id}=${cur.char}`).join(' / ')} 与 ${entry.id}=${chars[i]}`,
          )
        }
        cur.entries.push(entry)
      }
    })
  }

  for (const [key, info] of occ) {
    if (info.entries.length > 2) {
      push(
        `格 ${key} 被 ${info.entries.length} 条词条覆盖（${info.entries
          .map((e) => e.id)
          .join(', ')}），每格至多一横一纵`,
      )
    } else if (info.entries.length === 2) {
      const [a, b] = info.entries
      if (a.direction === b.direction) {
        push(
          `格 ${key} 被两条同方向词条覆盖（${a.id}, ${b.id}）：同方向词条不得重叠`,
        )
      }
    }
  }

  // 同方向词条不得部分重叠（多格重合）
  for (let i = 0; i < spec.entries.length; i++) {
    for (let j = i + 1; j < spec.entries.length; j++) {
      const a = spec.entries[i]
      const b = spec.entries[j]
      const aKeys = new Set(entryCells(a).map((p) => cellKey(p.row, p.col)))
      const shared = entryCells(b).filter((p) =>
        aKeys.has(cellKey(p.row, p.col)),
      )
      if (a.direction === b.direction && shared.length > 0) {
        push(`同方向词条 ${a.id} 与 ${b.id} 重叠 ${shared.length} 格`)
      }
      if (a.direction !== b.direction && shared.length > 1) {
        push(
          `词条 ${a.id} 与 ${b.id} 共享 ${shared.length} 格（异方向词条至多共享 1 格）`,
        )
      }
    }
  }

  // 连通性：所有词条经交叉与 entries[0] 连通
  const adjacency = new Map<string, Set<string>>()
  for (const e of spec.entries) adjacency.set(e.id, new Set())
  for (const info of occ.values()) {
    if (info.entries.length === 2) {
      const [a, b] = info.entries
      adjacency.get(a.id)!.add(b.id)
      adjacency.get(b.id)!.add(a.id)
    }
  }
  const seen = new Set<string>([spec.entries[0].id])
  const queue = [spec.entries[0].id]
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of adjacency.get(cur) ?? []) {
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }
  if (seen.size !== spec.entries.length) {
    const disconnected = spec.entries
      .map((e) => e.id)
      .filter((id) => !seen.has(id))
    push(`词条未与第一条词条连通：${disconnected.join(', ')}`)
  }

  // 提示字：落在某词条上、无重复、每条词条 1..givensPerEntry 个
  const entryCellKeySets = new Map<string, Set<string>>()
  for (const e of spec.entries) {
    entryCellKeySets.set(
      e.id,
      new Set(entryCells(e).map((p) => cellKey(p.row, p.col))),
    )
  }
  const prefilledKeys: string[] = []
  for (const c of spec.prefilled) {
    const key = cellKey(c.row, c.col)
    if (prefilledKeys.includes(key)) {
      push(`提示字坐标重复：(${c.row}, ${c.col})`)
      continue
    }
    prefilledKeys.push(key)
    if (![...entryCellKeySets.values()].some((s) => s.has(key))) {
      push(`提示字 (${c.row}, ${c.col}) 不在任何词条上`)
    }
  }
  for (const e of spec.entries) {
    const set = entryCellKeySets.get(e.id)!
    const count = prefilledKeys.filter((k) => set.has(k)).length
    if (count < 1 || count > opts.givensPerEntry) {
      push(
        `词条 ${e.id}（${e.text}）的提示字数量为 ${count}，应在 1..${opts.givensPerEntry}`,
      )
    }
  }

  // 干扰字符：数量足够、且不与任何答案字符重合
  const derived = derivePuzzle(spec)
  const blankCount = derived.blankCells.length
  const needDistractors = Math.ceil(opts.distractorRatio * blankCount)
  const pool = spec.distractorPool ?? []
  const poolSet = new Set(pool)
  if (poolSet.size < needDistractors) {
    push(
      `干扰字符不足：需要 ${needDistractors} 个（待填 ${blankCount} 格 × ${opts.distractorRatio}），distractorPool 仅 ${poolSet.size} 个不重复字符`,
    )
  }
  const answerChars = new Set(derived.cellList.map((c) => c.char))
  const badDistractors = pool.filter((ch) => answerChars.has(ch))
  if (badDistractors.length) {
    push(`干扰字符与答案字符重合：${[...new Set(badDistractors)].join(', ')}`)
  }

  // 网格声明尺寸应等于词条包围盒
  let maxR = 0
  let maxC = 0
  for (const e of spec.entries) {
    for (const pos of entryCells(e)) {
      if (pos.row > maxR) maxR = pos.row
      if (pos.col > maxC) maxC = pos.col
    }
  }
  if (maxR + 1 !== rows || maxC + 1 !== cols) {
    push(
      `网格声明为 ${rows}×${cols}，但词条包围盒为 ${maxR + 1}×${maxC + 1}（应相等，且左上角为 (0,0)）`,
    )
  }
  const minR = Math.min(...spec.entries.flatMap((e) => entryCells(e).map((p) => p.row)))
  const minC = Math.min(...spec.entries.flatMap((e) => entryCells(e).map((p) => p.col)))
  if (minR !== 0 || minC !== 0) {
    push(`词条包围盒左上角为 (${minR}, ${minC})，应归一化到 (0, 0)`)
  }

  return errors
}

// ---- 文本预览 ----

/** 网格文本预览：提示字显示字符，其它词条格显示 ＿，非词条格显示 ·。 */
export function renderTextGrid(derived: DerivedPuzzle): string {
  const { rows, cols } = derived.spec.grid
  const lines: string[] = []
  const header = ['   '].concat(
    Array.from({ length: cols }, (_, c) => `c${c}`.padEnd(2)),
  )
  lines.push(header.join(' '))
  for (let r = 0; r < rows; r++) {
    const row = [`r${r}`.padEnd(3)]
    for (let c = 0; c < cols; c++) {
      const cell = derived.cells.get(cellKey(r, c))
      if (!cell) row.push('· ')
      else if (cell.isPrefilled) row.push(cell.char)
      else row.push('＿')
    }
    lines.push(row.join(' '))
  }
  return lines.join('\n')
}

/** 逐条词条的信息：id、完整歌词、方向、起点、提示字（字符与位置）。 */
export function describeEntries(derived: DerivedPuzzle): string {
  return derived.entries
    .map((e) => {
      const start = `(${e.row}, ${e.col})`
      const givens = e.givenCells
        .map((g) => {
          const ch = derived.cells.get(cellKey(g.row, g.col))?.char ?? '?'
          return `${ch}(${g.row},${g.col})`
        })
        .join(' ')
      const crossings = e.intersectionCells
        .map((g) => `(${g.row},${g.col})`)
        .join(' ')
      return (
        `${e.id}  ${e.text}  [${e.direction}]  起点 ${start}\n` +
        `     提示字: ${givens || '(无)'}\n` +
        `     交叉格: ${crossings || '(无)'}`
      )
    })
    .join('\n')
}
