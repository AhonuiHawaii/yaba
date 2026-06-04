<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-start justify-space-between mb-6">
      <div>
        <div class="text-h4 font-weight-bold mb-2">Debt Payoff Planner</div>
        <div class="text-body-1 text-medium-emphasis">
          Get out of debt faster. See how extra payments can save you time and money!
        </div>
      </div>
      <div class="d-flex gap-4">
        <v-select
          :model-value="debtsStore.strategy"
          :items="strategyOptions"
          item-title="title"
          item-value="value"
          label="Strategy"
          variant="outlined"
          density="comfortable"
          color="primary"
          hide-details
          style="min-width: 180px"
          @update:model-value="debtsStore.setStrategy"
        />
      </div>
    </div>

    <!-- Impact Calculator / Banner -->
    <v-card rounded="xl" color="primary" variant="tonal" class="pa-6 mb-8 border" elevation="0">
      <v-row align="center">
        <v-col cols="12" md="6">
          <div class="text-h6 font-weight-bold mb-2">Extra Payment Impact Calculator</div>
          <div class="text-body-2 mb-4">
            How much extra can you put towards your debt each month? Even a small amount makes a
            huge difference!
          </div>
          <v-slider
            :model-value="debtsStore.extraPayment"
            :min="0"
            :max="2000"
            :step="50"
            thumb-label="always"
            color="primary"
            @update:model-value="debtsStore.setExtraPayment"
          >
            <template #thumb-label="{ modelValue }">
              {{ formatCurrency(modelValue) }}
            </template>
          </v-slider>
        </v-col>
        <v-col cols="12" md="6" class="text-md-right mt-4 mt-md-0">
          <div v-if="activeSimulation.totalMonths > 0">
            <div class="text-h5 font-weight-bold text-primary mb-1">
              Debt-free by {{ estimatedPayoffDate }}
            </div>
            <div class="text-body-2 font-weight-medium">
              You will pay a total of
              <strong>{{ formatCurrency(activeSimulation.totalInterest) }}</strong> in interest.
            </div>
            <v-chip
              color="success"
              variant="flat"
              class="mt-3 font-weight-bold"
              prepend-icon="mdi-party-popper"
            >
              Keep it up! You're on track.
            </v-chip>
          </div>
          <div v-else class="text-h6 font-weight-bold text-success">
            You are completely debt free!
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!-- Summary Cards -->
    <v-row class="mb-8">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" variant="outlined" class="pa-6 d-flex flex-column h-100 bg-surface">
          <div class="d-flex align-center mb-4">
            <v-avatar color="error" variant="tonal" size="48" class="mr-4">
              <v-icon>mdi-credit-card-remove-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                Total Debt
              </div>
              <div class="text-h4 font-weight-bold text-error">
                {{ formatCurrency(totalDebt) }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" variant="outlined" class="pa-6 d-flex flex-column h-100 bg-surface">
          <div class="d-flex align-center mb-4">
            <v-avatar color="success" variant="tonal" size="48" class="mr-4">
              <v-icon>mdi-check-decagram-outline</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                Total Paid Off
              </div>
              <div class="text-h4 font-weight-bold text-success">
                {{ formatCurrency(paidOff) }}
              </div>
            </div>
          </div>
          <div class="mt-auto">
            <div class="d-flex justify-space-between text-caption font-weight-medium mb-1">
              <span>Progress to debt-free</span>
              <span>{{ paidOffPercent }}%</span>
            </div>
            <v-progress-linear :model-value="overallProgress" color="success" height="8" rounded />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" variant="outlined" class="pa-6 d-flex flex-column h-100 bg-surface">
          <div class="d-flex align-center mb-4">
            <v-avatar color="primary" variant="tonal" size="48" class="mr-4">
              <v-icon>mdi-calendar-month-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                Min. Payment
              </div>
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(monthlyPayment) }}
              </div>
            </div>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-auto">
            Plus extra <strong>{{ formatCurrency(debtsStore.extraPayment) }}</strong>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" variant="outlined" class="pa-6 d-flex flex-column h-100 bg-surface">
          <div class="d-flex align-center mb-4">
            <v-avatar color="warning" variant="tonal" size="48" class="mr-4">
              <v-icon>mdi-cash-remove</v-icon>
            </v-avatar>
            <div>
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
                Total Est. Interest
              </div>
              <div class="text-h4 font-weight-bold text-warning">
                {{ formatCurrency(activeSimulation.totalInterest) }}
              </div>
            </div>
          </div>
          <div class="text-body-2 text-medium-emphasis mt-auto">
            Paid over {{ activeSimulation.totalMonths }} months
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div class="text-h5 font-weight-bold mb-4">Your Debts</div>

    <!-- Per-debt Cards -->
    <v-row v-if="debtCardRows.length > 0">
      <v-col v-for="debt in debtCardRows" :key="debt.id" cols="12" md="6" lg="4">
        <v-card
          rounded="xl"
          variant="outlined"
          class="pa-5 d-flex flex-column h-100 hover-card bg-surface"
        >
          <div class="d-flex justify-space-between align-start mb-4">
            <div>
              <div class="text-h6 font-weight-bold line-clamp-1">{{ debt.name }}</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ debt.rawAccount.ORG || 'Unknown Institution' }}
              </div>
            </div>
            <v-btn
              icon="mdi-dots-horizontal"
              variant="text"
              density="comfortable"
              @click="openEditDialog(debt.rawAccount)"
            />
          </div>

          <div class="d-flex justify-space-between align-center mb-4">
            <div class="text-h5 font-weight-bold text-error">
              {{ formatCurrency(debt.currentBalance) }}
            </div>
            <v-chip
              variant="tonal"
              size="small"
              class="font-weight-bold"
              :color="debt.isHighApr ? 'error' : 'warning'"
            >
              {{ formatPercent(debt.interestRate) }} APR
            </v-chip>
          </div>

          <!-- Credit Utilization (if limit exists) -->
          <div v-if="debt.creditLimit > 0" class="mb-4">
            <div class="d-flex justify-space-between text-caption font-weight-medium mb-1">
              <span>Credit Utilization</span>
              <span :class="getUtilizationColorClass(debt.utilization)"
                >{{ debt.utilization }}%</span
              >
            </div>
            <v-progress-linear
              :model-value="debt.utilization"
              :color="getUtilizationColor(debt.utilization)"
              height="6"
              rounded
            />
            <div class="text-caption text-medium-emphasis mt-1">
              Limit: {{ formatCurrency(debt.creditLimit) }}
            </div>
          </div>
          <!-- Payoff Progress (if no limit, show starting balance progress) -->
          <div v-else class="mb-4">
            <div class="d-flex justify-space-between text-caption font-weight-medium mb-1">
              <span>Payoff Progress</span>
              <span class="text-success">{{ Math.round(debt.progress) }}%</span>
            </div>
            <v-progress-linear :model-value="debt.progress" color="success" height="6" rounded />
            <div class="text-caption text-medium-emphasis mt-1">
              Starting: {{ formatCurrency(debt.startingBalance) }}
            </div>
          </div>

          <v-divider class="my-4" />

          <div class="d-flex justify-space-between align-center mt-auto">
            <div class="text-body-2">
              <div class="text-medium-emphasis text-caption">Min. Payment</div>
              <div class="font-weight-bold">{{ formatCurrency(debt.monthlyMinimumPayment) }}</div>
            </div>
            <div class="text-center">
              <div class="text-medium-emphasis text-caption">Est. Interest</div>
              <div class="font-weight-bold text-warning">
                {{ formatCurrency(debt.interestPaid) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-medium-emphasis text-caption">Target Payoff</div>
              <div class="font-weight-bold text-primary">{{ debt.payoffDate }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-card
      v-else
      variant="outlined"
      rounded="xl"
      class="pa-12 text-center text-medium-emphasis border-dashed"
    >
      <v-icon size="64" class="mb-4" color="success">mdi-check-circle-outline</v-icon>
      <div class="text-h6 font-weight-bold">No Debts Found</div>
      <div class="text-body-1">Add a loan or credit card to start tracking your payoff!</div>
    </v-card>

    <!-- Edit Debt Dialog -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card rounded="xl">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h5 font-weight-bold">Edit Debt Details</span>
            <v-btn icon="mdi-close" variant="text" density="compact" @click="editDialog = false" />
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">{{ editForm.displayName }}</div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="editForm.startingBalance"
                label="Starting Balance"
                prefix="$"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                type="number"
                color="primary"
                hide-details="auto"
                class="mb-4"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="editForm.minimumPayment"
                label="Min. Payment"
                prefix="$"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                type="number"
                color="primary"
                hide-details="auto"
                class="mb-4"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="editForm.interestRate"
                label="Interest Rate (APR)"
                suffix="%"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                type="number"
                color="primary"
                hide-details="auto"
                class="mb-4"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="editForm.creditLimit"
                label="Credit Limit (Optional)"
                prefix="$"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                type="number"
                color="primary"
                hide-details="auto"
                class="mb-4"
              />
            </v-col>
          </v-row>

          <v-card variant="tonal" color="primary" class="mt-4 pa-4" rounded="lg">
            <div class="d-flex align-center mb-2">
              <v-icon size="20" class="mr-2">mdi-link</v-icon>
              <div class="font-weight-bold">Automate Tracking</div>
            </div>
            <div class="text-body-2 mb-3">
              Create a rule to automatically link your payments from checking to this debt account,
              shrinking your balance effortlessly!
            </div>
            <v-btn
              color="primary"
              variant="flat"
              block
              rounded="lg"
              prepend-icon="mdi-plus"
              @click="openRuleDialog"
            >
              Create Payment Rule
            </v-btn>
          </v-card>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="accountsStore.loading"
            @click="saveAccount"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Payment Rule Dialog -->
    <v-dialog v-model="ruleDialog" max-width="500">
      <v-card rounded="xl">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h5 font-weight-bold">Create Payment Rule</span>
            <v-btn icon="mdi-close" variant="text" density="compact" @click="ruleDialog = false" />
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Link transactions to {{ editForm.displayName }}
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <div class="text-body-2 mb-4">
            Enter a keyword that appears in your checking account when you pay this debt (e.g.
            "Capital One", "Chase Credit Card").
          </div>
          <v-text-field
            v-model="ruleForm.keyword"
            label="Transaction name contains"
            variant="outlined"
            density="comfortable"
            rounded="lg"
            color="primary"
            hide-details="auto"
            placeholder="e.g. Capital One"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-6">
          <v-spacer />
          <v-btn variant="text" @click="ruleDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            :disabled="!ruleForm.keyword"
            :loading="rulesStore.loading"
            @click="saveRule"
          >
            Save Rule
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserDebtsStore } from '../stores/userDebts'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserRulesStore } from '../stores/userRules'
import { useUserSettingsStore } from '../stores/userSettings'

const accountsStore = useUserAccountsStore()
const debtsStore = useUserDebtsStore()
const txStore = useUserTransactionsStore()
const rulesStore = useUserRulesStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings

const strategyOptions = [
  { title: 'Snowball (Smallest balance first)', value: 'snowball' },
  { title: 'Avalanche (Highest interest first)', value: 'avalanche' }
]

function freqToMonthlyFactor(freq) {
  if (freq === 'Weekly') return 52 / 12
  if (freq === 'BiWeekly') return 26 / 12
  return 1
}

function formatPercent(val) {
  return `${Number(val || 0).toFixed(1)}%`
}

function getUtilizationColor(percent) {
  if (percent < 30) return 'success'
  if (percent < 70) return 'warning'
  return 'error'
}

function getUtilizationColorClass(percent) {
  if (percent < 30) return 'text-success'
  if (percent < 70) return 'text-warning'
  return 'text-error'
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
      const paymentFrequency = account.paymentFrequency ?? null
      const minimumPayment = Number(account.minimumPayment) || 0
      const monthlyMinimumPayment = minimumPayment * freqToMonthlyFactor(paymentFrequency)

      const sb =
        account.startingBalance !== null && account.startingBalance !== undefined
          ? Math.abs(account.startingBalance)
          : 0

      const creditLimit = Number(account.creditLimit) || 0

      // Calculate payments made from transactions via linkedAccount
      // Note: TRNAMT is usually negative for expenses, so Math.abs() gives us the magnitude of the payment.
      const paymentsObj = txStore.debtPayments.find((p) => p.linkedAccount === accountId)
      const paymentsTotal = paymentsObj ? Math.abs(paymentsObj.total) : 0

      const currentBalance = Math.max(0, sb - paymentsTotal)
      const progress = sb > 0 ? Math.min(100, Math.max(0, ((sb - currentBalance) / sb) * 100)) : 0

      const utilization =
        creditLimit > 0 ? Math.min(100, Math.round((currentBalance / creditLimit) * 100)) : 0

      return {
        id: accountId,
        name: account.displayName || account.ORG || `Account ${maskAcctid(accountId)}`,
        currentBalance,
        startingBalance: sb,
        creditLimit,
        interestRate: Number(account.interestRate) || 0,
        minimumPayment,
        monthlyMinimumPayment,
        paymentFrequency,
        progress,
        utilization,
        rawAccount: account
      }
    })
    .sort((a, b) => b.interestRate - a.interestRate || b.currentBalance - a.currentBalance)
)

