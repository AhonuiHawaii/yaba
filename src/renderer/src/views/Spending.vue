<template>
  <v-container fluid class="pa-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="d-flex flex-wrap align-start justify-space-between gap-4 mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Spending</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Where your money goes · {{ periodLabel }}
        </div>
      </div>
      <div class="d-flex align-center gap-3">
        <!-- Prev / label / Next -->
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
        <!-- Period toggle -->
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

    <!-- ── Stat cards ─────────────────────────────────────────────────────── -->
    <v-row class="mb-4">
      <!-- Total Spent -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Total Spent
            </div>
            <div class="text-h4 font-weight-bold mb-1">{{ formatCurrency(totalActual) }}</div>
            <div class="text-caption text-medium-emphasis">{{ periodLabel }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Avg / Month -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Avg / Month
            </div>
            <div class="text-h4 font-weight-bold mb-1">{{ formatCurrency(avgPerMonth) }}</div>
            <div class="text-caption text-medium-emphasis">across the period</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Category -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Top Category
            </div>
            <div class="text-h4 font-weight-bold mb-1">{{ topCategory?.name ?? '—' }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ topCategory ? formatCurrency(topCategory.actual) : 'No data' }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Transactions -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-3">
              Transactions
            </div>
            <div class="text-h4 font-weight-bold mb-1">
              {{ currentTransactions.length.toLocaleString() }}
            </div>
            <div class="text-caption text-medium-emphasis">purchases</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Spending trend + By category ───────────────────────────────────── -->
    <v-row class="mb-4" align="stretch">
      <!-- Spending trend -->
      <v-col cols="12" lg="7">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Spending trend</v-card-title>
            <template #append>
              <v-chip size="x-small" variant="tonal">{{ trendChipLabel }}</v-chip>
            </template>
          </v-card-item>
          <div style="height: 240px; padding: 8px 16px 16px">
            <Bar
              v-if="trendMonths.length"
              :data="spendingTrendData"
              :options="spendingTrendOptions"
            />
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
            >
              No trend data available
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- By category -->
      <v-col cols="12" lg="5">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-3">
            <v-card-title class="text-body-1 font-weight-bold">By category</v-card-title>
          </v-card-item>
          <v-card-text class="px-5 pb-5 pt-0">
            <div v-if="allCombinedSorted.length === 0" class="text-body-2 text-medium-emphasis">
              No spending this period.
            </div>
            <div v-for="(cat, idx) in allCombinedSorted" :key="cat.id" class="mb-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="d-flex align-center gap-2">
                  <v-icon size="15" class="text-medium-emphasis">{{ categoryIcon(cat) }}</v-icon>
                  <span class="text-body-2">{{ cat.name }}</span>
                </div>
                <div class="d-flex align-center gap-3">
                  <span class="text-body-2 font-weight-medium">{{
                    formatCurrency(cat.actual)
                  }}</span>
                  <span
                    class="text-caption text-medium-emphasis"
                    style="min-width: 30px; text-align: right"
                  >
                    {{ formatPercent(cat.actual, totalActual) }}
                  </span>
                </div>
              </div>
              <v-progress-linear
                :model-value="totalActual > 0 ? (cat.actual / totalActual) * 100 : 0"
                color="primary"
                height="4"
                rounded
                bg-color="rgba(0,0,0,0.06)"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Top merchants table ─────────────────────────────────────────────── -->
    <v-card rounded="lg" elevation="0" border>
      <v-card-item class="pa-5 pb-2">
        <v-card-title class="text-body-1 font-weight-bold">Top merchants</v-card-title>
      </v-card-item>

      <v-table density="comfortable">
        <thead>
          <tr>
            <th
              class="text-caption font-weight-bold text-uppercase"
              style="color: var(--v-theme-primary)"
            >
              Merchant
            </th>
            <th class="text-caption font-weight-bold text-uppercase">Category</th>
            <th class="text-caption font-weight-bold text-uppercase text-right">Visits</th>
            <th class="text-caption font-weight-bold text-uppercase text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="displayedMerchants.length === 0">
            <td colspan="4" class="text-center text-medium-emphasis text-body-2 py-4">
              No transactions this period
            </td>
          </tr>
          <tr v-for="m in displayedMerchants" :key="m.name">
            <td class="text-body-2 font-weight-medium py-3">{{ m.name }}</td>
            <td class="py-3">
              <v-chip v-if="m.category" size="x-small" variant="tonal" color="primary">
                {{ m.category }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">—</span>
            </td>
            <td class="text-body-2 text-right py-3">{{ m.count }}</td>
            <td class="text-body-2 font-weight-medium text-right py-3">
              {{ formatCurrency(m.total) }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-if="topMerchants.length > 8" class="pa-3 pt-0">
        <v-btn variant="text" size="small" block @click="showAllMerchants = !showAllMerchants">
          {{ showAllMerchants ? 'Show less' : `See all ${topMerchants.length} merchants` }}
        </v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const categoriesStore = useUserCategoriesStore()
const budgetsStore = useUserBudgetsStore()
const transactionsStore = useUserTransactionsStore()
const { formatCurrency } = useUserSettingsStore()

const ipc = window.electron?.ipcRenderer

// ── Period filter (same as Dashboard) ────────────────────────────────────────
const _pf = usePeriodFilter()
const { period, periodStart, periodLength, periodMonths, periodLabel, isNextPeriodFuture } =
  storeToRefs(_pf)
const { prevPeriod, nextPeriod, currentMonthValue, offsetMonth } = _pf

// ── Period bounds ─────────────────────────────────────────────────────────────
const periodBounds = computed(() => {
  const lastMonth = periodMonths.value[periodMonths.value.length - 1]
  const sy = parseInt(periodStart.value.slice(0, 4))
  const sm = parseInt(periodStart.value.slice(4, 6)) - 1
  const ey = parseInt(lastMonth.slice(0, 4))
  const em = parseInt(lastMonth.slice(4, 6)) - 1
  return { start: new Date(sy, sm, 1), end: new Date(ey, em + 1, 0, 23, 59, 59, 999) }
})

// ── Transactions ──────────────────────────────────────────────────────────────
const periodTransactions = ref([])

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

// ── Category actuals ──────────────────────────────────────────────────────────
function buildActualsMap(catList) {
  const actuals = new Map()
  for (const t of currentTransactions.value) {
    const trnAmt = Number(t.TRNAMT)
    if (t.category)
      actuals.set(t.category, (actuals.get(t.category) || 0) + (trnAmt < 0 ? Math.abs(trnAmt) : 0))
    if (t.splitCategory1 && t.splitCategory1 !== t.category && t.splitAmount1 > 0)
      actuals.set(t.splitCategory1, (actuals.get(t.splitCategory1) || 0) + t.splitAmount1)
    if (t.splitCategory2 && t.splitCategory2 !== t.category && t.splitAmount2 > 0)
      actuals.set(t.splitCategory2, (actuals.get(t.splitCategory2) || 0) + t.splitAmount2)
  }
  return catList.map((cat) => ({
    ...cat,
    actual: actuals.get(cat.id) || 0
  }))
}

const allCombinedSorted = computed(() => {
  const variable = buildActualsMap(categoriesStore.getCategoriesByType('variable'))
  const bills = buildActualsMap(categoriesStore.getCategoriesByType('bills'))
  return [...variable, ...bills].filter((c) => c.actual > 0).sort((a, b) => b.actual - a.actual)
})

const totalActual = computed(() => allCombinedSorted.value.reduce((s, c) => s + c.actual, 0))

// ── Stat card computeds ───────────────────────────────────────────────────────
const avgPerMonth = computed(() =>
  periodLength.value > 0 ? totalActual.value / periodLength.value : 0
)

const topCategory = computed(() => allCombinedSorted.value[0] ?? null)

// ── Category icon helper ──────────────────────────────────────────────────────
const categoryIconMap = {
  rent: 'mdi-home-outline',
  groceries: 'mdi-cart-outline',
  dining: 'mdi-silverware-fork-knife',
  'dining out': 'mdi-silverware-fork-knife',
  shopping: 'mdi-shopping-outline',
  insurance: 'mdi-shield-check-outline',
  utilities: 'mdi-lightning-bolt-outline',
  transport: 'mdi-bus-outline',
  transportation: 'mdi-bus-outline',
  subscriptions: 'mdi-refresh',
  health: 'mdi-heart-outline',
  entertainment: 'mdi-television-play',
  travel: 'mdi-airplane',
  education: 'mdi-school-outline',
  fitness: 'mdi-dumbbell',
  pets: 'mdi-paw',
  gifts: 'mdi-gift-outline',
  personal: 'mdi-account-outline',
  savings: 'mdi-piggy-bank-outline'
}

function categoryIcon(cat) {
  if (!cat?.name) return 'mdi-tag-outline'
  const key = cat.name.toLowerCase()
  for (const [k, v] of Object.entries(categoryIconMap)) {
    if (key.includes(k)) return v
  }
  return 'mdi-tag-outline'
}

// ── Top merchants ─────────────────────────────────────────────────────────────
const showAllMerchants = ref(false)

const topMerchants = computed(() => {
  const map = new Map()
  for (const t of currentTransactions.value) {
    const amt = Number(t.TRNAMT)
    if (amt >= 0) continue
    const name = t.NAME || t.MEMO || 'Unknown'
    const entry = map.get(name) || { name, count: 0, total: 0, category: t.category || null }
    entry.count++
    entry.total += Math.abs(amt)
    if (t.category && !entry.category) entry.category = t.category
    map.set(name, entry)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
})

const displayedMerchants = computed(() =>
  showAllMerchants.value ? topMerchants.value : topMerchants.value.slice(0, 8)
)

// ── Spending trend chart ──────────────────────────────────────────────────────
// Always show last 12 months of data (from monthlyTotals)
const trendMonths = computed(() => transactionsStore.monthlyTotals.slice(-12))

const trendChipLabel = computed(() => {
  const n = trendMonths.value.length
  return n === 1 ? '1 month' : `${n} months`
})

const spendingTrendData = computed(() => ({
  labels: trendMonths.value.map((m) => {
    const y = parseInt(m.month.slice(0, 4))
    const mo = parseInt(m.month.slice(4, 6)) - 1
    return new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'short' })
  }),
  datasets: [
    {
      label: 'Spending',
      data: trendMonths.value.map((m) => m.spending || 0),
      backgroundColor: '#5c6bc0',
      borderRadius: 4,
      barPercentage: 0.6
    }
  ]
}))

const spendingTrendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}`
      }
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

// ── Formatters ────────────────────────────────────────────────────────────────
function formatPercent(val, total) {
  if (!total) return '0%'
  return `${Math.round((val / total) * 100)}%`
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadSpending() {
  try {
    await Promise.all([
      budgetsStore.fetchBudgets(),
      categoriesStore.fetchCategories(),
      transactionsStore.fetchMonthlyTotals()
    ])

    const monthResults = await Promise.all(
      periodMonths.value.map((m) => ipc?.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    periodTransactions.value = monthResults.filter((r) => r?.success).flatMap((r) => r.data ?? [])
  } catch (err) {
    console.error('Spending load error', err)
  }
}

onMounted(loadSpending)
watch(periodStart, loadSpending)
</script>
