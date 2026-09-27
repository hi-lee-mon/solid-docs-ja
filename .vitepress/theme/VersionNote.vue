<script setup lang="ts">
// Commit of solidjs/solid-docs (v2-rebuild branch) that this translation covers.
const srcSha = '3884838e'
const srcDate = '2026-09-18'
const srcUrl = `https://github.com/solidjs/solid-docs/commit/3884838e91f084fc497ebbb18b79c24fbd10e857`
const buildDate = import.meta.env.VITE_BUILD_DATE
</script>

<template>
  <div class="version-note">
    <span>非公式翻訳 · 原著 &copy; Solid（<a href="https://github.com/solidjs/solid-docs">MIT License</a>）</span>
    <span class="sep">·</span>
    <span>翻訳対象: <a :href="srcUrl" target="_blank" rel="noopener">solid-docs@{{ srcSha }}</a>（{{ srcDate }}）</span>
    <span class="sep">·</span>
    <span>翻訳最終更新 {{ buildDate }}</span>
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
