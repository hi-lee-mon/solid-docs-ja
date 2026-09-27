<script setup lang="ts">
const sha = import.meta.env.VITE_BUILD_SHA
const date = import.meta.env.VITE_BUILD_DATE
const repo = 'https://github.com/hi-lee-mon/solid-docs-ja'
</script>

<template>
  <div class="version-note">
    <span>非公式翻訳 · 原著 &copy; Solid（<a href="https://github.com/solidjs/solid-docs">MIT License</a>）</span>
    <span class="sep">·</span>
    <a :href="`${repo}/commit/${sha}`" target="_blank" rel="noopener">{{ sha }}</a>
    <span class="sep">·</span>
    <span>最終更新 {{ date }}</span>
  </div>
</template>

<style scoped>
.version-note {
  padding: 16px 24px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.version-note a {
  color: var(--vp-c-text-2);
}
.version-note .sep {
  margin: 0 6px;
}
</style>
