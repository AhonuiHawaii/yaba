<template>
  <v-container fluid class="pa-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <v-row align="start" justify="space-between" class="mb-6 mx-0 ga-4">
      <v-col cols="auto" class="pa-0">
        <p class="text-h5 font-weight-bold mb-1">Spending</p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Where your money goes · {{ periodLabel }}
        </p>
      </v-col>
      <v-col cols="auto" class="pa-0 d-flex align-center ga-3 flex-wrap">
        <FilterComponent />
      </v-col>
    </v-row>

    <!-- ── Stat cards ─────────────────────────────────────────────────────── -->
    <v-row class="mb-4">
      <!-- Total Spent -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" variant="flat" border hover class="position-relative overflow-hidden">
          <div style="position: absolute; bottom: -5px; left: 0; width: 100%; z-index: 0; pointer-events: none; opacity: 0.6;">
            <v-sparkline :fill="true" :gradient="gradient[0]" :line-width="1" :model-value="sparklineSpent" :color="sparklineLineColor" :padding="0" :smooth="16" auto-draw></v-sparkline>
          </div>
          <v-card-text class="pa-5 position-relative" style="z-index: 1">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Total Spent</span>
              <v-avatar color="primary" variant="tonal" size="38" rounded="lg">
                <v-icon size="20">mdi-currency-usd</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">{{ formatCurrency(totalActual) }}</div>
            <div class="text-caption text-medium-emphasis">{{ periodLabel }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Avg / Month -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" variant="flat" border hover class="position-relative overflow-hidden">
          <div style="position: absolute; bottom: -5px; left: 0; width: 100%; z-index: 0; pointer-events: none; opacity: 0.6;">
            <v-sparkline :fill="true" :gradient="gradient[1]" :line-width="1" :model-value="sparklineAvgPerMonth" :color="sparklineLineColor" :padding="0" :smooth="16" auto-draw></v-sparkline>
          </div>
          <v-card-text class="pa-5 position-relative" style="z-index: 1">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Avg / Month</span>
              <v-avatar color="info" variant="tonal" size="38" rounded="lg">
                <v-icon size="20">mdi-calculator</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">{{ formatCurrency(avgPerMonth) }}</div>
            <div class="text-caption text-medium-emphasis">across the period</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Top Category -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" variant="flat" border hover class="position-relative overflow-hidden">
          <div style="position: absolute; bottom: -5px; left: 0; width: 100%; z-index: 0; pointer-events: none; opacity: 0.6;">
            <v-sparkline :fill="true" :gradient="gradient[3]" :line-width="1" :model-value="sparklineTopCategory" :color="sparklineLineColor" :padding="0" :smooth="16" auto-draw></v-sparkline>
          </div>
          <v-card-text class="pa-5 position-relative" style="z-index: 1">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Top Category</span>
              <v-avatar color="secondary" variant="tonal" size="38" rounded="lg">
                <v-icon size="20">mdi-star-outline</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1 text-truncate">{{ topCategory?.name ?? '—' }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ topCategory ? formatCurrency(topCategory.actual) : 'No data' }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Transactions -->
      <v-col cols="12" sm="6" lg="3">
        <v-card rounded="lg" elevation="0" variant="flat" border hover class="position-relative overflow-hidden">
          <div style="position: absolute; bottom: -5px; left: 0; width: 100%; z-index: 0; pointer-events: none; opacity: 0.6;">
            <v-sparkline :fill="true" :gradient="gradient[2]" :line-width="1" :model-value="sparklineTransactions" :color="sparklineLineColor" :padding="0" :smooth="16" auto-draw></v-sparkline>
          </div>
          <v-card-text class="pa-5 position-relative" style="z-index: 1">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis">Transactions</span>
              <v-avatar color="success" variant="tonal" size="38" rounded="lg">
                <v-icon size="20">mdi-swap-vertical</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">
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
            <div v-for="cat in allCombinedSorted" :key="cat.id" class="mb-3">
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
                bg-color="surface-variant"
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

      <v-table density="comfortable" class="bg-transparent">
        <thead>
          <tr>
            <th class="text-caption font-weight-bold text-uppercase text-primary">Merchant</th>
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
import FilterComponent from '../components/filterComponent.vue'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { useTheme } from 'vuetify'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const categoriesStore = useUserCategoriesStore()
const budgetsStore = useUserBudgetsStore()
const transactionsStore = useUserTransactionsStore()
const { formatCurrency } = useUserSettingsStore()

const theme = useTheme()
const ipc = window.electron?.ipcRenderer

// ── Period filter (same as Dashboard) ────────────────────────────────────────
const _pf = usePeriodFilter()
const { period, periodStart, periodLength, periodMonths, periodLabel } = storeToRefs(_pf)

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

// ── Sparklines ────────────────────────────────────────────────────────────────
const sparklineLineColor = computed(() => (theme.current.value.dark ? 'white' : 'black'))
const gradient = [
  [theme.current.value.colors.primary, theme.current.value.colors['primary-container']],
  [theme.current.value.colors.success, theme.current.value.colors['success-container']],
  [theme.current.value.colors.info, theme.current.value.colors['info-container']],
  [theme.current.value.colors.secondary, theme.current.value.colors['secondary-container']]
]

const ensureVariance = (data) => {
  if (!data || data.length <= 1) return [0, 1]
  const min = Math.min(...data)
  const max = Math.max(...data)
  if (min === max) {
    const arr = [...data]
    arr[0] = min - (min === 0 ? 1 : Math.abs(min * 0.01))
    arr[arr.length - 1] = max + (max === 0 ? 1 : Math.abs(max * 0.01))
    return arr
  }
  return data
}

const sparkData = computed(() => {
  const points = []

  if (periodMonths.value.length > 1) {
    for (const m of periodMonths.value) {
      points.push({ key: m, spent: 0, transactions: 0, topCategorySpent: 0 })
    }
    
    for (const t of currentTransactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 6) {
        const monthKey = s.slice(0, 6)
        const p = points.find((pt) => pt.key === monthKey)
        if (p && Number(t.TRNAMT) < 0) {
          const amt = Math.abs(Number(t.TRNAMT))
          p.spent += amt
          p.transactions += 1
          if (topCategory.value && t.category === topCategory.value.id) {
            p.topCategorySpent += amt
          }
        }
      }
    }
  } else {
    const { start, end } = periodBounds.value
    let current = new Date(start)
    while (current <= end) {
      points.push({
        date: new Date(current),
        spent: 0,
        transactions: 0,
        topCategorySpent: 0
      })
      current.setDate(current.getDate() + 1)
    }
    
    for (const t of currentTransactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 8) {
        const tDate = new Date(parseInt(s.slice(0, 4)), parseInt(s.slice(4, 6)) - 1, parseInt(s.slice(6, 8)))
        const dayIndex = points.findIndex(d => d.date && d.date.getFullYear() === tDate.getFullYear() && d.date.getMonth() === tDate.getMonth() && d.date.getDate() === tDate.getDate())
        if (dayIndex !== -1 && Number(t.TRNAMT) < 0) {
          const amt = Math.abs(Number(t.TRNAMT))
          points[dayIndex].spent += amt
          points[dayIndex].transactions += 1
          if (topCategory.value && t.category === topCategory.value.id) {
            points[dayIndex].topCategorySpent += amt
          }
        }
      }
    }
  }
  return points
})

