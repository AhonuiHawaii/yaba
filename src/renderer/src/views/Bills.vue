<template>
  <div class="d-flex flex-column h-100">
    <!-- Page header -->
    <div class="d-flex align-center px-5 pt-5 pb-3">
      <div>
        <div class="text-h6 font-weight-bold">Bills</div>
        <div class="text-caption text-medium-emphasis">
          Recurring payments detected from imports
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="px-5 mb-4" color="primary">
      <v-tab value="list" prepend-icon="mdi-format-list-bulleted">List</v-tab>
      <v-tab value="calendar" prepend-icon="mdi-calendar-month-outline">Calendar</v-tab>
    </v-tabs>

    <!-- Tab content -->
    <v-tabs-window v-model="activeTab">
      <!-- ── LIST VIEW ── -->
      <v-tabs-window-item value="list">
        <div v-if="loading" class="d-flex justify-center pa-12">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else>
          <!-- Summary cards -->
          <div class="summary-grid px-5 mb-4">
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

          <!-- Bills table -->
          <div class="px-5 pb-6">
            <v-card rounded="sm" elevation="1">
              <div
                class="bill-row bill-row--header text-caption text-uppercase font-weight-bold text-medium-emphasis"
              >
                <span>Bill</span>
                <span>Category</span>
                <span>Billing</span>
                <span>Due Date</span>
                <span>Last paid</span>
                <span class="text-right">Amount</span>
                <span>Status</span>
              </div>
              <v-divider />

              <div
                v-if="!billItems.length"
                class="d-flex flex-column align-center text-medium-emphasis pa-12"
              >
                <v-icon size="48" class="mb-3" style="opacity: 0.3" icon="mdi-calendar-sync" />
                <div class="text-body-2">No bills found.</div>
                <div class="text-caption mt-1">
                  Mark a rule as "Bill" in Rules to track transactions here.
                </div>
              </div>

              <template v-for="(bill, i) in billItems" :key="bill.name">
                <div class="bill-row">
                  <!-- Bill name -->
                  <div class="d-flex align-center ga-3">
                    <div class="min-width-0">
                      <div class="text-body-2 font-weight-medium text-truncate">
                        {{ bill.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">Monthly</div>
                    </div>
                  </div>

                  <!-- Category -->
                  <div>
                    <v-chip
                      v-if="categoryName(bill.category)"
                      size="x-small"
                      variant="tonal"
                      color="teal"
                      rounded="sm"
                      >{{ categoryName(bill.category) }}</v-chip
                    >
                    <span v-else class="text-caption text-medium-emphasis">—</span>
                  </div>

                  <!-- Billing -->
                  <div>
                    <span class="text-body-2 text-medium-emphasis">Monthly</span>
                  </div>

                  <!-- Due date with picker -->
                  <div class="d-flex align-center ga-1">
                    <span class="text-body-2 text-medium-emphasis">
                      {{
                        editingKey === bill.name && editingDate
                          ? formatEditDate(editingDate)
                          : bill.nextDueLabel
                      }}
                    </span>
                    <v-btn
                      v-if="editingKey !== bill.name"
                      icon="mdi-pencil-outline"
                      size="x-small"
                      variant="text"
                      density="compact"
                      @click="startEdit(bill)"
                    />
                    <template v-else>
                      <v-menu v-model="pickerOpen" :close-on-content-click="false">
                        <template #activator="{ props: menuProps }">
                          <v-btn
                            icon="mdi-calendar"
                            size="x-small"
                            variant="text"
                            density="compact"
                            v-bind="menuProps"
                          />
                        </template>
                        <v-date-picker v-model="editingDate" hide-header>
                          <template #actions>
                            <v-btn variant="text" @click="pickerOpen = false">Cancel</v-btn>
                            <v-btn color="primary" variant="flat" @click="pickerOpen = false"
                              >OK</v-btn
                            >
                          </template>
                        </v-date-picker>
                      </v-menu>
                      <v-btn
                        icon="mdi-check"
                        size="x-small"
                        variant="text"
                        density="compact"
                        color="success"
                        @click="commitDueDate(bill)"
                      />
                    </template>
                  </div>

                  <!-- Last paid -->
                  <div>
                    <span class="text-body-2 text-medium-emphasis">{{ bill.lastPaidLabel }}</span>
                  </div>

                  <!-- Amount -->
                  <div class="text-right">
                    <span class="text-body-2 font-weight-bold">{{
                      formatCurrency(bill.typicalAmount)
                    }}</span>
                  </div>

                  <!-- Status -->
                  <div>
                    <v-chip
                      v-if="bill.isPaid"
                      size="x-small"
                      color="success"
                      variant="flat"
                      rounded="sm"
                      >Paid</v-chip
                    >
                    <v-chip v-else size="x-small" color="primary" variant="flat" rounded="sm"
                      >Upcoming</v-chip
                    >
                  </div>
                </div>
                <v-divider v-if="i < billItems.length - 1" />
              </template>
            </v-card>
          </div>
        </template>
      </v-tabs-window-item>

      <!-- ── CALENDAR VIEW ── -->
      <v-tabs-window-item value="calendar">
        <div class="px-5 pb-6">
          <v-sheet rounded="sm" elevation="2" class="pa-4">
            <!-- Navigation -->
            <div class="d-flex align-center gap-3 mb-6">
              <v-btn
                icon="mdi-chevron-left"
                variant="text"
                density="comfortable"
                @click="prevMonth"
              />
              <span class="text-h6 font-weight-bold cal-title">{{ monthTitle }}</span>
              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                density="comfortable"
                @click="nextMonth"
              />
              <v-btn size="small" variant="flat" rounded="sm" @click="goToday">Today</v-btn>
              <v-spacer />
              <div class="d-flex align-center gap-3">
                <span class="text-caption text-medium-emphasis d-flex align-center gap-1">
                  <v-icon size="12" color="primary">mdi-circle</v-icon> Upcoming
                </span>
                <span class="text-caption text-medium-emphasis d-flex align-center gap-1">
                  <v-icon size="12" color="success">mdi-circle</v-icon> Paid
                </span>
              </div>
            </div>

            <!-- Day-of-week headers -->
            <div class="cal-grid mb-1">
              <div
                v-for="d in ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']"
                :key="d"
                class="text-caption text-center text-uppercase font-weight-bold text-medium-emphasis py-2"
              >
                {{ d }}
              </div>
            </div>

            <!-- Calendar cells -->
            <div class="cal-grid">
              <div
                v-for="day in calendarDays"
                :key="day.key"
                class="cal-cell"
                :class="{ 'cal-cell--other': !day.currentMonth, 'cal-cell--today': day.isToday }"
              >
                <div
                  class="cal-day-num text-caption font-weight-bold mb-1"
                  :class="day.isToday ? 'text-primary' : 'text-medium-emphasis'"
                >
                  <v-avatar
                    v-if="day.isToday"
                    color="primary"
                    size="20"
                    class="text-caption font-weight-bold"
                  >
                    {{ day.date.getDate() }}
                  </v-avatar>
                  <span v-else>{{ day.date.getDate() }}</span>
                </div>

                <template v-if="day.currentMonth">
                  <v-chip
                    v-for="evt in calEventsByDay.get(day.key) || []"
                    :key="evt.name"
                    :color="evt.isPast ? 'success' : 'primary'"
                    size="x-small"
                    variant="flat"
                    class="cal-chip mb-1 cursor-pointer"
                    @click.stop="openCalEvent(evt)"
                  >
                    <span class="cal-chip-label"
                      >{{ evt.name }} · {{ formatCurrency(evt.typicalAmount) }}</span
                    >
                  </v-chip>
                </template>
              </div>
            </div>

            <!-- Event detail dialog -->
            <v-dialog v-model="calDialogOpen" max-width="400">
              <v-card v-if="selectedCalEvent" rounded="sm">
                <v-card-title class="pa-6 pb-4">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center gap-3">
                      <v-icon color="primary" size="20">mdi-calendar-month</v-icon>
                      <span class="text-h6 font-weight-bold">{{ selectedCalEvent.name }}</span>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      density="compact"
                      @click="calDialogOpen = false"
                    />
                  </div>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-6">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                      Typical Amount
                    </div>
                    <div class="text-h6 font-weight-bold text-primary">
                      {{ formatCurrency(selectedCalEvent.typicalAmount) }}
                    </div>
                  </div>
                  <v-divider class="mb-3" />
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-body-2 font-weight-medium">Next due</span>
                    <span class="text-body-2 text-medium-emphasis">{{
                      selectedCalEvent.nextDueLabel
                    }}</span>
                  </div>
                  <div
                    v-if="selectedCalEvent.category"
                    class="d-flex align-center justify-space-between"
                  >
                    <span class="text-body-2 font-weight-medium">Category</span>
                    <span class="text-body-2 text-medium-emphasis">{{
                      categoryName(selectedCalEvent.category)
                    }}</span>
                  </div>
                </v-card-text>
                <v-card-actions class="pa-6 pt-0">
                  <v-spacer />
                  <v-btn variant="tonal" rounded="sm" @click="calDialogOpen = false">Close</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-sheet>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserCategoriesStore } from '../stores/userCategories'

const { formatCurrency } = useUserSettingsStore()
const categoriesStore = useUserCategoriesStore()

function categoryName(id) {
  return categoriesStore.categoryById[id]?.name ?? null
}

const activeTab = ref('list')
const loading = ref(false)
const allTransactions = ref([])
const dueDateOverrides = ref({})

const editingKey = ref(null)
const editingDate = ref(null)
const pickerOpen = ref(false)

function formatEditDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function startEdit(bill) {
  editingKey.value = bill.name
  editingDate.value = bill.nextCharge ? new Date(bill.nextCharge) : new Date()
}

async function commitDueDate(bill) {
  if (editingDate.value && bill.lastFITID) {
    const iso = editingDate.value.toISOString().slice(0, 10)
    dueDateOverrides.value = { ...dueDateOverrides.value, [bill.name]: iso }
    const dueDateInt = parseInt(iso.replace(/-/g, ''), 10)
    await window.electron.ipcRenderer.invoke('transactions:edit', bill.lastFITID, {
      dueDate: dueDateInt
    })
  }
  editingKey.value = null
  editingDate.value = null
  pickerOpen.value = false
}

async function fetchAll() {
  loading.value = true
  const result = await window.electron.ipcRenderer.invoke('transactions:fetchAll')
  if (result.success) allTransactions.value = result.data
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

const billGroups = computed(() => {
  const map = new Map()

  for (const tx of allTransactions.value) {
    if (!tx.bill) continue

    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        amounts: [],
        days: [],
        months: new Set(),
        category: tx.category,
        lastPosted: null,
        lastFITID: null
      })
    }
    const g = map.get(key)
    const amt = Math.abs(Number(tx.TRNAMT))
    if (amt > 0) g.amounts.push(amt)
    if (tx.DTPOSTED?.length >= 8) {
      g.days.push(parseInt(tx.DTPOSTED.slice(6, 8), 10))
      if (!g.lastPosted || tx.DTPOSTED > g.lastPosted) {
        g.lastPosted = tx.DTPOSTED
        g.lastFITID = tx.FITID
      }
    }
    if (tx.DTPOSTED?.length >= 6) g.months.add(tx.DTPOSTED.slice(0, 6))
  }

  const now = new Date()
  const todayDay = now.getDate()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const currentMonthStr = `${todayYear}${String(todayMonth + 1).padStart(2, '0')}`

  return [...map.values()]
    .map((g) => {
      const typicalAmount = median(g.amounts)
      const typicalDay = g.days.length ? median(g.days) : null
      const isPaid = g.months.has(currentMonthStr) && typicalDay !== null && typicalDay < todayDay

      const override = dueDateOverrides.value[g.name]
      let nextCharge = null
      let nextDueLabel = '—'
      if (override) {
        const [oy, om, od] = override.split('-').map(Number)
        nextCharge = new Date(oy, om - 1, od)
        nextDueLabel = nextCharge.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (typicalDay) {
        const days = daysUntil(typicalDay)
        if (days !== null) {
          nextCharge =
            days >= 0
              ? new Date(now.getFullYear(), now.getMonth(), typicalDay)
              : new Date(now.getFullYear(), now.getMonth() + 1, typicalDay)
          nextDueLabel = nextCharge.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      }

      let lastPaidLabel = '—'
      if (g.lastPosted?.length >= 8) {
        const y = parseInt(g.lastPosted.slice(0, 4), 10)
        const mo = parseInt(g.lastPosted.slice(4, 6), 10) - 1
        const d = parseInt(g.lastPosted.slice(6, 8), 10)
        lastPaidLabel = new Date(y, mo, d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
      }

      return {
        name: g.name,
        category: g.category,
        typicalAmount,
        typicalDay,
        isPaid,
        nextDueLabel,
        nextCharge,
        lastPaidLabel,
        lastFITID: g.lastFITID
      }
    })
    .sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return (a.typicalDay ?? 99) - (b.typicalDay ?? 99)
    })
})

