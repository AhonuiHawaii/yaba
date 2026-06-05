<template>
  <v-container fluid class="pa-6">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <v-row align="start" justify="space-between" class="mb-6 mx-0 ga-4">
      <v-col cols="auto" class="pa-0">
        <div class="text-h5 font-weight-bold mb-1">Income</div>
        <div class="text-body-2 text-medium-emphasis mt-1">What you earn · {{ periodLabel }}</div>
      </v-col>
      <v-col cols="auto" class="pa-0 d-flex align-center ga-3 flex-wrap">
        <FilterComponent />
      </v-col>
    </v-row>

    <!-- ── Stat cards ─────────────────────────────────────────────────────── -->
    <v-row class="mb-4">
      <!-- Total Income -->
      <v-col cols="12" sm="6" lg="3">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[1]"
              :line-width="1"
              :model-value="sparklineTotalIncome"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Total Income</span
              >
              <v-avatar color="success" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-arrow-down-thin</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black text-success mb-1">
              {{ formatCurrency(totalIncome) }}
            </div>
            <div class="text-caption text-medium-emphasis">{{ periodLabel }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Avg / Month -->
      <v-col cols="12" sm="6" lg="3">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[2]"
              :line-width="1"
              :model-value="sparklineAvgPerMonth"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Avg / Month</span
              >
              <v-avatar color="info" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-calculator</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">{{ formatCurrency(avgPerMonth) }}</div>
            <div class="text-caption text-medium-emphasis">across the period</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Largest Source -->
      <v-col cols="12" sm="6" lg="3">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[3]"
              :line-width="1"
              :model-value="sparklineLargestSource"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Largest Source</span
              >
              <v-avatar color="secondary" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-star-outline</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black mb-1">
              {{ largestSourcePct }}
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ largestSource?.name ?? 'No data' }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Savings Rate -->
      <v-col cols="12" sm="6" lg="3">
        <v-card
          rounded="lg"
          elevation="0"
          variant="flat"
          border
          hover
          class="position-relative overflow-hidden"
        >
          <div class="sparkline-bg">
            <v-sparkline
              :fill="true"
              :gradient="gradient[1]"
              :line-width="1"
              :model-value="sparklineSavingsRate"
              :color="sparklineLineColor"
              :padding="0"
              :smooth="16"
              auto-draw
            ></v-sparkline>
          </div>
          <v-card-text class="pa-5 stat-card-content">
            <v-row no-gutters align="center" justify="space-between" class="mb-4">
              <span class="text-caption font-weight-bold text-uppercase text-medium-emphasis"
                >Savings Rate</span
              >
              <v-avatar color="success" variant="flat" size="38" rounded="lg">
                <v-icon size="20">mdi-piggy-bank-outline</v-icon>
              </v-avatar>
            </v-row>
            <div class="text-h4 font-weight-black text-success mb-1">{{ savingsRatePct }}</div>
            <div class="text-caption text-medium-emphasis">income kept</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Income trend + By source ───────────────────────────────────────── -->
    <v-row class="mb-4" align="stretch">
      <!-- Income trend chart -->
      <v-col cols="12" lg="7">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-0">
            <v-card-title class="text-body-1 font-weight-bold">Income trend</v-card-title>
            <template #append>
              <v-chip size="x-small" variant="flat">{{ trendChipLabel }}</v-chip>
            </template>
          </v-card-item>
          <div class="pa-4 chart-area">
            <Bar v-if="trendMonths.length" :data="incomeTrendData" :options="incomeTrendOptions" />
            <div
              v-else
              class="d-flex align-center justify-center h-100 text-medium-emphasis text-body-2"
            >
              No trend data available
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- By source -->
      <v-col cols="12" lg="5">
        <v-card rounded="lg" elevation="0" border class="h-100">
          <v-card-item class="pa-5 pb-3">
            <v-card-title class="text-body-1 font-weight-bold">By source</v-card-title>
          </v-card-item>
          <v-card-text class="px-5 pb-5 pt-0">
            <div v-if="incomeBySource.length === 0" class="text-body-2 text-medium-emphasis">
              No income this period.
            </div>
            <div v-for="src in incomeBySource" :key="src.name" class="mb-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="d-flex align-center gap-2">
                  <v-icon size="15" class="text-medium-emphasis">{{ sourceIcon(src.name) }}</v-icon>
                  <span class="text-body-2">{{ src.name }}</span>
                </div>
                <div class="d-flex align-center gap-3">
                  <span class="text-body-2 font-weight-medium">{{
                    formatCurrency(src.amount)
                  }}</span>
                  <span class="text-caption text-medium-emphasis text-right">
                    {{ formatPercent(src.amount, totalIncome) }}
                  </span>
                </div>
              </div>
              <v-progress-linear
                :model-value="totalIncome > 0 ? (src.amount / totalIncome) * 100 : 0"
                color="success"
                height="4"
                rounded
                bg-color="surface-variant"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ── Recent income table ─────────────────────────────────────────────── -->
    <v-card rounded="lg" elevation="0" border>
      <v-card-item class="pa-5 pb-2">
        <v-card-title class="text-body-1 font-weight-bold">Recent income</v-card-title>
      </v-card-item>

      <v-table density="comfortable">
        <thead>
          <tr>
            <th class="text-caption font-weight-bold text-uppercase">Date</th>
            <th class="text-caption font-weight-bold text-uppercase">Source</th>
            <th class="text-caption font-weight-bold text-uppercase">Type</th>
            <th
              class="text-caption font-weight-bold text-uppercase text-right text-medium-emphasis"
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="recentIncome.length === 0">
            <td colspan="4" class="text-center text-medium-emphasis text-body-2 py-4">
              No income transactions this period
            </td>
          </tr>
          <tr v-for="t in displayedIncome" :key="t.FITID">
            <td class="text-body-2 text-medium-emphasis py-3 text-no-wrap">
              {{ t.dateLabel }}
            </td>
            <td class="text-body-2 font-weight-medium py-3">{{ t.name }}</td>
            <td class="py-3">
              <v-chip v-if="t.category" size="x-small" variant="flat" color="primary">
                {{ resolveCategoryLabel(t.category) }}
              </v-chip>
              <span v-else class="text-caption text-medium-emphasis">Other</span>
            </td>
            <td class="text-body-2 font-weight-medium text-right py-3 text-success">
              +{{ formatCurrency(t.amount) }}
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-if="recentIncome.length > 8" class="pa-3 pt-0">
        <v-btn variant="text" size="small" block @click="showAllIncome = !showAllIncome">
          {{ showAllIncome ? 'Show less' : `See all ${recentIncome.length} transactions` }}
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
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'
import { storeToRefs } from 'pinia'
import FilterComponent from '../components/filterComponent.vue'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import { useTheme } from 'vuetify'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const categoriesStore = useUserCategoriesStore()
const transactionsStore = useUserTransactionsStore()
const { formatCurrency } = useUserSettingsStore()

