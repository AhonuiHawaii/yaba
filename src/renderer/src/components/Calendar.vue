<template>
  <v-container fluid class="pa-4">
    <v-sheet rounded="sm" elevation="1" class="pa-4">
      <!-- Navigation -->
      <div class="d-flex align-center gap-2 mb-5">
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          density="comfortable"
          size="small"
          @click="prevMonth"
        />
        <span class="text-h6 font-weight-bold cal-title">{{ monthTitle }}</span>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          density="comfortable"
          size="small"
          @click="nextMonth"
        />
        <v-btn size="small" variant="tonal" rounded="sm" @click="goToday">Today</v-btn>
        <v-spacer />
        <v-chip color="primary" variant="flat" size="small" prepend-icon="mdi-refresh" rounded="sm">
          {{ chargesThisMonth }} charge{{ chargesThisMonth !== 1 ? 's' : '' }} this month
        </v-chip>
      </div>

      <!-- Day-of-week headers -->
      <div class="cal-grid mb-1">
        <div
          v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="d"
          class="text-caption text-center text-uppercase font-weight-bold text-medium-emphasis py-1"
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
          :class="{
            'cal-cell--other': !day.currentMonth,
            'cal-cell--today': day.isToday
          }"
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
            <div
              v-for="sub in eventsByDay.get(day.key) || []"
              :key="sub.name"
              class="cal-chip mb-1 cursor-pointer"
              :class="sub.priceUp ? 'cal-chip--error' : 'cal-chip--primary'"
              @click.stop="openDetail(sub)"
            >
              <span class="cal-chip-text text-caption font-weight-medium">
                {{ sub.name }} · {{ formatCurrency(sub.currentAmount) }}
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- Detail dialog -->
      <v-dialog v-model="dialogOpen" max-width="380">
        <v-card v-if="selected" rounded="sm">
          <v-card-title class="pa-5 pb-3">
            <div class="d-flex align-center justify-space-between">
              <span class="text-body-1 font-weight-bold">{{ selected.name }}</span>
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
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                {{ selected.priceUp ? 'Current Amount' : 'Typical Amount' }}
              </span>
              <span
                class="text-h6 font-weight-bold"
                :class="
                  selected.priceUp
                    ? 'text-warning'
                    : `text-${selected.billing === 'Yearly' ? 'primary' : 'primary'}`
                "
                >{{ formatCurrency(selected.currentAmount) }}</span
              >
            </div>
            <v-divider class="mb-3" />
            <div v-if="selected.priceUp" class="d-flex justify-space-between mb-2">
              <span class="text-body-2 font-weight-medium">Previous</span>
              <span class="text-body-2 text-medium-emphasis">{{
                formatCurrency(selected.previousAmount)
              }}</span>
            </div>
            <div v-if="selected.category" class="d-flex justify-space-between mb-2">
              <span class="text-body-2 font-weight-medium">Category</span>
              <span class="text-body-2 text-medium-emphasis">{{ selected.category }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span class="text-body-2 font-weight-medium">Billing</span>
              <span class="text-body-2 text-medium-emphasis">{{ selected.billing }}</span>
            </div>
            <div v-if="selected.monthCount" class="d-flex justify-space-between">
              <span class="text-body-2 font-weight-medium">Detected</span>
              <span class="text-body-2 text-medium-emphasis">
                {{ selected.monthCount }} month{{ selected.monthCount !== 1 ? 's' : '' }}
              </span>
            </div>
          </v-card-text>
          <v-card-actions class="pa-5 pt-0">
            <v-spacer />
            <v-btn variant="tonal" rounded="sm" size="small" @click="dialogOpen = false"
              >Close</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-sheet>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'

const props = defineProps({
  subscriptions: { type: Array, default: () => [] }
})

const { formatCurrency } = useUserSettingsStore()

// ── Month navigation ──────────────────────────────────────────────────────────

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

function offsetMonth(yyyymm, delta) {
  const y = +yyyymm.slice(0, 4)
  const m = +yyyymm.slice(4) - 1
  const d = new Date(y, m + delta, 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonthValue())
const viewYear = computed(() => +selectedMonth.value.slice(0, 4))
const viewMonth = computed(() => +selectedMonth.value.slice(4, 6) - 1)
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

const today = new Date()

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const calendarDays = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const daysInPrev = new Date(y, m, 0).getDate()
  const todayKey = dateKey(today)
  const days = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const date = new Date(y, m - 1, daysInPrev - i)
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

// ── Event generation ──────────────────────────────────────────────────────────

const eventsByDay = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const map = new Map()

  for (const sub of props.subscriptions) {
    const day = sub.typicalDay
    if (!day || day < 1 || day > daysInMonth) continue
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(sub)
  }

  return map
})

const chargesThisMonth = computed(() => {
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  return props.subscriptions.filter((s) => s.typicalDay >= 1 && s.typicalDay <= daysInMonth).length
})

// ── Detail dialog ─────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const selected = ref(null)

function openDetail(sub) {
  selected.value = sub
  dialogOpen.value = true
}
</script>

<style scoped>
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
  min-height: 100px;
  border: 1px solid rgba(128, 128, 128, 0.12);
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
  border-radius: 4px;
  padding: 3px 6px;
  overflow: hidden;
  display: block;
  width: 100%;
}

.cal-chip--primary {
  background: rgba(var(--v-theme-primary), 0.15);
}

.cal-chip--error {
  background: rgba(var(--v-theme-error), 0.2);
}

.cal-chip--primary .cal-chip-text {
  color: rgb(var(--v-theme-primary));
}

.cal-chip--error .cal-chip-text {
  color: rgb(var(--v-theme-error));
}

.cal-chip-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
