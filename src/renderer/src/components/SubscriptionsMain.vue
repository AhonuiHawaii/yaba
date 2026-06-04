<template>
  <v-container fluid class="pa-4">
    <div v-if="loading" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <template v-else>
      <!-- Summary cards -->
      <div class="summary-grid mb-4">
        <v-card
          v-for="card in summaryCards"
          :key="card.title"
          rounded="sm"
          elevation="1"
          class="pa-4"
        >
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1">
            {{ card.title }}
          </div>
          <div class="text-h5 font-weight-bold" :class="card.valueClass">{{ card.value }}</div>
          <div class="text-caption text-medium-emphasis">{{ card.subtitle }}</div>
        </v-card>
      </div>

      <!-- Table -->
      <v-card rounded="sm" elevation="1">
        <div
          class="sub-row sub-row--header text-caption text-uppercase font-weight-bold text-medium-emphasis"
        >
          <span>Service</span>
          <span>Category</span>
          <span>Billing</span>
          <span>Next charge</span>
          <span class="text-right">Amount</span>
          <span>Status</span>
          <span></span>
        </div>
        <v-divider />

        <div
          v-if="!subscriptions.length"
          class="d-flex flex-column align-center text-medium-emphasis pa-12"
        >
          <v-icon size="48" class="mb-3" style="opacity: 0.3" icon="mdi-calendar-sync" />
          <div class="text-body-2">No subscriptions found.</div>
        </div>

        <template v-for="(sub, i) in subscriptions" :key="sub.name">
          <div class="sub-row">
            <!-- Service -->
            <div class="d-flex align-center ga-3">
              <v-avatar
                color="primary"
                variant="tonal"
                size="36"
                rounded="sm"
                class="flex-shrink-0"
              >
                <span class="text-caption font-weight-bold">{{ sub.initials }}</span>
              </v-avatar>
              <div class="min-width-0">
                <div class="text-body-2 font-weight-medium text-truncate">{{ sub.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  <span v-if="sub.priceUp" class="text-warning"
                    >▲ up from {{ formatCurrency(sub.previousAmount) }}</span
                  >
                  <span v-else-if="sub.unused">no charge in {{ sub.daysSinceCharge }} days</span>
                  <span v-else-if="sub.billing === 'Yearly'">detected yearly</span>
                  <span v-else-if="sub.fromRule">added manually</span>
                  <span v-else
                    >detected from {{ sub.monthCount }} import{{
                      sub.monthCount !== 1 ? 's' : ''
                    }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Category -->
            <div>
              <v-chip v-if="sub.category" size="x-small" variant="tonal" color="teal" rounded="sm">
                {{ sub.category }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">—</span>
            </div>

            <!-- Billing -->
            <div>
              <span class="text-body-2 text-medium-emphasis">{{ sub.billing }}</span>
            </div>

            <!-- Next charge -->
            <div>
              <span class="text-body-2 text-medium-emphasis">{{ sub.nextChargeLabel }}</span>
            </div>

            <!-- Amount -->
            <div class="text-right">
              <span class="text-body-2 font-weight-bold">
                {{
                  sub.billing === 'Yearly'
                    ? `${formatCurrency(sub.currentAmount)}/yr`
                    : formatCurrency(sub.currentAmount)
                }}
              </span>
            </div>

            <!-- Status -->
            <div>
              <v-chip
                v-if="sub.status === 'priceUp'"
                size="x-small"
                color="orange"
                variant="flat"
                rounded="sm"
              >
                Price up
              </v-chip>
              <v-chip
                v-else-if="sub.status === 'unused'"
                size="x-small"
                color="amber-darken-2"
                variant="flat"
                rounded="sm"
              >
                Unused?
              </v-chip>
              <v-chip v-else size="x-small" color="success" variant="flat" rounded="sm">
                Active
              </v-chip>
            </div>

            <!-- Action -->
            <div>
              <v-btn
                v-if="sub.status === 'unused'"
                size="x-small"
                variant="outlined"
                rounded="sm"
                color="amber-darken-2"
                @click="emit('cancel', sub)"
                >Review</v-btn
              >
              <v-btn
                v-else
                size="x-small"
                variant="outlined"
                rounded="sm"
                @click="emit('cancel', sub)"
                >Cancel</v-btn
              >
            </div>
          </div>
          <v-divider v-if="i < subscriptions.length - 1" />
        </template>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'

const props = defineProps({
  subscriptions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['cancel'])

const settingsStore = useUserSettingsStore()
const { formatCurrency } = settingsStore

const activeCount = computed(() => props.subscriptions.filter((s) => s.status === 'active').length)

const monthlyTotal = computed(() =>
  props.subscriptions
    .filter((s) => s.billing !== 'Yearly')
    .reduce((sum, s) => sum + (s.currentAmount || 0), 0)
)

const yearlyTotal = computed(() => {
  const fromMonthly = monthlyTotal.value * 12
  const fromYearly = props.subscriptions
    .filter((s) => s.billing === 'Yearly')
    .reduce((sum, s) => sum + (s.currentAmount || 0), 0)
  return fromMonthly + fromYearly
})

const renewingSoonCount = computed(() => {
  const now = Date.now()
  return props.subscriptions.filter(
    (s) => s.nextCharge && (s.nextCharge.getTime() - now) / 86400000 <= 7
  ).length
})

const summaryCards = computed(() => [
  {
    title: 'Monthly Total',
    value: formatCurrency(monthlyTotal.value),
    subtitle: `${activeCount.value} active sub${activeCount.value !== 1 ? 's' : ''}`,
    valueClass: ''
  },
  {
    title: 'Yearly',
    value: formatCurrency(yearlyTotal.value),
    subtitle: 'if nothing changes',
    valueClass: ''
  },
  {
    title: 'Renewing Soon',
    value: String(renewingSoonCount.value),
    subtitle: 'next 7 days',
    valueClass: ''
  }
])
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sub-row {
  display: grid;
  grid-template-columns: 1fr 128px 80px 110px 96px 106px 86px;
  align-items: center;
  column-gap: 12px;
  padding: 12px 16px;
}

.sub-row--header {
  padding: 8px 16px;
}

.min-width-0 {
  min-width: 0;
}
</style>