const theme = useTheme()
const ipc = window.electron?.ipcRenderer

// ── Period filter ─────────────────────────────────────────────────────────────
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

// ── Income transactions (positive TRNAMT) ─────────────────────────────────────
const incomeTransactions = computed(() =>
  currentTransactions.value.filter((t) => Number(t.TRNAMT) > 0)
)

// ── Stat cards ────────────────────────────────────────────────────────────────
const totalIncome = computed(() =>
  incomeTransactions.value.reduce((s, t) => s + Number(t.TRNAMT), 0)
)

const avgPerMonth = computed(() =>
  periodLength.value > 0 ? totalIncome.value / periodLength.value : 0
)

// By source: group income by category name, fall back to transaction name
const incomeBySource = computed(() => {
  const map = new Map()
  for (const t of incomeTransactions.value) {
    const key = resolveCategoryLabel(t.category) || t.NAME || t.MEMO || 'Other'
    map.set(key, (map.get(key) || 0) + Number(t.TRNAMT))
  }
  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
})

const largestSource = computed(() => incomeBySource.value[0] ?? null)

const largestSourcePct = computed(() => {
  if (!largestSource.value || !totalIncome.value) return '—'
  return `${Math.round((largestSource.value.amount / totalIncome.value) * 100)}%`
})