const sparklineSpent = computed(() => {
  let running = 0
  const data = sparkData.value.map(d => {
    running += d.spent
    return periodMonths.value.length > 1 ? d.spent : running
  })
  return ensureVariance(data)
})

const sparklineAvgPerMonth = computed(() => {
  const arr = Array(sparkData.value.length).fill(avgPerMonth.value)
  return ensureVariance(arr)
})

const sparklineTopCategory = computed(() => {
  let running = 0
  const data = sparkData.value.map(d => {
    running += d.topCategorySpent
    return periodMonths.value.length > 1 ? d.topCategorySpent : running
  })
  return ensureVariance(data)
})

const sparklineTransactions = computed(() => {
  let running = 0
  const data = sparkData.value.map(d => {
    running += d.transactions
    return periodMonths.value.length > 1 ? d.transactions : running
  })
  return ensureVariance(data)
})

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

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  if (hex.startsWith('rgb')) return hex
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const spendingTrendData = computed(() => {
  const primaryColor = theme.current.value.colors.primary

  return {
    labels: trendMonths.value.map((m) => {
      const y = parseInt(m.month.slice(0, 4))
      const mo = parseInt(m.month.slice(4, 6)) - 1
      return new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'short' })
    }),
    datasets: [
      {
        label: 'Spending',
        data: trendMonths.value.map((m) => m.spending || 0),
        backgroundColor: primaryColor,
        borderRadius: 4,
        barPercentage: 0.6
      }
    ]
  }
})

const spendingTrendOptions = computed(() => {
  const outlineColor = theme.current.value.colors.outline
  const tickColor = hexToRgba(outlineColor, 0.6)
  const gridColor = hexToRgba(outlineColor, 0.15)

  return {
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
        ticks: { color: tickColor, font: { size: 11 } }
      },
      y: {
        grid: { color: gridColor },
        border: { display: false },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`)
        }
      }
    }
  }
})

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
watch([periodStart, period], loadSpending)
</script>
