<template>
  <v-app-bar location="bottom" density="compact" elevation="0" class="app-footer">
    <div class="status-text text-caption text-medium-emphasis">
      &copy; {{ new Date().getFullYear() }} {{ productName }}. All rights reserved.
      &nbsp;&middot;&nbsp;
      <a class="privacy-link" href="#" @click.prevent="emit('change-view', 'Privacy')">Privacy</a>
    </div>
  </v-app-bar>
</template>

<script setup>
const productName = window.api?.productName ?? ''
const emit = defineEmits(['change-view'])
</script>

<style scoped>
.custom-status-bar {
  user-select: none;
}

.status-text {
  flex: 1;
  text-align: center;
}

.privacy-link {
  text-decoration: none;
  color: inherit;
}

.privacy-link:hover {
  text-decoration: underline;
}
</style>
