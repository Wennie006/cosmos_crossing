<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import CandidateTray from '../components/CandidateTray.vue'
import CompletionDialog from '../components/CompletionDialog.vue'
import CrosswordGrid from '../components/CrosswordGrid.vue'
import GameTimer from '../components/GameTimer.vue'
import HintButton from '../components/HintButton.vue'
import { puzzleIds } from '../core/puzzleLibrary'
import { elapsedMs, formatDuration } from '../core/timer'
import { useGameStore } from '../store/gameStore'

// 步骤 6：完成弹窗 + MP3 片段播放 + 复制链接分享 + 再玩一次。
const store = useGameStore()
const {
  derived,
  state,
  timer,
  availableTiles,
  currentEntry,
  currentEntryKeys,
  currentPuzzleId,
  isComplete,
} = storeToRefs(store)

const isDev = import.meta.env.DEV

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
    <nav v-if="isDev" class="dev-switch" aria-label="关卡切换（仅开发）">
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
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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

.again-btn {
  padding: 8px 22px;
  font-size: 14px;
  border: 1px solid var(--color-accent);
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff;
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
