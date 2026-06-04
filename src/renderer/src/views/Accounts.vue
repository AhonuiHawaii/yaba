<template>
  <v-container fluid class="pa-6" style="max-width: 960px; margin: 0 auto">
    <!-- Header -->
    <div class="d-flex align-start justify-space-between mb-6">
      <div>
        <div class="text-h5 font-weight-bold">Accounts</div>
        <div class="text-body-2 text-medium-emphasis mt-1">Balances from your last import</div>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-upload"
        @click="emit('navigate', 'Import')"
      >
        Update via OFX
      </v-btn>
    </div>

    <!-- Empty state -->
    <v-card variant="flat" v-if="store.accounts.length === 0" rounded="lg" elevation="1">
      <v-card-text class="pa-12 text-center">
        <v-icon size="60" class="mb-4 text-disabled">mdi-bank-off-outline</v-icon>
        <div class="text-h6 font-weight-medium mb-2">No accounts yet</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Import an OFX or QFX file from your bank to get started.
        </div>
        <div class="d-flex align-center justify-center gap-3">
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-download-outline"
            @click="emit('navigate', 'Import')"
          >
            Import via OFX
          </v-btn>
          <v-btn
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-pencil-plus-outline"
            @click="manualDialog = true"
          >
            Add Manual
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Account cards grid -->
    <v-row v-else>
      <v-col v-for="account in store.accounts" :key="account.ACCTID" cols="12" sm="6" md="4">
        <v-card rounded="lg" elevation="1" class="h-100">
          <v-card-text class="pa-4">
            <!-- Top row: icon + chip + menu -->
            <div class="d-flex justify-space-between align-center mb-4">
              <v-avatar
                :color="accountTypeColor(account.ACCTTYPE)"
                variant="flat"
                size="40"
                rounded="lg"
              >
                <v-icon :icon="accountTypeIcon(account.ACCTTYPE)" size="20" />
              </v-avatar>
              <div class="d-flex align-center gap-1">
                <v-chip
                  size="small"
                  variant="flat"
                  rounded
                  class="text-uppercase"
                  :color="accountTypeColor(account.ACCTTYPE)"
                >
                  {{ shortTypeLabel(account.ACCTTYPE) }}
                </v-chip>
                <v-menu location="bottom end">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="x-small"
                      density="compact"
                    />
                  </template>
                  <v-list density="compact" rounded="lg" min-width="140">
                    <v-list-item
                      prepend-icon="mdi-pencil-outline"
                      title="Edit"
                      @click="openEditName(account)"
                    />
                    <v-list-item
                      prepend-icon="mdi-delete-outline"
                      title="Remove"
                      base-color="error"
                      @click="confirmRemove(account)"
                    />
                  </v-list>
                </v-menu>
              </div>
            </div>

            <!-- Account name -->
            <div class="text-subtitle-1 font-weight-bold mb-1">
              {{ account.displayName || account.ACCTTYPE || 'Unknown' }}
            </div>

            <!-- Balance -->
            <div
              class="text-h5 font-weight-bold mb-3"
              :class="
                accountBalance(account) !== null && accountBalance(account) < 0 ? 'text-error' : ''
              "
            >
              {{ accountBalance(account) !== null ? formatBalance(accountBalance(account)) : '—' }}
            </div>

            <!-- Footer -->
            <div class="text-caption text-medium-emphasis">
              <template v-if="account.lastImport">
                ••{{ account.ACCTID }} · synced {{ formatSyncDate(account.lastImport) }}
              </template>
              <template v-else>
                manual ·
                <span
                  class="text-primary"
                  style="cursor: pointer; text-decoration: underline"
                  @click.stop="openEditName(account)"
                >
                  edit value
                </span>
              </template>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Add account slot -->
      <v-col cols="12" sm="6" md="4">
        <div
          class="d-flex align-center justify-center rounded"
          style="
            height: 100%;
            min-height: 176px;
            border: 2px dashed rgba(0, 0, 0, 0.12);
            cursor: pointer;
          "
          @click="manualDialog = true"
        >
          <v-icon size="36" color="medium-emphasis">mdi-plus-circle-outline</v-icon>
        </div>
      </v-col>
    </v-row>

    <!-- Add Manual Account Modal -->
    <v-dialog v-model="manualDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <v-icon color="primary" size="22">mdi-pencil-plus-outline</v-icon>
              <span class="text-h6 font-weight-bold">Add Manual Account</span>
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              @click="manualDialog = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="manualForm.displayName"
            label="Account name"
            placeholder="e.g. Affirm — Sofa"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            autofocus
            color="primary"
          />
          <v-text-field
            v-model="manualForm.ORG"
            label="Lender"
            placeholder="e.g. Affirm"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            color="primary"
          />
          <v-select
            v-model="manualForm.ACCTTYPE"
            :items="manualAccountTypes"
            label="Type"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            color="primary"
          />
          <v-text-field
            v-model.number="manualForm.interestRate"
            label="Interest Rate (%)"
            type="number"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            color="primary"
          />
          <v-text-field
            v-model="manualForm.startingBalance"
            label="Current Balance Owed"
            type="number"
            step="0.01"
            placeholder="0.00"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            :prefix="userSettings.currencySymbol"
            color="primary"
          />
          <template v-if="isVariableDueDate({ ACCTTYPE: manualForm.ACCTTYPE })">
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
              Payment Frequency
            </div>
            <v-btn-toggle
              v-model="manualForm.paymentFrequency"
              mandatory
              divided
              variant="flat"
              density="compact"
              color="primary"
              class="mb-4"
            >
              <v-btn value="Weekly" size="small">Weekly</v-btn>
              <v-btn value="BiWeekly" size="small">Bi-Weekly</v-btn>
              <v-btn value="Monthly" size="small">Monthly</v-btn>
            </v-btn-toggle>
            <v-menu
              v-if="manualForm.paymentFrequency === 'Monthly'"
              :close-on-content-click="false"
              location="bottom end"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="manualForm.dueDate ? `Day ${manualForm.dueDate}` : ''"
                  label="Due Date"
                  readonly
                  clearable
                  variant="solo-filled"
                  density="comfortable"
                  rounded="lg"
                  color="primary"
                  hide-details="auto"
                  append-inner-icon="mdi-calendar"
                  @click:clear="manualForm.dueDate = null"
                />
              </template>
              <v-date-picker
                :model-value="dueDateToPickerValue(manualForm.dueDate)"
                color="primary"
                hide-header
                show-adjacent-months
                @update:model-value="
                  (val) => {
                    manualForm.dueDate = val
                      ? new Date(
                          new Date(val).getTime() - new Date(val).getTimezoneOffset() * 60000
                        ).getDate()
                      : null
                  }
                "
              />
            </v-menu>
            <template v-else>
              <v-menu :close-on-content-click="false" location="bottom end" class="mb-4">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="formatIsoDisplay(manualForm.paymentStartDate)"
                    label="First Payment Date"
                    readonly
                    clearable
                    variant="solo-filled"
                    density="comfortable"
                    rounded="lg"
                    color="primary"
                    hide-details="auto"
                    append-inner-icon="mdi-calendar"
                    class="mb-4"
                    @click:clear="manualForm.paymentStartDate = null"
                  />
                </template>
                <v-date-picker
                  :model-value="isoToPickerValue(manualForm.paymentStartDate)"
                  color="primary"
                  hide-header
                  show-adjacent-months
                  @update:model-value="
                    (val) => {
                      manualForm.paymentStartDate = pickerValToIso(val)
                    }
                  "
                />
              </v-menu>
              <v-text-field
                v-model.number="manualForm.paymentCount"
                label="Number of Payments"
                type="number"
                min="1"
                variant="solo-filled"
                density="comfortable"
                rounded="lg"
                hide-details="auto"
                color="primary"
              />
            </template>
          </template>
          <v-menu v-else :close-on-content-click="false" location="bottom end">
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                :model-value="manualForm.dueDate ? `Day ${manualForm.dueDate}` : ''"
                label="Due Date"
                readonly
                clearable
                variant="solo-filled"
                density="comfortable"
                rounded="lg"
                color="primary"
                hide-details="auto"
                append-inner-icon="mdi-calendar"
                @click:clear="manualForm.dueDate = null"
              />
            </template>
            <v-date-picker
              :model-value="dueDateToPickerValue(manualForm.dueDate)"
              color="primary"
              hide-header
              show-adjacent-months
              @update:model-value="
                (val) => {
                  manualForm.dueDate = val
                    ? new Date(
                        new Date(val).getTime() - new Date(val).getTimezoneOffset() * 60000
                      ).getDate()
                    : null
                }
              "
            />
          </v-menu>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0 flex-column align-end">
          <v-alert
            v-if="store.error"
            type="error"
            density="compact"
            class="mb-2 text-caption w-100"
            rounded="lg"
          >
            {{ store.error }}
          </v-alert>
          <div class="d-flex gap-2">
            <v-spacer />
            <v-btn variant="text" @click="manualDialog = false">Cancel</v-btn>
            <v-btn
              variant="flat"
              rounded="lg"
              :loading="store.loading"
              :disabled="!manualForm.displayName"
              @click="saveManualAccount"
            >
              Add
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Account Modal -->
    <v-dialog v-model="editNameDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <v-icon color="primary" size="20">mdi-pencil-outline</v-icon>
              <span class="text-h6 font-weight-bold">Edit Account</span>
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              density="compact"
              @click="editNameDialog = false"
            />
          </div>
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-text-field
            v-model="editNameValue"
            label="Account name"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            color="primary"
            hide-details="auto"
            class="mb-4"
            autofocus
            @keyup.enter="saveEditName"
          />
          <v-text-field
            v-model="editStartingBalance"
            label="Starting Balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            color="primary"
            :prefix="userSettings.currencySymbol"
            hint="Balance before any tracked transactions. Set this so the current balance is accurate."
            @keyup.enter="saveEditName"
          />
          <v-select
            v-model="editAccountCategory"
            :items="accountRoleItems"
            item-title="title"
            item-value="value"
            label="Account Role"
            variant="solo-filled"
            density="comfortable"
            rounded="lg"
            hide-details="auto"
            class="mb-4"
            hint="Override how this account is classified in Net Worth. 'Default' uses the account type."
            color="primary"
          />
          <template v-if="isLoanAccount(editNameTarget)">
            <v-text-field
              v-model.number="editInterestRate"
              label="Interest Rate (%)"
              type="number"
              variant="solo-filled"
              density="comfortable"
              rounded="lg"
              color="primary"
              hide-details="auto"
              class="mb-4"
              @keyup.enter="saveEditName"
            />
            <template v-if="isVariableDueDate(editNameTarget)">
              <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis mb-2">
                Payment Frequency
              </div>
              <v-btn-toggle
                v-model="editPaymentFrequency"
                mandatory
                divided
                variant="flat"
                density="compact"
                color="primary"
                class="mb-4"
              >
                <v-btn value="Weekly" size="small">Weekly</v-btn>
                <v-btn value="BiWeekly" size="small">Bi-Weekly</v-btn>
                <v-btn value="Monthly" size="small">Monthly</v-btn>
              </v-btn-toggle>
              <v-menu
                v-if="editPaymentFrequency === 'Monthly'"
                :close-on-content-click="false"
                location="bottom end"
              >
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="editDueDate ? `Day ${editDueDate}` : ''"
                    label="Due Date"
                    readonly
                    clearable
                    variant="solo-filled"
                    density="comfortable"
                    rounded="lg"
                    color="primary"
                    hide-details="auto"
                    append-inner-icon="mdi-calendar"
                    @click:clear="editDueDate = null"
                  />
                </template>
                <v-date-picker
                  :model-value="dueDateToPickerValue(editDueDate)"
                  color="primary"
                  hide-header
                  show-adjacent-months
                  @update:model-value="
                    (val) => {
                      editDueDate = val
                        ? new Date(
                            new Date(val).getTime() - new Date(val).getTimezoneOffset() * 60000
                          ).getDate()
                        : null
                    }
                  "
                />
              </v-menu>
              <template v-else>
                <v-menu :close-on-content-click="false" location="bottom end">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      :model-value="formatIsoDisplay(editPaymentStartDate)"
                      label="First Payment Date"
                      readonly
                      clearable
                      variant="solo-filled"
                      density="comfortable"
                      rounded="lg"
                      color="primary"
                      hide-details="auto"
                      append-inner-icon="mdi-calendar"
                      class="mb-4"
                      @click:clear="editPaymentStartDate = null"
                    />
                  </template>
                  <v-date-picker
                    :model-value="isoToPickerValue(editPaymentStartDate)"
                    color="primary"
                    hide-header
                    show-adjacent-months
                    @update:model-value="
                      (val) => {
                        editPaymentStartDate = pickerValToIso(val)
                      }
                    "
                  />
                </v-menu>
                <v-text-field
                  v-model.number="editPaymentCount"
                  label="Number of Payments"
                  type="number"
                  min="1"
                  variant="solo-filled"
                  density="comfortable"
                  rounded="lg"
                  hide-details="auto"
                  color="primary"
                />
              </template>
            </template>
            <v-menu v-else :close-on-content-click="false" location="bottom end">
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="editDueDate ? `Day ${editDueDate}` : ''"
                  label="Due Date"
                  readonly
                  clearable
                  variant="solo-filled"
                  density="comfortable"
                  rounded="lg"
                  color="primary"
                  hide-details="auto"
                  append-inner-icon="mdi-calendar"
                  @click:clear="editDueDate = null"
                />
              </template>
              <v-date-picker
                :model-value="dueDateToPickerValue(editDueDate)"
                color="primary"
                hide-header
                show-adjacent-months
                @update:model-value="
                  (val) => {
                    editDueDate = val
                      ? new Date(
                          new Date(val).getTime() - new Date(val).getTimezoneOffset() * 60000
                        ).getDate()
                      : null
                  }
                "
              />
            </v-menu>
          </template>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-alert
            v-if="store.error"
            type="error"
            density="compact"
            class="mb-2 text-caption"
            rounded="lg"
          >
            {{ store.error }}
          </v-alert>
          <v-spacer />
          <v-btn variant="text" @click="editNameDialog = false">Cancel</v-btn>
          <v-btn variant="flat" rounded="lg" :loading="store.loading" @click="saveEditName">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Confirmation Dialog -->
    <v-dialog v-model="removeDialog" max-width="400" rounded="lg">
      <v-card rounded="lg">
        <v-card-title class="text-h6 pa-6 pb-4">Remove Account</v-card-title>
        <v-card-text class="pa-6 pt-0 text-body-2 text-medium-emphasis">
          Remove
          <strong>{{ pendingRemove?.displayName || pendingRemove?.ORG || 'this account' }}</strong>
          ending in <strong>{{ pendingRemove?.ACCTID }}</strong
          >? This only removes the account from this app — no bank data is affected.
        </v-card-text>
        <v-card-actions class="pa-6 pt-0 gap-2 flex-column align-end">
          <v-alert
            v-if="store.error"
            type="error"
            density="compact"
            class="mb-2 text-caption w-100"
            rounded="lg"
          >
            {{ store.error }}
          </v-alert>
          <div class="d-flex gap-2">
            <v-btn variant="text" @click="removeDialog = false">Cancel</v-btn>
            <v-btn
              color="error"
              variant="flat"
              rounded="lg"
              :loading="store.loading"
              @click="doRemove"
              >Remove</v-btn
            >
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserAccountsStore, accountTypeColor, accountTypeIcon } from '../stores/userAccounts'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserSettingsStore } from '../stores/userSettings'

