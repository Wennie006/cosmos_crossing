<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { buildShareText } from '../config/share'
import { clipDurationOf, clipUrlOf } from '../core/puzzleLibrary'
import type { DerivedPuzzle } from '../core/types'

const props = defineProps<{
  puzzle: DerivedPuzzle
  durationText: string
}>()
const emit = defineEmits<{ close: []; again: [] }>()

const clipUrl = computed(() => clipUrlOf(props.puzzle.spec))
const clipSeconds = computed(() => clipDurationOf(props.puzzle.spec))
const successText = computed(() => props.puzzle.spec.successText?.trim() ?? '')

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const hasPlayed = ref(false)
const shareToast = ref(false)

// 片段可能是完整歌（15s 版未上传时）：播到 clipSeconds 硬停并回到起点。
function onTimeUpdate(): void {
  const a = audioEl.value
  if (a && a.currentTime >= clipSeconds.value) {
    a.pause()
    a.currentTime = 0
  }
}

/** 从头播放（也用作「重播」）。自动播放被拦截时静默失败，按钮仍可手动点。 */
async function play(): Promise<void> {
  const a = audioEl.value
  if (!a) return
  try {
    a.currentTime = 0
    await a.play()
  } catch {
    // 忽略：isPlaying 保持 false，按钮显示「播放片段」
  }
}

onMounted(() => {
  if (clipUrl.value) void play()
})
onBeforeUnmount(() => {
  audioEl.value?.pause()
})

async function share(): Promise<void> {
  const text = buildShareText({
    time: props.durationText,
    title: props.puzzle.spec.song.title,
    url: window.location.href,
  })
  try {
    await navigator.clipboard.writeText(text)
    shareToast.value = true
    setTimeout(() => {
      shareToast.value = false
    }, 1600)
  } catch {
    window.prompt('复制以下文字分享：', text)
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="完成">
      <button
        class="dialog__close"
        type="button"
        aria-label="关闭"
        @click="emit('close')"
      >
        ×
      </button>

      <p class="dialog__title">完成！</p>
      <p class="dialog__time">用时 {{ durationText }}</p>
      <p v-if="successText" class="dialog__egg">{{ successText }}</p>

      <div v-if="clipUrl" class="player">
        <audio
          ref="audioEl"
          :src="clipUrl"
          preload="auto"
          @timeupdate="onTimeUpdate"
          @playing="isPlaying = true; hasPlayed = true"
          @pause="isPlaying = false"
          @ended="isPlaying = false"
        />
        <button class="player__btn" type="button" @click="play">
          {{ isPlaying || hasPlayed ? '↺ 重播' : '▶ 播放片段' }}
        </button>
      </div>

      <div class="dialog__actions">
        <button class="btn" type="button" @click="share">分享</button>
        <button class="btn btn--primary" type="button" @click="emit('again')">
          再玩一次
        </button>
      </div>

      <p v-if="shareToast" class="toast">已复制</p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(28, 26, 23, 0.45);
  z-index: 100;
}

.dialog {
  position: relative;
  width: min(88vw, 340px);
  background: var(--color-surface);
  border-radius: 16px;
  padding: 28px 22px 22px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(28, 26, 23, 0.25);
}

.dialog__close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 32px;
  height: 32px;
  font-size: 22px;
  line-height: 1;
  border: none;
  background: transparent;
  color: var(--color-ink-soft);
}

.dialog__title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.dialog__time {
  margin: 6px 0 0;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
}

.dialog__egg {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--color-ink-soft);
}

.player {
  margin-top: 18px;
}

.player__btn {
  padding: 8px 18px;
  font-size: 14px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink);
}

.dialog__actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  padding: 9px 20px;
  font-size: 14px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink);
}

.btn--primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}

.toast {
  position: absolute;
  left: 50%;
  bottom: -34px;
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 14px;
  font-size: 12px;
  color: #fff;
  background: rgba(28, 26, 23, 0.85);
  border-radius: 999px;
  white-space: nowrap;
}
</style>
