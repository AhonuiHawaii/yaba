<template>
  <v-app-bar density="compact" elevation="0" class="custom-title-bar" @dblclick="handleMaximize">
    <div class="traffic-lights" @dblclick.stop>
      <button type="button" class="tl tl-close" aria-label="Close" @click="handleClose">
        <svg viewBox="0 0 10 10" class="tl-glyph"><path d="M2,2 L8,8 M8,2 L2,8" /></svg>
      </button>
      <button type="button" class="tl tl-min" aria-label="Minimize" @click="handleMinimize">
        <svg viewBox="0 0 10 10" class="tl-glyph"><path d="M2,5 L8,5" /></svg>
      </button>
      <button
        type="button"
        class="tl tl-max"
        :aria-label="isMaximized ? 'Restore' : 'Maximize'"
        @click="handleMaximize"
      >
        <svg viewBox="0 0 10 10" class="tl-glyph">
          <path v-if="isMaximized" d="M2,4 L6,4 L6,8 L2,8 Z M4,4 L4,2 L8,2 L8,6 L6,6" />
          <path v-else d="M2.5,2.5 L7.5,2.5 L7.5,7.5 L2.5,7.5 Z" />
        </svg>
      </button>
    </div>

    <div class="title-text">{{ productName }} {{ appVersion }}</div>
  </v-app-bar>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// const appName = window.api?.name ?? ''
const appVersion = window.api?.version ?? ''
const productName = window.api?.productName ?? ''

const isMaximized = ref(false)
let unsubscribe = null

onMounted(async () => {
  isMaximized.value = await window.api.window.isMaximized()
  unsubscribe = window.api.window.onMaximizedChange((v) => {
    isMaximized.value = v
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})

const handleMinimize = () => window.api.window.minimize()
const handleMaximize = () => window.api.window.maximize()
const handleClose = () => window.api.window.close()
</script>

<style scoped>
.custom-title-bar {
  -webkit-app-region: drag;
  user-select: none;
}

.custom-title-bar :deep(.v-toolbar__content) {
  padding-left: 12px;
  background-color: rgba(var(--v-theme-primary-container));
  border: 1px solid rgba(var(--v-theme-primary), 0) !important;
}

.title-text {
  flex: 1;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  opacity: 0.75;
}

.traffic-lights {
  -webkit-app-region: no-drag;
  display: flex;
  gap: 12px;
  align-items: center;
}

.tl {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tl-close {
  background: #ff5f57;
}
.tl-min {
  background: #febc2e;
}
.tl-max {
  background: #28c840;
}

.tl:hover {
  filter: brightness(0.92);
}

/* dim when window unfocused — Electron toggles body class via @electron-toolkit, fallback: always color */
:global(body.window-blur) .tl {
  background: #4f4f4f;
}

.tl-glyph {
  width: 12px;
  height: 12px;
  opacity: 0;
  pointer-events: none;
}

.tl-glyph path {
  stroke: rgba(0, 0, 0, 0.65);
  stroke-width: 1.2;
  stroke-linecap: round;
  fill: none;
}

.traffic-lights:hover .tl-glyph {
  opacity: 1;
}
</style>