// Savings rate = (income - spending) / income
const totalSpending = computed(() =>
  currentTransactions.value.reduce(
    (s, t) => s + (Number(t.TRNAMT) < 0 ? Math.abs(Number(t.TRNAMT)) : 0),
    0
  )
)

const savingsRatePct = computed(() => {
  if (!totalIncome.value) return '0%'
  const rate = Math.max(0, (totalIncome.value - totalSpending.value) / totalIncome.value)
  return `${Math.round(rate * 100)}%`
})

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
      points.push({ key: m, income: 0, spending: 0, largestSourceIncome: 0 })
    }

    for (const t of currentTransactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 6) {
        const monthKey = s.slice(0, 6)
        const p = points.find((pt) => pt.key === monthKey)
        if (p) {
          const amt = Number(t.TRNAMT)
          if (amt > 0) {
            p.income += amt
            const key = resolveCategoryLabel(t.category) || t.NAME || t.MEMO || 'Other'
            if (largestSource.value && key === largestSource.value.name) {
              p.largestSourceIncome += amt
            }
          } else {
            p.spending += Math.abs(amt)
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
        income: 0,
        spending: 0,
        largestSourceIncome: 0
      })
      current.setDate(current.getDate() + 1)
    }

    for (const t of currentTransactions.value) {
      const s = String(t.DTPOSTED || '')
      if (s.length >= 8) {
        const tDate = new Date(
          parseInt(s.slice(0, 4)),
          parseInt(s.slice(4, 6)) - 1,
          parseInt(s.slice(6, 8))
        )
        const dayIndex = points.findIndex(
          (d) =>
            d.date &&
            d.date.getFullYear() === tDate.getFullYear() &&
            d.date.getMonth() === tDate.getMonth() &&
            d.date.getDate() === tDate.getDate()
        )
        if (dayIndex !== -1) {
          const amt = Number(t.TRNAMT)
          if (amt > 0) {
            points[dayIndex].income += amt
            const key = resolveCategoryLabel(t.category) || t.NAME || t.MEMO || 'Other'
            if (largestSource.value && key === largestSource.value.name) {
              points[dayIndex].largestSourceIncome += amt
            }
          } else {
            points[dayIndex].spending += Math.abs(amt)
          }
        }
      }
    }
  }
  return points
})

const sparklineTotalIncome = computed(() => {
  let running = 0
  const data = sparkData.value.map((d) => {
    running += d.income
    return periodMonths.value.length > 1 ? d.income : running
  })
  return ensureVariance(data)
})

const sparklineAvgPerMonth = computed(() => {
  const arr = Array(sparkData.value.length).fill(avgPerMonth.value)
  return ensureVariance(arr)
})

const sparklineLargestSource = computed(() => {
  let running = 0
  const data = sparkData.value.map((d) => {
    running += d.largestSourceIncome
    return periodMonths.value.length > 1 ? d.largestSourceIncome : running
  })
  return ensureVariance(data)
})

const sparklineSavingsRate = computed(() => {
  let runningIncome = 0
  let runningSpending = 0
  const data = sparkData.value.map((d) => {
    runningIncome += d.income
    runningSpending += d.spending
    const i = periodMonths.value.length > 1 ? d.income : runningIncome
    const s = periodMonths.value.length > 1 ? d.spending : runningSpending
    return i > 0 ? Math.max(0, (i - s) / i) : 0
  })
  return ensureVariance(data)
})

