<script setup lang="ts">
import { computed } from 'vue'
import { cellKey } from '../core/puzzleModel'
import type { Cell, DerivedEntry, DerivedPuzzle } from '../core/types'

const props = defineProps<{
  puzzle: DerivedPuzzle
  fills: Record<string, string>
  selectedKey: string | null
  currentEntryKeys: Set<string>
  currentEntry: DerivedEntry | null
}>()

const emit = defineEmits<{ select: [cell: Cell] }>()

const rows = computed(() => props.puzzle.spec.grid.rows)
const cols = computed(() => props.puzzle.spec.grid.cols)

// 当前词条的整体外框：一条直的横向或纵向词条，外框就是它的包围矩形。
const outline = computed(() => {
  const e = props.currentEntry
  if (!e) return null
  const len = e.chars.length
  return {
    row: e.row,
    col: e.col,
    w: e.direction === 'horizontal' ? len : 1,
    h: e.direction === 'vertical' ? len : 1,
  }
})

type CellKind = 'void' | 'blank' | 'given'
interface RenderCell {
  key: string
  row: number
  col: number
  kind: CellKind
  char: string
  selected: boolean
  inEntry: boolean
}

const cells = computed<RenderCell[]>(() => {
  const out: RenderCell[] = []
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const key = cellKey(r, c)
      const dc = props.puzzle.cells.get(key)
      let kind: CellKind = 'void'
      let char = ''
      if (dc?.isPrefilled) {
        kind = 'given'
        char = dc.char
      } else if (dc) {
        kind = 'blank'
        char = props.fills[key] ?? ''
      }
      out.push({
        key,
        row: r,
        col: c,
        kind,
        char,
        selected: key === props.selectedKey,
        inEntry: props.currentEntryKeys.has(key),
      })
    }
  }
  return out
})
</script>

<template>
  <div class="grid" :style="{ '--cols': cols }" role="grid" aria-label="填字网格">
    <template v-for="cell in cells" :key="cell.key">
      <button
        v-if="cell.kind === 'blank'"
        type="button"
        class="cell cell--blank"
        :class="{ 'is-selected': cell.selected, 'in-entry': cell.inEntry, 'is-filled': !!cell.char }"
        :aria-label="`第 ${cell.row + 1} 行第 ${cell.col + 1} 列`"
        @click="emit('select', { row: cell.row, col: cell.col })"
      >
        <span v-if="cell.char" class="cell__char">{{ cell.char }}</span>
      </button>
      <div v-else class="cell" :class="`cell--${cell.kind}`">
        <span v-if="cell.char" class="cell__char">{{ cell.char }}</span>
      </div>
    </template>

    <div
      v-if="outline"
      class="entry-outline"
      :style="{
        '--o-row': outline.row,
        '--o-col': outline.col,
        '--o-w': outline.w,
        '--o-h': outline.h,
      }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.grid {
  --gap: 2px;
  --grid-w: min(calc(100vw - 32px), 440px);
  --cell: calc((var(--grid-w) - (var(--cols) - 1) * var(--gap)) / var(--cols));
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  gap: var(--gap);
  width: var(--grid-w);
}

.entry-outline {
  position: absolute;
  pointer-events: none;
  left: calc(var(--o-col) * (var(--cell) + var(--gap)) - 2px);
  top: calc(var(--o-row) * (var(--cell) + var(--gap)) - 2px);
  width: calc(var(--o-w) * var(--cell) + (var(--o-w) - 1) * var(--gap) + 4px);
  height: calc(var(--o-h) * var(--cell) + (var(--o-h) - 1) * var(--gap) + 4px);
  border: 2px solid var(--color-accent);
  border-radius: 6px;
  box-sizing: border-box;
  transition:
    left 0.12s ease,
    top 0.12s ease,
    width 0.12s ease,
    height 0.12s ease;
}

.cell {
  width: var(--cell);
  height: var(--cell);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell) * 0.5);
  line-height: 1;
  user-select: none;
  padding: 0;
  margin: 0;
}

.cell--void {
  background: transparent;
}

.cell--blank {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 3px;
  color: var(--color-ink);
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.cell--blank.in-entry {
  background: #fff8ec;
}

.cell--blank.is-selected {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.cell--given {
  background: #ece4d5;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  color: var(--color-ink);
}

/* 提示字与用户填入的字：字体完全一致，仅靠底色区分 */
.cell__char {
  font-weight: 400;
}
</style>
