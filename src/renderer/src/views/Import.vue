<template>
  <v-container fluid class="pa-6">
    <div class="mb-5">
      <div class="text-h5 font-weight-bold">Import bank data</div>
      <div class="text-body-2 text-medium-emphasis mt-1">Choose your import method</div>
    </div>

    <v-tabs v-model="tab" class="mb-5" color="primary" align-tabs="center">
      <v-tab value="ofx">Import Quicken/OFX Records</v-tab>
      <v-tab value="csv">Import CSV Records</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="ofx">
        <ofxImport @navigate="handleNavigate" />
      </v-window-item>
      <v-window-item value="csv">
        <cvsImport @navigate="handleNavigate" />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import ofxImport from '../components/ofxImport.vue'
import cvsImport from '../components/cvsImport.vue'

const emit = defineEmits(['navigate'])
const tab = ref('ofx')

function handleNavigate(route) {
  emit('navigate', route)
}
</script>
