<script setup lang="ts">
// 步骤 0：占位页面。后续步骤在此挂载网格 / 字盘 / 计时 / 弹窗等组件。
const buildTime = new Date().toISOString()
</script>

<template>
  <main class="game-page">
    <h1>宇宙人歌词填字</h1>
    <p class="subtitle">脚手架就绪 · 步骤 0</p>
    <p class="meta">构建时间 {{ buildTime }}</p>
  </main>
</template>

<style scoped>
.game-page {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.subtitle {
  margin: 0;
  color: var(--color-ink-soft);
}

.meta {
  margin: 0;
  font-size: 12px;
  color: var(--color-ink-soft);
}
</style>
