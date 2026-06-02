<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-start justify-space-between mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Debt payoff</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ debtsStore.strategy === 'snowball' ? 'Snowball' : 'Avalanche' }} plan · debt-free by
          {{ estimatedPayoffDate }}
        </div>
      </div>
      <v-select
        :model-value="debtsStore.strategy"
        :items="strategyOptions"
        item-title="title"
        item-value="value"
        label="Method"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 180px"
        @update:model-value="debtsStore.setStrategy"
       color="primary" />
    </div>

    <!-- Summary Cards -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-card rounded="lg" variant="outlined" class="pa-5">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-3">
            Total Debt
          </div>
          <div class="text-h4 font-weight-bold text-error">
            {{ formatCurrency(totalDebt) }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="lg" variant="outlined" class="pa-5">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-3">
            Paid Off
          </div>
          <div class="text-h4 font-weight-bold text-success">
            {{ formatCurrency(paidOff) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ paidOffPercent }}% of {{ formatCurrency(totalStartingBalance) }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="lg" variant="outlined" class="pa-5">
          <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-3">
            Monthly Payment
          </div>
          <div class="text-h4 font-weight-bold">{{ formatCurrency(monthlyPayment) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Overall Progress -->
    <v-card rounded="lg" variant="outlined" class="pa-5 mb-6">
      <div class="d-flex justify-space-between align-center mb-3">
        <span class="font-weight-bold">Overall progress to debt-free</span>
        <span class="text-body-2 text-medium-emphasis">
          {{ formatCurrency(paidOff) }} / {{ formatCurrency(totalStartingBalance) }}
        </span>
      </div>
      <v-progress-linear
        :model-value="overallProgress"
        color="success"
        height="10"
        rounded
      />
    </v-card>

    <!-- Per-debt Cards -->
    <v-row>
      <v-col v-for="debt in debtCardRows" :key="debt.id" cols="12" md="6">
        <v-card rounded="lg" variant="outlined" class="pa-5">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-1 font-weight-bold">{{ debt.name }}</span>
            <v-chip variant="outlined" size="small" class="font-weight-bold text-caption">
              {{ formatPercent(debt.interestRate) }} APR
            </v-chip>
          </div>
          <v-progress-linear
            :model-value="debt.progress"
            :color="debt.isHighApr ? 'error' : 'success'"
            height="8"
            rounded
            class="mb-3"
          />
          <div class="d-flex justify-space-between">
            <span class="text-body-2 text-medium-emphasis">
              {{ formatCurrency(debt.currentBalance) }} left
            </span>
            <span class="text-body-2 text-medium-emphasis">Target {{ debt.payoffDate }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserDebtsStore } from '../stores/userDebts'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'

const accountsStore = useUserAccountsStore()
const debtsStore = useUserDebtsStore()
const txStore = useUserTransactionsStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings

const strategyOptions = [
  { title: 'Snowball', value: 'snowball' },
  { title: 'Avalanche', value: 'avalanche' }
]

function freqToMonthlyFactor(freq) {
  if (freq === 'Weekly') return 52 / 12
  if (freq === 'BiWeekly') return 26 / 12
  return 1
}

function formatPercent(val) {
  return `${Number(val || 0).toFixed(1)}%`
}

const txSummaryMap = computed(() => {
  const map = {}
  for (const s of txStore.accountSummary) {
    map[s.ACCTID] = s.total ?? 0
  }
  return map
})

function accountCurrentBalance(account) {
  const details = debtsStore.getDetail(account.ACCTID)
  if (details.currentBalance > 0) return details.currentBalance
  const txTotal = txSummaryMap.value[account.ACCTID] ?? 0
  if (account.startingBalance !== null && account.startingBalance !== undefined) {
    const balance = account.startingBalance + txTotal
    if (balance !== 0) return Math.abs(balance)
  }
  if (txTotal < 0) return Math.abs(txTotal)
  return 0
}

const debtAccounts = computed(() =>
  accountsStore.accounts.filter((account) => {
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
)

const debtRows = computed(() =>
  debtAccounts.value
    .map((account) => {
      const accountId = account.ACCTID
      const details = debtsStore.getDetail(accountId)
      const paymentFrequency = account.paymentFrequency ?? null
      const minimumPayment = Number(details.minimumPayment) || 0
      const monthlyMinimumPayment = minimumPayment * freqToMonthlyFactor(paymentFrequency)
      const currentBalance = accountCurrentBalance(account)
      const startingBalance =
        details.startingBalance > 0
          ? details.startingBalance
          : account.startingBalance !== null && account.startingBalance !== undefined
            ? Math.abs(account.startingBalance)
            : currentBalance
      const progress =
        startingBalance > 0
          ? Math.min(100, Math.max(0, ((startingBalance - currentBalance) / startingBalance) * 100))
          : 0
      return {
        id: accountId,
        name: account.displayName || account.ORG || `Account ${accountId}`,
        currentBalance,
        startingBalance,
        interestRate: account.interestRate || details.interestRate || 0,
        minimumPayment,
        monthlyMinimumPayment,
        paymentFrequency,
        progress
      }
    })
    .sort((a, b) => b.interestRate - a.interestRate || b.currentBalance - a.currentBalance)
)

function runSimulation(debts, extra, strategy) {
  if (!debts.length) return { results: [], totalMonths: 0, totalInterest: 0, totalPaid: 0 }

  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche'
      ? b.interestRate - a.interestRate || b.currentBalance - a.currentBalance
      : a.currentBalance - b.currentBalance || b.interestRate - a.interestRate
  )

  const n = sorted.length
  const balances = sorted.map((d) => d.currentBalance)
  const minimums = sorted.map((d) => d.monthlyMinimumPayment)
  const rates = sorted.map((d) => d.interestRate / 100 / 12)
  const interestAccum = new Array(n).fill(0)
  const payoffMonth = new Array(n).fill(null)
  const paymentAtPayoff = new Array(n).fill(0)

  let month = 0
  while (balances.some((b) => b > 0.01) && month < 600) {
    month++
    for (let i = 0; i < n; i++) {
      if (balances[i] > 0) {
        const interest = balances[i] * rates[i]
        balances[i] += interest
        interestAccum[i] += interest
      }
    }
    let pool = extra
    for (let i = 0; i < n; i++) {
      if (balances[i] > 0) pool += minimums[i]
    }
    const monthPool = pool
    const focusIdx = balances.findIndex((b) => b > 0.01)
    for (let i = 0; i < n; i++) {
      if (i === focusIdx || balances[i] <= 0.01) continue
      const pay = Math.min(minimums[i], balances[i])
      balances[i] = Math.max(0, balances[i] - pay)
      pool -= pay
      if (balances[i] <= 0.01) {
        balances[i] = 0
        payoffMonth[i] = month
        paymentAtPayoff[i] = monthPool
      }
    }
    if (focusIdx >= 0) {
      balances[focusIdx] = Math.max(0, balances[focusIdx] - Math.min(pool, balances[focusIdx]))
      if (balances[focusIdx] <= 0.01) {
        balances[focusIdx] = 0
        payoffMonth[focusIdx] = month
        paymentAtPayoff[focusIdx] = monthPool
      }
    }
  }

  const totalMonths = Math.max(0, ...payoffMonth.map((m) => m ?? month))
  const totalInterest = interestAccum.reduce((s, v) => s + v, 0)
  const totalPaid = sorted.reduce((s, d) => s + d.currentBalance, 0) + totalInterest

  return {
    results: sorted.map((d, i) => ({
      id: d.id,
      name: d.name,
      currentBalance: d.currentBalance,
      interestRate: d.interestRate,
      payoffMonth: payoffMonth[i] ?? totalMonths
    })),
    totalMonths,
    totalInterest,
    totalPaid
  }
}

const activeSimulation = computed(() =>
  runSimulation(
    debtRows.value.filter((d) => d.currentBalance > 0),
    debtsStore.extraPayment,
    debtsStore.strategy
  )
)

const estimatedPayoffDate = computed(() => {
  const m = activeSimulation.value.totalMonths
  if (!m) return 'N/A'
  const d = new Date()
  d.setMonth(d.getMonth() + m)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
})

const totalDebt = computed(() => debtRows.value.reduce((s, d) => s + d.currentBalance, 0))

const totalStartingBalance = computed(() =>
  debtRows.value.reduce(
    (s, d) => s + (d.startingBalance > 0 ? d.startingBalance : d.currentBalance),
    0
  )
)

const paidOff = computed(() => Math.max(0, totalStartingBalance.value - totalDebt.value))

const paidOffPercent = computed(() =>
  totalStartingBalance.value > 0
    ? Math.round((paidOff.value / totalStartingBalance.value) * 100)
    : 0
)

const monthlyPayment = computed(() =>
  debtRows.value.reduce((s, d) => s + d.monthlyMinimumPayment, 0)
)

const overallProgress = computed(() =>
  totalStartingBalance.value > 0 ? (paidOff.value / totalStartingBalance.value) * 100 : 0
)

const debtCardRows = computed(() => {
  const base = new Date()
  const simMap = new Map(activeSimulation.value.results.map((r) => [r.id, r]))
  return debtRows.value.map((debt) => {
    const sim = simMap.get(debt.id)
    let payoffDate = '—'
    if (sim) {
      const d = new Date(base)
      d.setMonth(base.getMonth() + sim.payoffMonth)
      payoffDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    return {
      id: debt.id,
      name: debt.name,
      interestRate: debt.interestRate,
      currentBalance: debt.currentBalance,
      progress: debt.progress,
      payoffDate,
      isHighApr: debt.interestRate >= 15
    }
  })
})

onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    debtsStore.fetchDebtDetails(),
    txStore.fetchAccountSummary()
  ])
})
</script>
