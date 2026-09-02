<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import CandidateTray from '../components/CandidateTray.vue'
import CompletionDialog from '../components/CompletionDialog.vue'
import CrosswordGrid from '../components/CrosswordGrid.vue'
import GameTimer from '../components/GameTimer.vue'
import HintButton from '../components/HintButton.vue'
import { elapsedMs, formatDuration } from '../core/timer'
import { useGameStore } from '../store/gameStore'

// 用户视角：唯一入口是「首次进入随机选关」+「再玩一次」。无关卡切换 UI。
const store = useGameStore()
const {
  derived,
  state,
  timer,
  availableTiles,
  currentEntry,
  currentEntryKeys,
  isComplete,
} = storeToRefs(store)

// 完成弹窗：完成时出现，可关闭；关闭后停留在只读网格 + 一个「再玩一次」按钮。
const dialogDismissed = ref(false)
watch(isComplete, (done) => {
  if (!done) dialogDismissed.value = false
})

function again(): void {
  store.playAgain()
}
</script>

<template>
  <main class="game-page">
    <GameTimer :timer="timer" />

    <button
      v-if="isComplete && dialogDismissed"
      type="button"
      class="again-btn"
      @click="again"
    >
      再玩一次
    </button>

    <div class="board" :class="{ 'is-locked': isComplete }">
      <CrosswordGrid
        :puzzle="derived"
        :fills="state.fills"
        :selected-key="state.selectedKey"
        :current-entry-keys="currentEntryKeys"
        :current-entry="currentEntry"
        @select="store.selectCell"
      />

      <div class="controls">
        <button
          type="button"
          class="ctrl-btn"
          :disabled="!state.selectedKey"
          @click="store.clearSelected"
        >
          清除选中格
        </button>
        <HintButton :disabled="isComplete" @hint="store.hint" />
      </div>

      <CandidateTray :tiles="availableTiles" @pick="store.placeTile" />
    </div>

    <CompletionDialog
      v-if="isComplete && !dialogDismissed"
      :puzzle="derived"
      :duration-text="formatDuration(elapsedMs(timer, 0))"
      @close="dialogDismissed = true"
      @again="again"
    />
  </main>
</template>

<style scoped>
.game-page {
  position: relative;
  z-index: 1;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: calc(18px + env(safe-area-inset-top)) 16px
    calc(24px + env(safe-area-inset-bottom));
}

.again-btn {
  padding: 8px 22px;
  font-size: 14px;
  border: 1px solid var(--color-accent);
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-surface);
}

.board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.board.is-locked {
  pointer-events: none;
  opacity: 0.65;
}

.controls {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink-soft);
}

.ctrl-btn:disabled {
  opacity: 0.4;
}
</style>
