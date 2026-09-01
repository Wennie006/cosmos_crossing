<script setup lang="ts">
import { computed } from 'vue'
import { cellKey } from '../core/puzzleModel'
import type { DerivedPuzzle } from '../core/types'

// 步骤 2：只做静态渲染，无交互。
const props = defineProps<{ puzzle: DerivedPuzzle }>()

const rows = computed(() => props.puzzle.spec.grid.rows)
const cols = computed(() => props.puzzle.spec.grid.cols)

type CellKind = 'void' | 'blank' | 'given'
interface RenderCell {
  key: string
  kind: CellKind
  char: string
}

const cells = computed<RenderCell[]>(() => {
  const out: RenderCell[] = []
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const dc = props.puzzle.cells.get(cellKey(r, c))
      if (!dc) out.push({ key: `${r},${c}`, kind: 'void', char: '' })
      else if (dc.isPrefilled)
        out.push({ key: `${r},${c}`, kind: 'given', char: dc.char })
      else out.push({ key: `${r},${c}`, kind: 'blank', char: '' })
    }
  }
  return out
})
</script>

<template>
  <div
    class="grid"
    :style="{ '--cols': cols }"
    role="grid"
    aria-label="填字网格"
  >
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="cell"
      :class="`cell--${cell.kind}`"
    >
      <span v-if="cell.char" class="cell__char">{{ cell.char }}</span>
    </div>
  </div>
</template>

<style scoped>
.grid {
  --gap: 2px;
  --grid-w: min(calc(100vw - 32px), 440px);
  --cell: calc((var(--grid-w) - (var(--cols) - 1) * var(--gap)) / var(--cols));
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  gap: var(--gap);
  width: var(--grid-w);
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
}

.cell--void {
  background: transparent;
}

.cell--blank {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 3px;
}

.cell--given {
  background: #ece4d5;
  border: 1px solid var(--color-line);
  border-radius: 3px;
  font-weight: 600;
  color: var(--color-ink);
}
</style>
