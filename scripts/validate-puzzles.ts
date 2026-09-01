// 构建期关卡校验 + 文本预览。
// 运行：npm run puzzles:check
//
// 加载 src/puzzles/*.json，逐个跑 validatePuzzle，打印文本网格与逐条词条信息，
// 并跨文件校验 puzzleId 全局唯一。任一谜题有错则以非零码退出。

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  derivePuzzle,
  describeEntries,
  renderTextGrid,
  validatePuzzle,
} from '../src/core/puzzleModel'
import type { PuzzleSpec } from '../src/core/types'

const here = dirname(fileURLToPath(import.meta.url))
const puzzlesDir = resolve(here, '../src/puzzles')

const files = readdirSync(puzzlesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

if (files.length === 0) {
  console.error(`未找到谜题文件：${puzzlesDir}`)
  process.exit(1)
}

let hasError = false
const seenIds = new Map<string, string>()

for (const file of files) {
  const spec = JSON.parse(
    readFileSync(join(puzzlesDir, file), 'utf8'),
  ) as PuzzleSpec

  console.log('\n' + '='.repeat(60))
  console.log(`${file}  —  puzzleId: ${spec.puzzleId}  《${spec.song.title}》`)
  console.log('='.repeat(60))

  if (seenIds.has(spec.puzzleId)) {
    hasError = true
    console.log(
      `  ✗ puzzleId 重复：与 ${seenIds.get(spec.puzzleId)} 相同`,
    )
  }
  seenIds.set(spec.puzzleId, file)

  const errors = validatePuzzle(spec)
  const derived = derivePuzzle(spec)

  console.log(
    `\n网格 ${spec.grid.rows}×${spec.grid.cols} · 词条 ${spec.entries.length} · ` +
      `交叉 ${derived.intersections.length} · 待填 ${derived.blankCells.length} · ` +
      `提示字 ${spec.prefilled.length} · 干扰字 ${(spec.distractorPool ?? []).length}`,
  )

  console.log('\n' + renderTextGrid(derived) + '\n')
  console.log(describeEntries(derived))

  if (errors.length === 0) {
    console.log('\n  ✓ 校验通过')
  } else {
    hasError = true
    console.log(`\n  ✗ 校验失败（${errors.length}）：`)
    for (const e of errors) console.log(`     - ${e}`)
  }
}

console.log('\n' + '='.repeat(60))
console.log(hasError ? '存在校验错误' : `全部通过（${files.length} 个谜题）`)
process.exit(hasError ? 1 : 0)
