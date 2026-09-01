<script setup lang="ts">
import { computed, ref } from 'vue'
import CrosswordGrid from '../components/CrosswordGrid.vue'
import { getDerivedPuzzle, puzzleIds } from '../core/puzzleLibrary'

// 步骤 2：静态网格渲染。顶部的关卡切换按钮为临时开发辅助，后续步骤移除。
const currentId = ref(puzzleIds[0])
const puzzle = computed(() => getDerivedPuzzle(currentId.value))
</script>

<template>
  <main class="game-page">
    <nav class="dev-switch" aria-label="关卡切换（开发用）">
      <button
        v-for="id in puzzleIds"
        :key="id"
        type="button"
        :class="{ 'is-active': id === currentId }"
        @click="currentId = id"
      >
        {{ id }}
      </button>
    </nav>

    <CrosswordGrid :puzzle="puzzle" />
  </main>
</template>

<style scoped>
.game-page {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px 16px calc(24px + env(safe-area-inset-bottom));
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
</style>
