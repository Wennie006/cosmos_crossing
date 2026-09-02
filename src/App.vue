<script setup lang="ts">
import bgUrl from './assets/bg/background.png'
import GamePage from './pages/GamePage.vue'
</script>

<template>
  <div
    class="app-bg"
    :style="{ '--app-bg-image': `url(${bgUrl})` }"
    aria-hidden="true"
  />
  <GamePage />
</template>