const emit = defineEmits(['navigate'])

const store = useUserAccountsStore()
const txStore = useUserTransactionsStore()
const userSettings = useUserSettingsStore()
const { formatCurrency } = userSettings

const SHORT_TYPE_LABELS = {
  Checking: 'Checking',
  Savings: 'Savings',
  'Money Market': 'Money Market',
  'Credit Line': 'Credit',
  'Buy Now Pay Later': 'BNPL',
  'Personal Loan': 'Loan',
  'Auto Loan': 'Loan',
  'Student Loan': 'Loan',
  Mortgage: 'Mortgage',
  'Medical Debt': 'Medical',
  'Family / Friend Loan': 'Loan',
  Investing: 'Investing',
  Other: 'Other'
}

function shortTypeLabel(acctType) {
  return SHORT_TYPE_LABELS[acctType] || acctType || 'Account'
}

function formatSyncDate(isoStr) {
  if (!isoStr) return null
  const d = new Date(isoStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const isVariableDueDate = (account) => isLoanAccount(account)

function dueDateToPickerValue(day) {
  if (!day) return null
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const clamped = Math.min(Number(day), lastDay)
  return new Date(now.getFullYear(), now.getMonth(), clamped, 12, 0, 0)
}

function isoToPickerValue(isoStr) {
  if (!isoStr) return null
  const d = new Date(isoStr + 'T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

function formatIsoDisplay(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr + 'T12:00:00')
  if (isNaN(d.getTime())) return isoStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function pickerValToIso(val) {
  if (!val) return null
  const d = new Date(val)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

const isLoanAccount = (account) => {
  const type = String(account?.ACCTTYPE || '').toLowerCase()
  return (
    type.includes('credit') ||
    type.includes('loan') ||
    type.includes('mortgage') ||
    type.includes('buy now pay later') ||
    type.includes('medical debt') ||
    type === 'other'
  )
}

onMounted(() => {
  store.fetchAccounts()
  txStore.fetchAccountSummary()
})

const txSummaryMap = computed(() => {
  const map = {}
  for (const s of txStore.accountSummary) {
    map[s.ACCTID] = s.total ?? 0
  }
  return map
})

function accountBalance(account) {
  if (account.startingBalance === null || account.startingBalance === undefined) return null
  const txTotal = txSummaryMap.value[account.ACCTID] ?? 0
  return account.startingBalance + txTotal
}

function formatBalance(amount) {
  if (amount === null || amount === undefined) return null
  return formatCurrency(amount)
}

const removeDialog = ref(false)
const pendingRemove = ref(null)

// Edit account details
const editNameDialog = ref(false)
const editNameTarget = ref(null)
const editNameValue = ref('')
const editInterestRate = ref(0)
const editDueDate = ref(null)
const editPaymentFrequency = ref('Monthly')
const editPaymentStartDate = ref(null)
const editPaymentCount = ref(null)
const editStartingBalance = ref(null)
const editAccountCategory = ref(null)

const accountRoleItems = [
  { title: 'Default (auto-detect)', value: null },
  { title: 'Asset (counts toward net worth)', value: 'asset' },
  { title: 'Liability (counts as debt)', value: 'liability' }
]

function openEditName(account) {
  editNameTarget.value = account
  editNameValue.value = account.displayName || account.ACCTTYPE || ''
  editInterestRate.value = account.interestRate || 0
  editDueDate.value = account.dueDate || null
  editPaymentFrequency.value = account.paymentFrequency || 'Monthly'
  editPaymentStartDate.value = account.paymentStartDate || null
  editPaymentCount.value = account.paymentCount || null
  editStartingBalance.value =
    account.startingBalance !== null && account.startingBalance !== undefined
      ? account.startingBalance
      : ''
  editAccountCategory.value = account.accountCategory ?? null
  editNameDialog.value = true
}

async function saveEditName() {
  if (editNameTarget.value) {
    const updates = {
      displayName: editNameValue.value.trim() || editNameTarget.value.ACCTTYPE
    }
    const balVal = parseFloat(editStartingBalance.value)
    updates.startingBalance = isNaN(balVal) ? null : balVal
    updates.accountCategory = editAccountCategory.value ?? null
    if (isLoanAccount(editNameTarget.value)) {
      updates.interestRate = Number(editInterestRate.value) || 0
      if (isVariableDueDate(editNameTarget.value)) {
        updates.paymentFrequency = editPaymentFrequency.value
        updates.dueDate =
          editPaymentFrequency.value === 'Monthly' ? Number(editDueDate.value) || null : null
        updates.paymentStartDate =
          editPaymentFrequency.value !== 'Monthly' ? editPaymentStartDate.value || null : null
        updates.paymentCount =
          Number(editPaymentCount.value) > 0 ? Math.round(Number(editPaymentCount.value)) : null
      } else {
        updates.dueDate = Number(editDueDate.value) || null
      }
    }
    const ok = await store.updateAccount(editNameTarget.value.ACCTID, updates)
    if (!ok) return
    txStore.fetchAccountSummary()
  }
  editNameDialog.value = false
  editNameTarget.value = null
}

// Add manual account
const manualDialog = ref(false)
const manualAccountTypes = [
  'Buy Now Pay Later',
  'Personal Loan',
  'Medical Debt',
  'Family / Friend Loan',
  'Other'
]
const emptyManualForm = () => ({
  displayName: '',
  ORG: '',
  ACCTTYPE: 'Buy Now Pay Later',
  interestRate: 0,
  paymentFrequency: 'Monthly',
  dueDate: null,
  paymentStartDate: null,
  paymentCount: null,
  startingBalance: ''
})
const manualForm = ref(emptyManualForm())

async function saveManualAccount() {
  const balVal = parseFloat(manualForm.value.startingBalance)
  const payload = {
    displayName: manualForm.value.displayName.trim(),
    ORG: manualForm.value.ORG.trim() || null,
    ACCTTYPE: manualForm.value.ACCTTYPE,
    interestRate: Number(manualForm.value.interestRate) || 0,
    startingBalance: isNaN(balVal) ? null : balVal,
    paymentFrequency: isVariableDueDate({ ACCTTYPE: manualForm.value.ACCTTYPE })
      ? manualForm.value.paymentFrequency
      : null,
    dueDate:
      isVariableDueDate({ ACCTTYPE: manualForm.value.ACCTTYPE }) &&
      manualForm.value.paymentFrequency === 'Monthly'
        ? Number(manualForm.value.dueDate) || null
        : !isVariableDueDate({ ACCTTYPE: manualForm.value.ACCTTYPE })
          ? Number(manualForm.value.dueDate) || null
          : null,
    paymentStartDate:
      isVariableDueDate({ ACCTTYPE: manualForm.value.ACCTTYPE }) &&
      manualForm.value.paymentFrequency !== 'Monthly'
        ? manualForm.value.paymentStartDate || null
        : null,
    paymentCount:
      Number(manualForm.value.paymentCount) > 0
        ? Math.round(Number(manualForm.value.paymentCount))
        : null
  }
  const created = await store.createManualAccount(payload)
  if (created) {
    manualDialog.value = false
    manualForm.value = emptyManualForm()
  }
}

function confirmRemove(account) {
  pendingRemove.value = account
  removeDialog.value = true
}

async function doRemove() {
  if (pendingRemove.value) {
    await store.removeAccount(pendingRemove.value.ACCTID)
    if (store.error) return
  }
  removeDialog.value = false
  pendingRemove.value = null
}
</script>
