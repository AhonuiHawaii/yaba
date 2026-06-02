<script setup>
defineProps({
  title: { type: String, default: '' }
})

const emit = defineEmits(['toggle-drawer', 'navigate'])
</script>

<template>
  <v-toolbar density="compact" elevation="0" border="b" color="surface">
    <v-app-bar-nav-icon @click="emit('toggle-drawer')" />

    <v-toolbar-title>
      <span class="font-weight-bold">{{ title }}</span>
    </v-toolbar-title>

    <v-spacer />

    <v-text-field
      placeholder="Search transactions"
      prepend-inner-icon="mdi-magnify"
      variant="solo"
      density="compact"
      hide-details
      rounded="lg"
      style="max-width: 260px"
      class="mr-2"
    />

    <v-btn
      variant="flat"
      color="primary"
      size="small"
      prepend-icon="mdi-download-outline"
      class="mr-2"
      @click="emit('navigate', 'Import')"
    >
      Import OFX
    </v-btn>

    <slot />
  </v-toolbar>
</template>
