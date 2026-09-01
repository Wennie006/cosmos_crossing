<script setup lang="ts">
import { storeToRefs } from 'pinia'
import CandidateTray from '../components/CandidateTray.vue'
import CrosswordGrid from '../components/CrosswordGrid.vue'
import { puzzleIds } from '../core/puzzleLibrary'
import { useGameStore } from '../store/gameStore'

// 步骤 3：可玩（选格 / 填字 / 改字 / 清除 / 方向切换），不判定完成。
// 顶部关卡切换按钮为临时开发辅助，步骤 6 移除。
const store = useGameStore()
const { derived, state, availableTiles, currentEntryKeys, currentPuzzleId } =
  storeToRefs(store)
</script>

<template>
  <main class="game-page">
    <nav class="dev-switch" aria-label="关卡切换（开发用）">
      <button
        v-for="id in puzzleIds"
        :key="id"
        type="button"
        :class="{ 'is-active': id === currentPuzzleId }"
        @click="store.loadPuzzle(id)"
      >
        {{ id }}
      </button>
    </nav>

    <CrosswordGrid
      :puzzle="derived"
      :fills="state.fills"
      :selected-key="state.selectedKey"
      :current-entry-keys="currentEntryKeys"
      @select="store.selectCell"
    />

    <div class="controls">
      <button
        type="button"
        class="clear-btn"
        :disabled="!state.selectedKey"
        @click="store.clearSelected"
      >
        清除选中格
      </button>
    </div>

    <CandidateTray :tiles="availableTiles" @pick="store.placeTile" />
  </main>
</template>

<style scoped>
.game-page {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
}

.dev-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.dev-switch button {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink-soft);
}

.dev-switch button.is-active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.controls {
  display: flex;
  gap: 8px;
}

.clear-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink-soft);
}

.clear-btn:disabled {
  opacity: 0.4;
}
</style>
