<template>
  <v-container fluid class="pa-4">
    <v-card rounded="lg" elevation="1" class="pa-4">
      <!-- Navigation -->
      <div class="d-flex align-center ga-2 mb-5">
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          density="comfortable"
          size="small"
          @click="prevMonth"
        />
        <div class="text-h6 font-weight-bold text-center w-25">{{ monthTitle }}</div>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          density="comfortable"
          size="small"
          @click="nextMonth"
        />
        <v-btn size="small" variant="tonal" rounded="lg" @click="goToday">Today</v-btn>
        <v-spacer />
        <div class="d-flex ga-2">
          <v-chip
            v-if="displayType === 'all' || displayType === 'subscriptions'"
            class="legend-chip legend-sub"
            size="small"
            rounded="lg"
          >
            Subscriptions
          </v-chip>
          <v-chip
            v-if="displayType === 'all' || displayType === 'bills'"
            class="legend-chip legend-bill"
            size="small"
            rounded="lg"
          >
            Bills
          </v-chip>
          <v-chip
            v-if="displayType === 'all' || displayType === 'debt'"
            class="legend-chip legend-debt"
            size="small"
            rounded="lg"
          >
            Debts
          </v-chip>
        </div>
      </div>

      <!-- Vuetify Calendar -->
      <v-sheet height="600">
        <v-calendar
          ref="calendarRef"
          v-model="selectedDate"
          :events="calendarEvents"
          view-mode="month"
          @click:event="handleEventClick"
          @change="updateView"
        ></v-calendar>
      </v-sheet>

      <!-- Detail dialog -->
      <v-dialog v-model="dialogOpen" max-width="400">
        <v-card v-if="selected" rounded="lg">
          <v-card-title class="pa-5 pb-3">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center gap-2">
                <v-icon :color="typeColor" size="24">{{ typeIcon }}</v-icon>
                <span class="text-h6 font-weight-bold line-clamp-1">{{ selected.name }}</span>
              </div>
              <v-btn
                icon="mdi-close"
                variant="text"
                density="compact"
                @click="dialogOpen = false"
              />
            </div>
          </v-card-title>
          <v-divider />

          <v-card-text class="pa-5">
            <!-- Universal fields -->
            <div class="d-flex justify-space-between align-center mb-4">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                {{
                  selected.priceUp
                    ? 'Current Amount'
                    : selected.frequency === 'debt'
                      ? 'Minimum Payment'
                      : 'Typical Amount'
                }}
              </span>
              <span class="text-h5 font-weight-bold" :class="`text-${typeColor}`">
                {{
                  formatCurrency(selected.priceUp ? selected.currentAmount : selected.typicalAmount)
                }}
              </span>
            </div>

            <v-divider class="mb-4" />

            <!-- Subscription specific -->
            <template v-if="selected.frequency === 'subscription'">
              <div v-if="selected.priceUp" class="d-flex justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">Previous Amount</span>
                <span class="text-body-2 text-medium-emphasis">{{
                  formatCurrency(selected.previousAmount)
                }}</span>
              </div>
              <div v-if="selected.monthCount" class="d-flex justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">Detected</span>
                <span class="text-body-2 text-medium-emphasis">
                  {{ selected.monthCount }} month{{ selected.monthCount !== 1 ? 's' : '' }}
                </span>
              </div>
            </template>

            <!-- Bill specific -->
            <template v-if="selected.frequency === 'bill'">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">Status</span>
                <v-chip size="x-small" :color="selected.isPaid ? 'success' : 'info'" variant="flat">
                  {{ selected.isPaid ? 'Paid' : 'Upcoming' }}
                </v-chip>
              </div>
            </template>

            <!-- Debt specific -->
            <template v-if="selected.frequency === 'debt'">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">Interest Rate (APR)</span>
                <span class="text-body-2 text-medium-emphasis">{{ selected.interestRate }}%</span>
              </div>
              <div v-if="selected.creditLimit > 0" class="d-flex justify-space-between mb-2">
                <span class="text-body-2 font-weight-medium">Credit Limit</span>
                <span class="text-body-2 text-medium-emphasis">{{
                  formatCurrency(selected.creditLimit)
                }}</span>
              </div>
            </template>

            <!-- Universal Category -->
            <div v-if="selected.category" class="d-flex justify-space-between mt-2">
              <span class="text-body-2 font-weight-medium">Category</span>
              <span class="text-body-2 text-medium-emphasis">{{
                categoryName(selected.category)
              }}</span>
            </div>
          </v-card-text>

          <v-card-actions class="pa-5 pt-0">
            <v-spacer />
            <v-btn variant="tonal" rounded="lg" @click="dialogOpen = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserAccountsStore } from '../stores/userAccounts'

