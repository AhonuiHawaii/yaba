<template>
  <div class="d-flex align-center gap-3">
    <div class="d-flex align-center">
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        density="compact"
        size="small"
        @click="prevPeriod"
      />
      <span class="text-body-2 font-weight-medium mx-2 text-no-wrap">{{ periodLabel }}</span>
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        density="compact"
        size="small"
        :disabled="isNextPeriodFuture"
        @click="nextPeriod"
      />
    </div>
    <v-btn-toggle
      v-model="period"
      color="primary"
      mandatory
      density="compact"
      rounded="lg"
      variant="outlined"
      divided
    >
      <v-btn value="month" size="small">Month</v-btn>
      <v-btn value="quarter" size="small">Quarter</v-btn>
      <v-btn value="semi" size="small">Semi</v-btn>
      <v-btn value="annual" size="small">Annual</v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'

const _pf = usePeriodFilter()
const { period, periodLabel, isNextPeriodFuture } = storeToRefs(_pf)
const { prevPeriod, nextPeriod } = _pf
</script>
