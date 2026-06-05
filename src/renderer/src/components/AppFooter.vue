<template>
  <v-app-bar location="bottom" density="compact" elevation="0" class="app-footer">
    <div class="status-text text-caption text-medium-emphasis">
      &copy; {{ new Date().getFullYear() }} {{ productName }}. All rights reserved.
    </div>
  </v-app-bar>
</template>

<script setup>
const productName = window.api?.productName ?? ''
</script>

<style scoped>
.custom-status-bar {
  user-select: none;
}

.status-text {
  flex: 1;
  text-align: center;
}
</style>