const billItems = computed(() => billGroups.value)

const totalDue = computed(() => billItems.value.reduce((s, b) => s + (b.typicalAmount || 0), 0))
const totalPaid = computed(() =>
  billItems.value.filter((b) => b.isPaid).reduce((s, b) => s + (b.typicalAmount || 0), 0)
)
const totalUpcoming = computed(() =>
  billItems.value.filter((b) => !b.isPaid).reduce((s, b) => s + (b.typicalAmount || 0), 0)
)

const summaryCards = computed(() => {
  const paidCount = billItems.value.filter((b) => b.isPaid).length
  const upcomingCount = billItems.value.filter((b) => !b.isPaid).length
  return [
    {
      title: 'Due this month',
      value: formatCurrency(totalDue.value),
      subtitle: `${billItems.value.length} bill${billItems.value.length !== 1 ? 's' : ''}`,
      valueClass: ''
    },
    {
      title: 'Paid',
      value: formatCurrency(totalPaid.value),
      subtitle: `${paidCount} paid`,
      valueClass: 'text-success'
    },
    {
      title: 'Upcoming',
      value: formatCurrency(totalUpcoming.value),
      subtitle: `${upcomingCount} remaining`,
      valueClass: ''
    }
  ]
})

// ── Calendar navigation ───────────────────────────────────────────────────────