function maskAcctid(id) {
  return String(id || '').slice(-4)
}

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
      payoffMonth: payoffMonth[i] ?? totalMonths,
      interestPaid: interestAccum[i]
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
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
    let interestPaid = 0
    if (sim) {
      const d = new Date(base)
      d.setMonth(base.getMonth() + sim.payoffMonth)
      payoffDate = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      interestPaid = sim.interestPaid
    }
    return {
      ...debt,
      payoffDate,
      interestPaid,
      isHighApr: debt.interestRate >= 15
    }
  })
})

// ── Edit Dialog ─────────────────────────────────────────────────────────────
const editDialog = ref(false)
const editForm = ref({})

function openEditDialog(account) {
  editForm.value = {
    ACCTID: account.ACCTID,
    displayName: account.displayName || account.ORG || `Account ${maskAcctid(account.ACCTID)}`,
    startingBalance: account.startingBalance !== null ? Math.abs(account.startingBalance) : 0,
    minimumPayment: account.minimumPayment || 0,
    interestRate: account.interestRate || 0,
    creditLimit: account.creditLimit || 0
  }
  editDialog.value = true
}

async function saveAccount() {
  await accountsStore.updateAccount(editForm.value.ACCTID, {
    startingBalance: editForm.value.startingBalance,
    minimumPayment: editForm.value.minimumPayment,
    interestRate: editForm.value.interestRate,
    creditLimit: editForm.value.creditLimit
  })
  editDialog.value = false
}

// ── Rule Dialog ──────────────────────────────────────────────────────────────
const ruleDialog = ref(false)
const ruleForm = ref({ keyword: '' })

function openRuleDialog() {
  ruleForm.value.keyword = ''
  ruleDialog.value = true
}

async function saveRule() {
  await rulesStore.createRule({
    name: `Payment to ${editForm.value.displayName}`,
    priority: 100,
    conditions: [
      {
        field: 'NAME',
        operator: 'contains',
        value: ruleForm.value.keyword
      }
    ],
    actions: [
      {
        type: 'linkAccount',
        value: editForm.value.ACCTID
      }
    ]
  })
  ruleDialog.value = false
}

onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    txStore.fetchAccountSummary(),
    txStore.fetchDebtPayments()
  ])
})
</script>

<style scoped>
.hover-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important;
}
.border-dashed {
  border-style: dashed !important;
  border-width: 2px !important;
}
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
