<script setup lang="ts">
import type { Tile } from '../core/trayGenerator'

defineProps<{ tiles: Tile[] }>()
const emit = defineEmits<{ pick: [tileId: string] }>()
</script>

<template>
  <div class="tray" role="group" aria-label="候选字">
    <button
      v-for="tile in tiles"
      :key="tile.id"
      type="button"
      class="tile"
      @click="emit('pick', tile.id)"
    >
      {{ tile.char }}
    </button>
    <p v-if="tiles.length === 0" class="tray__empty">字都用完了</p>
  </div>
</template>

<style scoped>
.tray {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  width: min(calc(100vw - 32px), 440px);
  max-height: 34vh;
  overflow-y: auto;
  padding: 4px;
}

.tile {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  box-shadow: 0 1px 2px rgba(34, 50, 63, 0.08);
  -webkit-tap-highlight-color: transparent;
}

.tile:active {
  background: var(--color-tile-active);
}

.tray__empty {
  color: var(--color-ink-soft);
  font-size: 13px;
}
</style>