const today = new Date()

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

function offsetMonth(yyyymm, delta) {
  const year = Number(yyyymm.slice(0, 4))
  const month = Number(yyyymm.slice(4)) - 1
  const d = new Date(year, month + delta, 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonthValue())
const viewYear = computed(() => Number(selectedMonth.value.slice(0, 4)))
const viewMonth = computed(() => Number(selectedMonth.value.slice(4, 6)) - 1)
const monthTitle = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
)

function prevMonth() {
  selectedMonth.value = offsetMonth(selectedMonth.value, -1)
}
function nextMonth() {
  selectedMonth.value = offsetMonth(selectedMonth.value, 1)
}
function goToday() {
  selectedMonth.value = currentMonthValue()
}

// ── Calendar grid ─────────────────────────────────────────────────────────────

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const calendarDays = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrevMonth = new Date(y, m, 0).getDate()
  const todayKey = dateKey(today)
  const days = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const date = new Date(y, m - 1, daysInPrevMonth - i)
    days.push({ date, key: dateKey(date), currentMonth: false, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d)
    const key = dateKey(date)
    days.push({ date, key, currentMonth: true, isToday: key === todayKey })
  }
  const trailing = 42 - days.length
  for (let d = 1; d <= trailing; d++) {
    const date = new Date(y, m + 1, d)
    days.push({ date, key: dateKey(date), currentMonth: false, isToday: false })
  }
  return days
})

