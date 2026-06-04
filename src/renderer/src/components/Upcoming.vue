<template>
  <v-container fluid class="pa-4">
    <v-sheet rounded="lg" elevation="2" class="pa-4">
      <div v-if="loading" class="d-flex justify-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div
        v-else-if="!soonItems.length && !laterItems.length"
        class="d-flex flex-column align-center text-medium-emphasis pa-8"
      >
        <v-icon size="60" class="mb-3" style="opacity: 0.3" icon="mdi-calendar-check" />
        <div class="text-body-2">Nothing due in the next 30 days.</div>
      </div>

      <template v-else>
        <!-- Due within 7 days -->
        <template v-if="soonItems.length">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2 px-1">
            Next 7 Days
          </div>
          <v-list class="pa-0 mb-4" density="compact">
            <v-list-item v-for="item in soonItems" :key="item.name" rounded="lg" class="mb-1 px-3">
              <template #prepend>
                <v-avatar
                  :color="item.urgencyColor"
                  variant="tonal"
                  size="32"
                  rounded="lg"
                  class="mr-3"
                >
                  <span class="text-caption font-weight-bold">{{ item.initials }}</span>
                </v-avatar>
              </template>

              <template #title>
                <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
              </template>
              <template #subtitle>
                <span class="text-caption text-medium-emphasis">
                  {{ item.lastFour ? `••••${item.lastFour}` : item.frequency }}
                </span>
              </template>

              <template #append>
                <div class="d-flex align-center gap-3">
                  <v-chip :color="item.urgencyColor" size="x-small" variant="flat" rounded="lg">
                    {{ item.dueLabel }}
                  </v-chip>
                  <span
                    class="text-body-2 font-weight-bold"
                    style="min-width: 64px; text-align: right"
                  >
                    {{ formatCurrency(item.typicalAmount) }}
                  </span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </template>

        <!-- Coming soon (8–30 days) -->
        <template v-if="laterItems.length">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2 px-1">
            Coming Later
          </div>
          <v-list class="pa-0" density="compact">
            <v-list-item v-for="item in laterItems" :key="item.name" rounded="lg" class="mb-1 px-3">
              <template #prepend>
                <v-avatar color="secondary" variant="tonal" size="32" rounded="lg" class="mr-3">
                  <span class="text-caption font-weight-bold">{{ item.initials }}</span>
                </v-avatar>
              </template>

              <template #title>
                <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
              </template>
              <template #subtitle>
                <span class="text-caption text-medium-emphasis">
                  {{ item.lastFour ? `••••${item.lastFour}` : item.frequency }}
                </span>
              </template>

              <template #append>
                <div class="d-flex align-center gap-3">
                  <span class="text-caption text-medium-emphasis">{{ item.dueLabel }}</span>
                  <span
                    class="text-body-2 font-weight-medium"
                    style="min-width: 64px; text-align: right"
                  >
                    {{ formatCurrency(item.typicalAmount) }}
                  </span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </template>
      </template>
    </v-sheet>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'

const { formatCurrency } = useUserSettingsStore()
const recurringTransactions = ref([])
const loading = ref(false)

async function fetchRecurring() {
  loading.value = true
  const result = await window.electron.ipcRenderer.invoke('transactions:fetch', { subscription: 1 })
  if (result.success) recurringTransactions.value = result.data
  loading.value = false
}

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function daysUntil(dayOfMonth) {
  if (!dayOfMonth) return null
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
  const target = thisMonth >= now ? thisMonth : nextMonth
  return Math.round((target - now) / 86400000)
}

function dueLabel(days) {
  if (days === null) return null
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function urgencyColor(days) {
  if (days === null) return 'default'
  if (days < 0) return 'error'
  if (days <= 3) return 'warning'
  return 'primary'
}

const allItems = computed(() => {
  const map = new Map()

  for (const tx of recurringTransactions.value) {
    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) map.set(key, { name: key, amounts: [], days: [], acctid: tx.ACCTID || null })
    const g = map.get(key)
    const amt = Math.abs(Number(tx.TRNAMT))
    if (amt > 0) g.amounts.push(amt)
    if (tx.DTPOSTED?.length >= 8) g.days.push(parseInt(tx.DTPOSTED.slice(6, 8), 10))
  }

  return [...map.values()]
    .map((g) => {
      const typicalAmount = median(g.amounts)
      const typicalDay = g.days.length ? median(g.days) : null
      const days = daysUntil(typicalDay)
      const initials = g.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
      const lastFour = g.acctid ? g.acctid.slice(-4) : null

      return {
        name: g.name,
        typicalAmount,
        typicalDay,
        days,
        dueLabel: dueLabel(days),
        urgencyColor: urgencyColor(days),
        frequency: 'Monthly',
        initials,
        lastFour
      }
    })
    .filter((item) => item.typicalDay !== null && item.days !== null && item.days <= 30)
    .sort((a, b) => a.days - b.days)
})

const soonItems = computed(() => allItems.value.filter((item) => item.days <= 7))
const laterItems = computed(() => allItems.value.filter((item) => item.days > 7))

onMounted(async () => {
  await fetchRecurring()
})
</script>
