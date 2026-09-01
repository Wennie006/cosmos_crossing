<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { elapsedMs, formatDuration, isRunning } from '../core/timer'
import type { TimerState } from '../core/timer'

const props = defineProps<{ timer: TimerState }>()

// 精度到秒即可，每 500ms 刷新一次显示。计时逻辑在 core/timer.ts。
const now = ref(Date.now())
let handle: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  handle = setInterval(() => {
    now.value = Date.now()
  }, 500)
})
onUnmounted(() => {
  if (handle) clearInterval(handle)
})

const display = computed(() =>
  formatDuration(elapsedMs(props.timer, now.value)),
)
const running = computed(() => isRunning(props.timer))
</script>

<template>
  <div class="timer" :class="{ 'is-running': running }" role="timer">
    {{ display }}
  </div>
</template>

<style scoped>
.timer {
  font-variant-numeric: tabular-nums;
  font-size: 20px;
  letter-spacing: 0.06em;
  color: var(--color-ink-soft);
}

.timer.is-running {
  color: var(--color-ink);
}
</style>