const calEventsByDay = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth()
  const map = new Map()

  for (const bill of billGroups.value) {
    const day = bill.typicalDay
    if (!day || day < 1 || day > daysInMonth) continue
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isPast = isCurrentMonth ? day < today.getDate() : new Date(y, m, day) < today
    const nextDueLabel = new Date(y, m, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    if (!map.has(key)) map.set(key, [])
    map.get(key).push({ ...bill, isPast, nextDueLabel })
  }
  return map
})

const calDialogOpen = ref(false)
const selectedCalEvent = ref(null)

function openCalEvent(evt) {
  selectedCalEvent.value = evt
  calDialogOpen.value = true
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(fetchAll)
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.bill-row {
  display: grid;
  grid-template-columns: 1fr 128px 80px 120px 110px 96px 106px;
  align-items: center;
  column-gap: 12px;
  padding: 12px 16px;
}

.bill-row--header {
  padding: 8px 16px;
}

.min-width-0 {
  min-width: 0;
}

.cal-title {
  min-width: 200px;
  text-align: center;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cal-cell {
  min-height: 110px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  padding: 6px;
  overflow: hidden;
}

.cal-cell--other {
  opacity: 0.3;
}

.cal-cell--today {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background: rgba(var(--v-theme-primary), 0.04);
}

.cal-day-num {
  line-height: 1;
  margin-bottom: 4px;
}

.cal-chip {
  display: flex;
  width: 100%;
  max-width: 100%;
}

.cal-chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
