<template>
  <div>
    <!-- ── Header ───────────────────────────────────────────────────────────── -->
    <div class="d-flex align-start justify-space-between px-4 pt-4 pb-3 gap-4 flex-wrap">
      <div>
        <div class="text-h5 font-weight-bold">Bills</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Recurring payments detected from imports
        </div>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        rounded="sm"
        @click="openAddDialog"
        >Add bill</v-btn
      >
    </div>

    <!-- ── Tab toggle ────────────────────────────────────────────────────────── -->
    <div class="d-flex px-4 pb-4">
      <v-btn-toggle v-model="activeTab" mandatory rounded="sm" density="comfortable" variant="flat" color="primary">
        <v-btn value="list" size="small" prepend-icon="mdi-format-list-bulleted">List</v-btn>
        <v-btn value="calendar" size="small" prepend-icon="mdi-calendar-month">Calendar</v-btn>
      </v-btn-toggle>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- LIST VIEW                                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'list'">
      <!-- ── Stat cards ──────────────────────────────────────────────────────── -->
      <div class="px-4 pb-4">
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-card rounded="lg" elevation="0" border class="pa-1">
              <v-card-text class="pa-5">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
                  Due this month
                </div>
                <div class="text-h4 font-weight-bold">{{ formatCurrency(totalDue) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card rounded="lg" elevation="0" border class="pa-1">
              <v-card-text class="pa-5">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
                  Paid
                </div>
                <div class="text-h4 font-weight-bold text-success">
                  {{ formatCurrency(totalPaid) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card rounded="lg" elevation="0" border class="pa-1">
              <v-card-text class="pa-5">
                <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
                  Upcoming
                </div>
                <div class="text-h4 font-weight-bold">{{ formatCurrency(totalUpcoming) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ── Bills table ─────────────────────────────────────────────────────── -->
      <div class="px-4 pb-6">
        <v-card rounded="lg" elevation="0" border>
          <div v-if="loading" class="d-flex justify-center pa-10">
            <v-progress-circular indeterminate color="primary" />
          </div>

          <template v-else>
            <div
              v-if="!billItems.length"
              class="d-flex flex-column align-center text-medium-emphasis pa-12"
            >
              <v-icon
                size="60"
                class="mb-4"
                style="opacity: 0.3"
                icon="mdi-calendar-month-outline"
              />
              <div class="text-body-1">No bills detected yet.</div>
              <div class="text-caption mt-1">Import transactions and categorize them as bills.</div>
            </div>

            <v-table v-else density="comfortable">
              <thead>
                <tr>
                  <th class="text-body-2 text-medium-emphasis font-weight-regular bills-th">
                    Bill
                  </th>
                  <th class="text-body-2 text-medium-emphasis font-weight-regular bills-th">
                    Category
                  </th>
                  <th class="text-body-2 text-medium-emphasis font-weight-regular bills-th">
                    Frequency
                  </th>
                  <th class="text-body-2 text-medium-emphasis font-weight-regular bills-th">
                    Next due
                  </th>
                  <th
                    class="text-body-2 text-medium-emphasis font-weight-regular bills-th text-right"
                  >
                    Amount
                  </th>
                  <th
                    class="text-body-2 text-medium-emphasis font-weight-regular bills-th text-right"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bill in billItems" :key="bill.name" class="bills-tr">
                  <td class="text-body-2 font-weight-medium">{{ bill.name }}</td>
                  <td>
                    <v-chip
                      v-if="bill.category"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      rounded="pill"
                      >{{ bill.category }}</v-chip
                    >
                    <span v-else class="text-caption text-medium-emphasis">—</span>
                  </td>
                  <td class="text-body-2 text-medium-emphasis">Monthly</td>
                  <td class="text-body-2 text-medium-emphasis">{{ bill.nextDueLabel }}</td>
                  <td class="text-body-2 text-right">{{ formatCurrency(bill.typicalAmount) }}</td>
                  <td class="text-right">
                    <v-chip
                      v-if="bill.isPaid"
                      color="success"
                      size="x-small"
                      variant="tonal"
                      rounded="pill"
                      prepend-icon="mdi-check"
                      >Paid</v-chip
                    >
                    <v-chip v-else size="x-small" variant="outlined" rounded="pill"
                      >Upcoming</v-chip
                    >
                  </td>
                </tr>
              </tbody>
            </v-table>
          </template>
        </v-card>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- CALENDAR VIEW (bills only)                                             -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <v-container v-else fluid class="pa-4">
      <v-sheet rounded="sm" elevation="2" class="pa-4">
        <!-- Navigation -->
        <div class="d-flex align-center gap-3 mb-6">
          <v-btn icon="mdi-chevron-left" variant="text" density="comfortable" @click="prevMonth" />
          <span class="text-h6 font-weight-bold cal-title">{{ monthTitle }}</span>
          <v-btn icon="mdi-chevron-right" variant="text" density="comfortable" @click="nextMonth" />
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
                  selectedCalEvent.category
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
    </v-container>

    <!-- ── Add Bill Dialog ───────────────────────────────────────────────────── -->
    <v-dialog v-model="addDialogOpen" max-width="480">
      <v-card rounded="sm">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h6 font-weight-bold">Add Bill Category</span>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              @click="addDialogOpen = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="newBill.name"
            label="Category name"
            variant="outlined"
            density="comfortable"
            rounded="sm"
            hide-details
           color="primary" />
          <div class="text-caption text-medium-emphasis mt-2">
            This creates a new Bills budget category. Assign transactions to it to track them here.
          </div>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="addDialogOpen = false">Cancel</v-btn>
          <v-btn
            variant="flat"
            color="primary"
            rounded="sm"
            :disabled="!newBill.name"
            :loading="saving"
            @click="saveBill"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserSettingsStore } from '../stores/userSettings'

const categoriesStore = useUserCategoriesStore()
const { formatCurrency } = useUserSettingsStore()

const activeTab = ref('list')
const loading = ref(false)

// ── Recurring transactions (bills-categorized only) ───────────────────────────

const recurringTransactions = ref([])

async function fetchRecurring() {
  const result = await window.electron.ipcRenderer.invoke('transactions:fetch', { recurring: 1 })
  if (result.success) recurringTransactions.value = result.data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Bill groups (recurring txns whose category is a bills category) ───────────

const billCategoryNames = computed(
  () => new Set(categoriesStore.getCategoriesByType('bills').map((c) => c.name))
)

const billGroups = computed(() => {
  const map = new Map()

  for (const tx of recurringTransactions.value) {
    // Only include transactions categorized as a bills category
    if (!tx.category || !billCategoryNames.value.has(tx.category)) continue

    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) {
      map.set(key, { name: key, amounts: [], days: [], months: new Set(), category: tx.category })
    }
    const g = map.get(key)
    const amt = Math.abs(Number(tx.TRNAMT))
    if (amt > 0) g.amounts.push(amt)
    if (tx.DTPOSTED?.length >= 8) g.days.push(parseInt(tx.DTPOSTED.slice(6, 8), 10))
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

      // isPaid: this bill already posted a transaction this month
      const isPaid = g.months.has(currentMonthStr) && typicalDay !== null && typicalDay < todayDay

      // Next due date
      let nextDueLabel = '—'
      if (typicalDay) {
        const days = daysUntil(typicalDay)
        if (days !== null) {
          const labelDate =
            days >= 0
              ? new Date(now.getFullYear(), now.getMonth(), typicalDay)
              : new Date(now.getFullYear(), now.getMonth() + 1, typicalDay)
          nextDueLabel = labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
      }

      return {
        name: g.name,
        category: g.category,
        typicalAmount,
        typicalDay,
        isPaid,
        nextDueLabel
      }
    })
    .sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return (a.typicalDay ?? 99) - (b.typicalDay ?? 99)
    })
})

const billItems = computed(() => billGroups.value)

// ── Stat totals ───────────────────────────────────────────────────────────────

const totalDue = computed(() => billItems.value.reduce((s, b) => s + (b.typicalAmount || 0), 0))
const totalPaid = computed(() =>
  billItems.value.filter((b) => b.isPaid).reduce((s, b) => s + (b.typicalAmount || 0), 0)
)
const totalUpcoming = computed(() =>
  billItems.value.filter((b) => !b.isPaid).reduce((s, b) => s + (b.typicalAmount || 0), 0)
)

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

// ── Bills-only calendar events ────────────────────────────────────────────────

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

// ── Calendar dialog ───────────────────────────────────────────────────────────

const calDialogOpen = ref(false)
const selectedCalEvent = ref(null)

function openCalEvent(evt) {
  selectedCalEvent.value = evt
  calDialogOpen.value = true
}

// ── Add bill category dialog ──────────────────────────────────────────────────

const addDialogOpen = ref(false)
const saving = ref(false)
const newBill = ref({ name: '' })

function openAddDialog() {
  newBill.value = { name: '' }
  addDialogOpen.value = true
}

async function saveBill() {
  if (!newBill.value.name) return
  saving.value = true
  try {
    await categoriesStore.addCategory({ type: 'bills', name: newBill.value.name })
  } finally {
    saving.value = false
    addDialogOpen.value = false
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  loading.value = true
  await Promise.all([categoriesStore.fetchCategories(), fetchRecurring()])
  loading.value = false
})
</script>

<style scoped>
/* ── Table ── */
.bills-th {
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}

.bills-tr td {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.bills-tr:last-child td {
  border-bottom: none;
}

/* ── Calendar ── */
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
