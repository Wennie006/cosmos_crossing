<script setup lang="ts">
// hintCount 按 PRD §4.5 记录但本期不展示，故本组件不接收/渲染次数。
defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ hint: [] }>()
</script>

<template>
  <button type="button" class="hint-btn" :disabled="disabled" @click="emit('hint')">
    提示
  </button>
</template>

<style scoped>
.hint-btn {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-ink-soft);
}

.hint-btn:disabled {
  opacity: 0.4;
}
</style>