const props = defineProps({
  displayType: { type: String, default: 'all' }
})

const { formatCurrency } = useUserSettingsStore()
const categoriesStore = useUserCategoriesStore()
const accountsStore = useUserAccountsStore()

function categoryName(id) {
  return categoriesStore.categoryById[id]?.name ?? null
}

const subTxs = ref([])
const billTxs = ref([])

async function fetchData() {
  try {
    const promises = []
    if (props.displayType === 'all' || props.displayType === 'subscriptions') {
      promises.push(
        window.electron.ipcRenderer
          .invoke('transactions:fetch', { subscription: 1 })
          .then((res) => {
            if (res.success) subTxs.value = res.data
          })
      )
    }
    if (props.displayType === 'all' || props.displayType === 'bills') {
      promises.push(
        window.electron.ipcRenderer.invoke('transactions:fetch', { bill: 1 }).then((res) => {
          if (res.success) billTxs.value = res.data
        })
      )
    }
    if (props.displayType === 'all' || props.displayType === 'debt') {
      promises.push(accountsStore.fetchAccounts())
    }
    await Promise.all(promises)
  } catch (err) {
    console.error('Calendar failed to fetch data:', err)
  }
}

onMounted(fetchData)
watch(() => props.displayType, fetchData)

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function getGroupedItems(txList, typeStr) {
  const map = new Map()
  for (const tx of txList) {
    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) {
      map.set(key, { name: key, amounts: [], days: [], months: new Set(), category: tx.category })
    }
    const g = map.get(key)
    const amt = Math.abs(Number(tx.TRNAMT))
    if (amt > 0) g.amounts.push(amt)
    if (tx.DTPOSTED?.length >= 8) {
      g.days.push(parseInt(tx.DTPOSTED.slice(6, 8), 10))
    }
    if (tx.DTPOSTED?.length >= 6) g.months.add(tx.DTPOSTED.slice(0, 6))
  }

  const today = new Date()
  const currentMonthStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`

  return [...map.values()]
    .map((g) => {
      const typicalAmount = median(g.amounts)
      const typicalDay = g.days.length ? median(g.days) : null
      const isPaid = g.months.has(currentMonthStr)
      const prev = g.amounts.slice(0, -1)
      const histMedian = prev.length >= 2 ? median(prev) : median(g.amounts)
      const currentAmount = g.amounts[g.amounts.length - 1] || 0
      const priceUp =
        typeStr === 'subscription' && prev.length >= 2 && currentAmount > histMedian * 1.05

      return {
        name: g.name,
        category: g.category,
        typicalAmount,
        currentAmount,
        priceUp,
        previousAmount: priceUp ? histMedian : null,
        typicalDay,
        isPaid,
        frequency: typeStr,
        monthCount: g.months.size
      }
    })
    .filter((item) => item.typicalDay !== null)
}

function getDebtItems() {
  const debtAccounts = accountsStore.accounts.filter((account) => {
    const t = String(account.ACCTTYPE || '').toLowerCase()
    return (
      t.includes('credit') ||
      t.includes('loan') ||
      t.includes('mortgage') ||
      t.includes('buy now pay later') ||
      t.includes('medical debt') ||
      t === 'other'
    )
  })

  return debtAccounts
    .map((d) => ({
      name: d.displayName || d.ORG || 'Account ' + String(d.ACCTID).slice(-4),
      typicalAmount: Number(d.minimumPayment) || 0,
      typicalDay: d.dueDate,
      isPaid: false,
      frequency: 'debt',
      creditLimit: d.creditLimit,
      interestRate: d.interestRate
    }))
    .filter((d) => d.typicalDay)
}

// ── Month navigation ──────────────────────────────────────────────────────────

const calendarRef = ref(null)
const selectedDate = ref([new Date()])
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const monthTitle = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function updateView({ start, end }) {
  if (!start || !end) return
  const s = new Date(`${start.date}T00:00:00`)
  const e = new Date(`${end.date}T00:00:00`)
  const mid = new Date((s.getTime() + e.getTime()) / 2)
  viewYear.value = mid.getFullYear()
  viewMonth.value = mid.getMonth()
}

function prevMonth() {
  if (calendarRef.value) calendarRef.value.prev()
}
function nextMonth() {
  if (calendarRef.value) calendarRef.value.next()
}
function goToday() {
  selectedDate.value = [new Date()]
}

// ── Event generation ──────────────────────────────────────────────────────────

const calendarEvents = computed(() => {
  const events = []
  const y = viewYear.value
  const m = viewMonth.value
  const daysInMonth = new Date(y, m + 1, 0).getDate()

  const subs =
    props.displayType === 'all' || props.displayType === 'subscriptions'
      ? getGroupedItems(subTxs.value, 'subscription')
      : []
  const bills =
    props.displayType === 'all' || props.displayType === 'bills'
      ? getGroupedItems(billTxs.value, 'bill')
      : []
  const debts = props.displayType === 'all' || props.displayType === 'debt' ? getDebtItems() : []

  const allItems = [...subs, ...bills, ...debts]

  for (const item of allItems) {
    const day = item.typicalDay
    if (!day || day < 1 || day > daysInMonth) continue
    const date = new Date(y, m, day, 12, 0, 0)

    let customClass = ''
    if (item.frequency === 'subscription') {
      customClass = item.priceUp ? 'event-sub-up' : 'event-sub'
    } else if (item.frequency === 'bill') {
      customClass = item.isPaid ? 'event-bill-paid' : 'event-bill'
    } else if (item.frequency === 'debt') {
      customClass = 'event-debt'
    }

    const amt = item.priceUp ? item.currentAmount : item.typicalAmount
    events.push({
      title: `${item.name} · ${formatCurrency(amt)}`,
      start: date,
      end: date,
      allDay: true,
      class: customClass,
      raw: item
    })
  }

  return events
})

// ── Detail dialog ─────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const selected = ref(null)

const typeColor = computed(() => {
  if (!selected.value) return 'primary'
  if (selected.value.frequency === 'subscription')
    return selected.value.priceUp ? 'error' : 'primary'
  if (selected.value.frequency === 'bill') return selected.value.isPaid ? 'success' : 'info'
  if (selected.value.frequency === 'debt') return 'secondary'
  return 'primary'
})

const typeIcon = computed(() => {
  if (!selected.value) return 'mdi-calendar-check'
  if (selected.value.frequency === 'subscription') return 'mdi-youtube-subscription'
  if (selected.value.frequency === 'bill') return 'mdi-receipt-text-outline'
  if (selected.value.frequency === 'debt') return 'mdi-credit-card-outline'
  return 'mdi-calendar-check'
})

function handleEventClick(payload) {
  if (payload.event && payload.event.raw) {
    selected.value = payload.event.raw
    dialogOpen.value = true
  }
}
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.v-calendar-event) {
  border-radius: 4px;
}

/* Subscription */
:deep(.event-sub) {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
  border-left: 3px solid rgb(var(--v-theme-primary)) !important;
}
:deep(.event-sub-up) {
  background-color: rgba(var(--v-theme-error), 0.15) !important;
  color: rgb(var(--v-theme-error)) !important;
  border-left: 3px solid rgb(var(--v-theme-error)) !important;
}

/* Bill */
:deep(.event-bill) {
  background-color: rgba(var(--v-theme-info), 0.15) !important;
  color: rgb(var(--v-theme-info)) !important;
  border-left: 3px solid rgb(var(--v-theme-info)) !important;
}
:deep(.event-bill-paid) {
  background-color: rgba(var(--v-theme-success), 0.15) !important;
  color: rgb(var(--v-theme-success)) !important;
  border-left: 3px solid rgb(var(--v-theme-success)) !important;
}

/* Debt */
:deep(.event-debt) {
  background-color: rgba(var(--v-theme-secondary), 0.15) !important;
  color: rgb(var(--v-theme-secondary)) !important;
  border-left: 3px solid rgb(var(--v-theme-secondary)) !important;
}

/* Legends */
.legend-chip {
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.legend-sub {
  background-color: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
}
.legend-bill {
  background-color: rgba(var(--v-theme-info), 0.15);
  color: rgb(var(--v-theme-info));
}
.legend-debt {
  background-color: rgba(var(--v-theme-secondary), 0.15);
  color: rgb(var(--v-theme-secondary));
}
</style>
