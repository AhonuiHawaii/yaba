<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex flex-wrap align-start justify-space-between gap-4 mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Overview</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Where your money went · {{ periodLabel }}
        </div>
      </div>
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
    </div>

    <v-alert v-if="dashboardError" type="error" variant="tonal" class="mb-5">
      {{ dashboardError }}
    </v-alert>

    <!-- Stat cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Income</span
              >
              <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
                <v-icon size="18">mdi-arrow-down-thin</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold text-success mb-1">
              {{ formatCurrency(totalIncome) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              of {{ formatCurrency(incomeBudget) }} planned
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Spent</span
              >
              <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
                <v-icon size="18">mdi-arrow-up-thin</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold mb-1">{{ formatCurrency(totalSpending) }}</div>
            <div class="text-caption text-medium-emphasis">{{ spendPct }}% of income</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Left to budget</span
              >
              <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
                <v-icon size="18">mdi-view-grid-outline</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold mb-1">{{ formatCurrency(leftToBudget) }}</div>
            <div class="text-caption text-medium-emphasis">assign every dollar</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex justify-space-between align-center mb-3">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Net Worth</span
              >
              <v-avatar color="primary" variant="tonal" size="34" rounded="lg">
                <v-icon size="18">mdi-chart-line</v-icon>
              </v-avatar>
            </div>
            <div class="text-h5 font-weight-bold mb-1">{{ formatCurrency(netCash) }}</div>
            <div class="text-caption text-medium-emphasis d-flex align-center gap-1">
              <v-icon size="12" :color="netPeriodChange >= 0 ? 'success' : 'error'">
                {{ netPeriodChange >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
              </v-icon>
              {{ formatCurrency(Math.abs(netPeriodChange)) }} this period
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Spending chart + Top categories -->
    <v-row class="mb-4">
      <v-col cols="12" lg="7">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Spending vs budget</v-card-title>
            <template #append>
              <v-chip size="x-small" variant="tonal">Last 6 months</v-chip>
            </template>
          </v-card-item>
          <div style="height: 220px; padding: 8px 16px 12px">
            <Line :data="spendChartData" :options="spendChartOptions" />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-3">
            <v-card-title class="text-body-1 font-weight-bold">Top categories</v-card-title>
          </v-card-item>
          <v-card-text class="px-5 pb-5 pt-0">
            <p v-if="topCategories.length === 0" class="text-body-2 text-medium-emphasis">
              No spending this period.
            </p>
            <div v-for="cat in topCategories" :key="cat.id" class="mb-4">
              <div class="d-flex justify-space-between mb-1">
                <span class="text-body-2">{{ cat.name }}</span>
                <span class="text-body-2 font-weight-medium">{{ formatCurrency(cat.amount) }}</span>
              </div>
              <v-progress-linear
                :model-value="cat.progress"
                :color="cat.over ? 'error' : 'primary'"
                height="5"
                rounded
                bg-color="rgba(0,0,0,0.06)"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Needs review + Upcoming bills -->
    <v-row>
      <v-col cols="12" lg="7">
        <v-card rounded="lg" elevation="0" border>
          <v-card-item class="pa-5 pb-2">
            <v-card-title class="text-body-1 font-weight-bold">Needs review</v-card-title>
            <template #append>
              <v-btn
                variant="text"
                size="small"
                density="compact"
                color="primary"
                @click="emit('navigate', 'Transactions')"
              >
                Review all
              </v-btn>
            </template>
          </v-card-item>
          <div v-if="needsReview.length === 0" class="px-5 pb-5 text-body-2 text-medium-emphasis">
            All transactions are categorized.
          </div>
          <template v-for="tx in needsReview" :key="tx.FITID">
            <v-divider />
            <div class="d-flex align-center justify-space-between px-5 py-3">
              <div>
                <div class="text-body-2 font-weight-medium">
                  {{ tx.NAME || tx.MEMO || tx.FITID }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatTransactionDate(tx.DTPOSTED) }}
                </div>
              </div>
              <div class="d-flex align-center gap-3">
                <v-chip size="x-small" variant="outlined">
                  {{ tx.category ? tx.category : 'Uncategorized' }}
                </v-chip>
                <span
                  class="text-body-2 font-weight-medium"
                  :class="Number(tx.TRNAMT) >= 0 ? 'text-success' : ''"
                >
                  {{ formatCurrency(Number(tx.TRNAMT)) }}
                </span>
              </div>
            </div>
          </template>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card rounded="lg" elevation="0" border>
          <v-card-item class="pa-5 pb-2">
            <v-card-title class="text-body-1 font-weight-bold">Upcoming bills</v-card-title>
          </v-card-item>
          <div v-if="soonItems.length === 0" class="px-5 pb-5 text-body-2 text-medium-emphasis">
            No upcoming bills in the next 7 days.
          </div>
          <template v-for="item in soonItems" :key="item.name">
            <v-divider />
            <div class="d-flex align-center gap-3 px-5 py-3">
              <v-avatar color="primary" variant="tonal" size="36" rounded="lg">
                <v-icon size="18">mdi-receipt-text-outline</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium">{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  Due {{ formatDueDate(item.days) }}
                </div>
              </div>
              <span class="text-body-2 font-weight-medium">{{
                formatCurrency(item.typicalAmount)
              }}</span>
            </div>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip
} from 'chart.js'
import { Line } from 'vue-chartjs'
import {
  useUserAccountsStore,
  accountTypeIcon,
  accountTypeColor,
  resolveIsAsset
} from '../stores/userAccounts'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'
import { usePeriodFilter } from '../stores/usePeriodFilter'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip)

const emit = defineEmits(['navigate'])

const ipc = window.electron?.ipcRenderer
const accountsStore = useUserAccountsStore()
const budgetsStore = useUserBudgetsStore()
const categoriesStore = useUserCategoriesStore()
const transactionsStore = useUserTransactionsStore()
const { formatCurrency } = useUserSettingsStore()

const dashboardError = ref(null)
const periodTransactions = ref([])
const recurringTransactions = ref([])

// ── Period navigation ─────────────────────────────────────────────────────────
const {
  period,
  periodStart,
  periodLength,
  periodMonths,
  periodLabel,
  isNextPeriodFuture,
  prevPeriod,
  nextPeriod,
  currentMonthValue,
  offsetMonth
} = usePeriodFilter('month')

// ── Period bounds ─────────────────────────────────────────────────────────────
const periodBounds = computed(() => {
  const lastMonth = periodMonths.value[periodMonths.value.length - 1]
  const sy = parseInt(periodStart.value.slice(0, 4))
  const sm = parseInt(periodStart.value.slice(4, 6)) - 1
  const ey = parseInt(lastMonth.slice(0, 4))
  const em = parseInt(lastMonth.slice(4, 6)) - 1
  return { start: new Date(sy, sm, 1), end: new Date(ey, em + 1, 0, 23, 59, 59, 999) }
})

const currentTransactions = computed(() => {
  const { start, end } = periodBounds.value
  return periodTransactions.value.filter((t) => {
    const s = String(t.DTPOSTED || '')
    const tDate = new Date(
      parseInt(s.slice(0, 4)),
      parseInt(s.slice(4, 6)) - 1,
      parseInt(s.slice(6, 8))
    )
    return tDate >= start && tDate <= end
  })
})

// ── Totals ────────────────────────────────────────────────────────────────────
const totalIncome = computed(() =>
  currentTransactions.value.reduce(
    (sum, t) => sum + (Number(t.TRNAMT) > 0 ? Number(t.TRNAMT) : 0),
    0
  )
)
const totalSpending = computed(() =>
  currentTransactions.value.reduce(
    (sum, t) => sum + (Number(t.TRNAMT) < 0 ? Math.abs(Number(t.TRNAMT)) : 0),
    0
  )
)

// ── Stat card derived ─────────────────────────────────────────────────────────
function sumBudgetByType(type, yyyymm) {
  return categoriesStore.categories
    .filter((c) => c.type === type)
    .reduce((sum, c) => sum + budgetsStore.getEffectiveBudget(c.id, yyyymm), 0)
}

const incomeBudget = computed(() =>
  periodMonths.value.reduce((sum, m) => sum + sumBudgetByType('income', m), 0)
)

const spendPct = computed(() =>
  totalIncome.value > 0 ? Math.round((totalSpending.value / totalIncome.value) * 100) : 0
)
const leftToBudget = computed(() => totalIncome.value - totalSpending.value)
const netPeriodChange = computed(() => totalIncome.value - totalSpending.value)

// ── actualsMap ────────────────────────────────────────────────────────────────
const actualsMap = computed(() => {
  const map = new Map()
  for (const t of currentTransactions.value) {
    const trnAmt = Number(t.TRNAMT)
    if (t.category)
      map.set(t.category, (map.get(t.category) || 0) + (trnAmt < 0 ? Math.abs(trnAmt) : 0))
    if (t.splitCategory1 && t.splitAmount1 > 0)
      map.set(t.splitCategory1, (map.get(t.splitCategory1) || 0) + t.splitAmount1)
    if (t.splitCategory2 && t.splitAmount2 > 0)
      map.set(t.splitCategory2, (map.get(t.splitCategory2) || 0) + t.splitAmount2)
  }
  return map
})

// ── Top categories ────────────────────────────────────────────────────────────
const topCategories = computed(() => {
  const incomeIds = new Set(
    categoriesStore.categories.filter((c) => c.type === 'income').map((c) => c.id)
  )
  return [...actualsMap.value.entries()]
    .filter(([id]) => !incomeIds.has(id))
    .map(([id, amount]) => {
      const cat = categoriesStore.categories.find((c) => c.id === id)
      const budget = periodMonths.value.reduce(
        (sum, m) => sum + budgetsStore.getEffectiveBudget(id, m),
        0
      )
      return {
        id,
        name: cat?.name ?? String(id),
        amount,
        budget,
        progress: budget > 0 ? Math.min((amount / budget) * 100, 100) : 100,
        over: budget > 0 && amount > budget
      }
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
})

// ── Needs review ──────────────────────────────────────────────────────────────
const needsReview = computed(() =>
  [...currentTransactions.value]
    .sort((a, b) => String(b.DTPOSTED || '').localeCompare(String(a.DTPOSTED || '')))
    .slice(0, 5)
)

// ── Spending vs budget chart (last 6 monthly totals) ─────────────────────────
const last6MonthlyTotals = ref([])

function ordinalDay(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const spendChartData = computed(() => {
  const labels = last6MonthlyTotals.value.map((m) => {
    const y = parseInt(m.month.slice(0, 4))
    const mo = parseInt(m.month.slice(4, 6)) - 1
    return new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'short' })
  })
  return {
    labels,
    datasets: [
      {
        label: 'Spending',
        data: last6MonthlyTotals.value.map((m) => m.spending),
        borderColor: '#5c6bc0',
        backgroundColor: 'rgba(92,107,192,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#5c6bc0',
        pointBorderWidth: 2,
        borderWidth: 2,
        spanGaps: false
      },
      {
        label: 'Budget',
        data: last6MonthlyTotals.value.map((m) => m.budget),
        borderColor: 'rgba(92,107,192,0.35)',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [5, 5],
        spanGaps: false
      }
    ]
  }
})

const spendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}` }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: 'rgba(100,100,100,0.6)', font: { size: 11 } }
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.07)' },
      border: { display: false },
      ticks: {
        color: 'rgba(100,100,100,0.6)',
        font: { size: 11 },
        callback: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)
      }
    }
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────────
const txSummaryMap = computed(() => {
  const map = {}
  for (const s of transactionsStore.accountSummary) map[s.ACCTID] = s.total ?? 0
  return map
})

const accountRows = computed(() =>
  accountsStore.accounts.map((account) => ({
    id: account.ACCTID,
    name: account.displayName || account.ACCTTYPE || 'Unknown',
    icon: accountTypeIcon(account.ACCTTYPE),
    color: accountTypeColor(account.ACCTTYPE),
    balance:
      account.startingBalance != null
        ? account.startingBalance + (txSummaryMap.value[account.ACCTID] ?? 0)
        : null,
    isAsset: resolveIsAsset(account)
  }))
)

const netCash = computed(() =>
  accountRows.value.reduce((sum, a) => {
    if (a.balance === null) return sum
    return sum + (a.isAsset ? a.balance : -a.balance)
  }, 0)
)

// ── Upcoming (recurring) ──────────────────────────────────────────────────────
function recurringMedian(arr) {
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

const soonItems = computed(() => {
  const map = new Map()
  for (const tx of recurringTransactions.value) {
    const key = tx.NAME || 'Unknown'
    if (!map.has(key)) map.set(key, { name: key, amounts: [], days: [] })
    const g = map.get(key)
    const amt = Math.abs(Number(tx.TRNAMT))
    if (amt > 0) g.amounts.push(amt)
    if (tx.DTPOSTED?.length >= 8) g.days.push(parseInt(tx.DTPOSTED.slice(6, 8), 10))
  }
  return [...map.values()]
    .map((g) => ({
      name: g.name,
      typicalAmount: recurringMedian(g.amounts),
      days: daysUntil(g.days.length ? recurringMedian(g.days) : null)
    }))
    .filter((item) => item.days !== null && item.days >= 0 && item.days <= 7)
    .sort((a, b) => a.days - b.days)
})

// ── Formatters ────────────────────────────────────────────────────────────────
function formatTransactionDate(value) {
  const text = String(value || '')
  if (text.length < 8) return '-'
  return new Date(
    Number(text.slice(0, 4)),
    Number(text.slice(4, 6)) - 1,
    Number(text.slice(6, 8))
  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDueDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  dashboardError.value = null
  try {
    await Promise.all([
      accountsStore.fetchAccounts(),
      budgetsStore.fetchBudgets(),
      budgetsStore.fetchRollovers(),
      categoriesStore.fetchCategories(),
      transactionsStore.fetchAccountSummary()
    ])

    // Fetch all months in the selected period
    const monthResults = await Promise.all(
      periodMonths.value.map((m) => ipc?.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    periodTransactions.value = monthResults.filter((r) => r?.success).flatMap((r) => r.data ?? [])

    // Build last-6-months totals for the chart (always ends at previous completed month)
    const chartMonths = Array.from({ length: 6 }, (_, i) =>
      offsetMonth(currentMonthValue(), -(6 - i))
    )
    const chartResults = await Promise.all(
      chartMonths.map((m) => ipc?.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    last6MonthlyTotals.value = chartMonths.map((month, i) => {
      const data = chartResults[i]?.success ? (chartResults[i].data ?? []) : []
      const spending = data.reduce(
        (sum, t) => sum + (Number(t.TRNAMT) < 0 ? Math.abs(Number(t.TRNAMT)) : 0),
        0
      )
      const budget = sumBudgetByType('variable', month) + sumBudgetByType('bills', month)
      return { month, spending, budget }
    })

    // Recurring for upcoming bills
    const recurringResult = await ipc?.invoke('transactions:fetch', { recurring: 1 })
    recurringTransactions.value = recurringResult?.success ? (recurringResult.data ?? []) : []
  } catch (err) {
    dashboardError.value = err?.message ?? String(err)
  }
}

onMounted(loadDashboard)
watch(periodStart, loadDashboard)
</script>