// ── Source icon helper ────────────────────────────────────────────────────────
const sourceIconMap = {
  salary: 'mdi-briefcase-outline',
  paycheck: 'mdi-briefcase-outline',
  freelance: 'mdi-laptop',
  'side gig': 'mdi-lightning-bolt-outline',
  interest: 'mdi-chart-line',
  dividend: 'mdi-chart-line',
  investment: 'mdi-chart-line',
  reimbursement: 'mdi-cash-refund',
  rental: 'mdi-home-outline',
  bonus: 'mdi-star-outline',
  other: 'mdi-dots-horizontal'
}

function sourceIcon(name) {
  if (!name) return 'mdi-cash'
  const key = name.toLowerCase()
  for (const [k, v] of Object.entries(sourceIconMap)) {
    if (key.includes(k)) return v
  }
  return 'mdi-cash'
}

// ── Recent income table ───────────────────────────────────────────────────────
const showAllIncome = ref(false)

const recentIncome = computed(() =>
  [...incomeTransactions.value]
    .sort((a, b) => String(b.DTPOSTED || '').localeCompare(String(a.DTPOSTED || '')))
    .map((t) => {
      const s = String(t.DTPOSTED || '')
      const d =
        s.length >= 8
          ? new Date(parseInt(s.slice(0, 4)), parseInt(s.slice(4, 6)) - 1, parseInt(s.slice(6, 8)))
          : null
      return {
        FITID: t.FITID,
        name: t.NAME || t.MEMO || 'Unknown',
        category: t.category || null,
        amount: Number(t.TRNAMT),
        dateLabel: d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
      }
    })
)

const displayedIncome = computed(() =>
  showAllIncome.value ? recentIncome.value : recentIncome.value.slice(0, 8)
)

// ── Income trend chart ────────────────────────────────────────────────────────
const trendMonths = computed(() => transactionsStore.monthlyTotals.slice(-12))

const trendChipLabel = computed(() => {
  const n = trendMonths.value.length
  return n === 1 ? '1 month' : `${n} months`
})

const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  if (hex.startsWith('rgb')) return hex
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex
  const r = parseInt(full.slice(1, 3), 16) || 0
  const g = parseInt(full.slice(3, 5), 16) || 0
  const b = parseInt(full.slice(5, 7), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const incomeTrendData = computed(() => {
  const successColor = theme.current.value.colors.success

  return {
    labels: trendMonths.value.map((m) => {
      const y = parseInt(m.month.slice(0, 4))
      const mo = parseInt(m.month.slice(4, 6)) - 1
      return new Date(y, mo, 1).toLocaleDateString('en-US', { month: 'short' })
    }),
    datasets: [
      {
        label: 'Income',
        data: trendMonths.value.map((m) => m.income || 0),
        backgroundColor: successColor,
        borderRadius: 4,
        barPercentage: 0.6
      }
    ]
  }
})

const incomeTrendOptions = computed(() => {
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

// ── Category label resolver ───────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function resolveCategoryLabel(value) {
  if (!value) return 'Other'
  const hit = categoriesStore.categoryById[value]
  if (hit?.name) return hit.name
  // Orphaned UUID (category deleted) → "Unknown"; legacy plain-string → show as-is
  return UUID_RE.test(value) ? 'Unknown' : value
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatPercent(val, total) {
  if (!total) return '0%'
  return `${Math.round((val / total) * 100)}%`
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadIncome() {
  try {
    await Promise.all([categoriesStore.fetchCategories(), transactionsStore.fetchMonthlyTotals()])

    const monthResults = await Promise.all(
      periodMonths.value.map((m) => ipc?.invoke('transactions:fetch', { DTPOSTED: m }))
    )
    periodTransactions.value = monthResults.filter((r) => r?.success).flatMap((r) => r.data ?? [])
  } catch (err) {
    console.error('Income load error', err)
  }
}

onMounted(loadIncome)
watch([periodStart, period], loadIncome)
</script>
