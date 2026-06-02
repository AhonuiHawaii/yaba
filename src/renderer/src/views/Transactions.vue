<template>
  <v-container fluid class="pa-6">
    <!-- Header: period nav + Export/Import -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Transactions</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ periodLabel }} · {{ uncategorizedCount }} need a category
        </div>
      </div>

      <div class="d-flex align-center ga-2">
        <v-btn icon="mdi-chevron-left" variant="text" density="compact" @click="prevPeriod" />
        <span class="text-body-1 font-weight-medium">{{ periodLabel }}</span>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          density="compact"
          :disabled="isNextPeriodFuture"
          @click="nextPeriod"
        />

        <v-btn-group variant="flat" rounded color="primary" density="comfortable" class="ml-2">
          <v-btn :variant="period === 'month' ? 'flat' : 'outlined'" :color="period === 'month' ? 'primary' : undefined" @click="period = 'month'"
            >Month</v-btn
          >
          <v-btn :variant="period === 'quarter' ? 'flat' : 'outlined'" :color="period === 'quarter' ? 'primary' : undefined" @click="period = 'quarter'"
            >Quarter</v-btn
          >
          <v-btn :variant="period === 'semi' ? 'flat' : 'outlined'" :color="period === 'semi' ? 'primary' : undefined" @click="period = 'semi'"
            >Semi</v-btn
          >
          <v-btn :variant="period === 'annual' ? 'flat' : 'outlined'" :color="period === 'annual' ? 'primary' : undefined" @click="period = 'annual'"
            >Annual</v-btn
          >
        </v-btn-group>

        <v-btn variant="flat" color="primary" prepend-icon="mdi-export" @click="emit('navigate', 'Backup')"
          >Export</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          prepend-icon="mdi-upload"
          @click="emit('navigate', 'Import')"
          >Import</v-btn
        >
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="transactions" prepend-icon="mdi-format-list-bulleted">Transactions</v-tab>
      <v-tab value="rules" prepend-icon="mdi-auto-fix">Rules</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- ── Transactions Tab ──────────────────────────────────────────────── -->
      <v-tabs-window-item value="transactions">
        <!-- Import Transactions Dialog -->
        <v-dialog v-model="importDialog" max-width="500">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="22">mdi-file-import-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Import Transactions</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="importDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <p class="text-body-2 text-medium-emphasis mb-4">
                Select an OFX or QFX file exported from your bank to import its transactions.
              </p>

              <v-file-input
                v-model="selectedFile"
                accept=".ofx,.qfx"
                label="Choose OFX / QFX file"
                prepend-icon=""
                prepend-inner-icon="mdi-folder-open-outline"
                variant="solo"
                density="comfortable"
                rounded="sm"
                hide-details="auto"
                :error-messages="store.error ? [store.error] : []"
                @update:model-value="store.clearError()"
              />
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="importDialog = false">Cancel</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :loading="store.loading"
                :disabled="!selectedFile"
                prepend-icon="mdi-import"
                @click="handleImport"
              >
                Import
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Filter bar -->
        <v-sheet rounded="lg" color="primary-container" border class="d-flex align-center ga-3 px-4 py-3 mb-4">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search payee or note"
            variant="solo"
            density="compact"
            hide-details
            rounded="pill"
           color="primary" />

          <div class="d-flex ga-2">
            <v-btn
              v-for="k in filterKinds"
              :key="k.value"
              :variant="'flat'"
              :color="filterKind === k.value ? 'flat' : 'primary'"
              size="small"
              rounded="pill"
              @click="filterKind = k.value"
            >
              <v-icon v-if="filterKind === k.value" start size="14">mdi-check</v-icon>
              {{ k.label }}
            </v-btn>
          </div>

          <v-spacer />

          <v-select
            v-model="filterAccount"
            :items="[{ label: 'All accounts', value: null }, ...accountOptions]"
            item-title="label"
            item-value="value"
            label="Account"
            variant="solo"
            density="compact"
            hide-details
            rounded="lg"
            max-width="200"
           color="primary" />
        </v-sheet>

        <!-- Bulk Action Bar -->
        <v-slide-y-transition>
          <div v-if="selectedRows.length > 0" class="mb-3">
            <v-sheet rounded color="primary" class="pa-3 d-flex align-center ga-3">
              <v-btn-group variant="flat" color="surface" size="small" divided>
                <v-btn class="font-weight-bold pe-none"
                  >{{ selectedRows.length }} selected</v-btn
                >
                <v-btn prepend-icon="mdi-tag-multiple-outline" @click="openBulkCategoryDialog"
                  >Set Category</v-btn
                >
                <v-btn prepend-icon="mdi-account-edit-outline" @click="openBulkPayeeDialog"
                  >Set Payee</v-btn
                >
              </v-btn-group>
              <v-spacer />
              <v-btn
                icon="mdi-close"
                variant="text"
                size="small"
                density="compact"
                @click="selectedRows = []"
              />
            </v-sheet>
          </div>
        </v-slide-y-transition>

        <!-- Error Banner -->
        <v-alert
          v-if="store.error"
          type="error"
          variant="flat"
          closable
          class="mb-3"
          @click:close="store.clearError()"
        >
          {{ store.error }}
        </v-alert>

        <!-- Empty State -->
        <v-card
          v-if="!store.loading && store.transactions.length === 0"
          rounded="sm"
          elevation="0"
          border
        >
          <v-card-text class="pa-12 text-center">
            <v-icon size="60" class="mb-4 text-disabled">mdi-receipt-text-outline</v-icon>
            <div class="text-h6 font-weight-medium mb-2">No transactions found</div>
            <div class="text-body-2 text-medium-emphasis">Import an OFX file to get started.</div>
          </v-card-text>
        </v-card>

        <!-- Data Table -->
        <v-card v-else rounded="sm" elevation="0" border>
          <v-data-table
            v-model="selectedRows"
            show-select
            return-object
            item-value="FITID"
            :headers="headers"
            :items="filteredTransactions"
            :loading="store.loading"
            density="comfortable"
            :items-per-page="25"
            :items-per-page-options="[10, 25, 50, 100]"
            hover
          >
            <template #item.DTPOSTED="{ item }">
              <span class="text-body-2">{{ formatDate(item.DTPOSTED) }}</span>
            </template>

            <template #item.NAME="{ item }">
              <span class="text-body-2 font-weight-medium">{{ item.NAME }}</span>
            </template>

            <template #item.ACCTID="{ item }">
              <span class="text-body-2 text-medium-emphasis">{{ accountName(item.ACCTID) }}</span>
            </template>

            <template #item.category="{ item }">
              <v-chip
                v-if="item.splitCategory1 || item.splitCategory2"
                color="info"
                variant="tonal"
                size="x-small"
                rounded="pill"
                @click="openSplitDialog(item)"
                >Split</v-chip
              >
              <v-chip
                v-else-if="item.category"
                variant="tonal"
                size="x-small"
                rounded="pill"
                @click="openEditCategory(item)"
                >{{ categoryName(item.category) }}</v-chip
              >
              <v-btn
                v-else
                color="primary"
                variant="outlined"
                size="x-small"
                rounded="pill"
                prepend-icon="mdi-plus"
                @click="openEditCategory(item)"
                >Categorize</v-btn
              >
            </template>

            <template #item.TRNAMT="{ item }">
              <span class="font-weight-medium" :class="item.TRNAMT >= 0 ? 'text-success' : ''">
                {{ item.TRNAMT >= 0 ? '+' : '' }}{{ formatCurrency(Math.abs(item.TRNAMT)) }}
              </span>
            </template>

            <template #loading>
              <v-skeleton-loader type="table-row@8" />
            </template>

            <template #bottom="{ itemsLength }">
              <div class="px-4 py-3 text-caption text-medium-emphasis text-center">
                Showing {{ filteredTransactions.length }} of {{ itemsLength }} · select rows to
                bulk-categorize
              </div>
            </template>
          </v-data-table>
        </v-card>

        <!-- Edit Category Dialog -->
        <v-dialog v-model="editCategoryDialog" max-width="420">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-tag-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Edit Category</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="editCategoryDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4 text-truncate">
                {{ editTarget?.MEMO || editTarget?.NAME || editTarget?.FITID }}
              </div>
              <v-autocomplete
                v-model="editCategoryValue"
                :items="categoriesForTransaction(editTarget)"
                label="Category"
                variant="solo"
                inset
                density="comfortable"
                color="primary"
                hide-details
                autofocus
                clearable
                @keyup.enter="saveCategory" />
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="editCategoryDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="store.loading" @click="saveCategory">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Edit Payee Dialog -->
        <v-dialog v-model="editPayeeDialog" max-width="420">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-account-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Edit Payee</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="editPayeeDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4 text-truncate">
                {{ editPayeeTarget?.MEMO || editPayeeTarget?.FITID }}
              </div>
              <v-text-field
                v-model="editPayeeValue"
                label="Payee"
                variant="solo"
                inset
                density="comfortable"
                color="primary"
                hide-details
                autofocus
                clearable
                @keyup.enter="savePayee" />
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="editPayeeDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="store.loading" @click="savePayee">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Split Transaction Dialog -->
        <v-dialog v-model="splitDialog" max-width="500" persistent>
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-call-split</v-icon>
                  <span class="text-h6 font-weight-bold">Split Transaction</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="splitDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div
                class="d-flex align-center justify-space-between mb-6 pa-4 bg-surface-light rounded-lg"
              >
                <div>
                  <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                    Total Amount
                  </div>
                  <div class="text-body-1 font-weight-bold">{{ formatCurrency(splitTotal) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                    Remaining
                  </div>
                  <div
                    class="text-body-1 font-weight-bold"
                    :class="isSplitValid ? 'text-success' : 'text-error'"
                  >
                    {{ formatCurrency(Math.abs(splitRemaining)) }}
                  </div>
                </div>
              </div>

              <div class="text-body-2 text-medium-emphasis mb-3">
                Split into exactly two categories:
              </div>

              <!-- Split 1 -->
              <div class="d-flex align-start ga-3 mb-3">
                <v-autocomplete
                  v-model="splitState.category1"
                  :items="categoriesForTransaction(splitTarget)"
                  label="Category"
                  variant="solo"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  class="flex-grow-1"
                 color="primary" />
                <v-text-field
                  v-model.number="splitState.amount1"
                  label="Amount"
                  type="number"
                  variant="solo"
                  inset
                  density="compact"
                  hide-details
                  :prefix="userSettings.currencySymbol"
                 color="primary" />
              </div>

              <!-- Split 2 -->
              <div class="d-flex align-start ga-3">
                <v-autocomplete
                  v-model="splitState.category2"
                  :items="categoriesForTransaction(splitTarget)"
                  label="Category"
                  variant="solo"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  class="flex-grow-1"
                 color="primary" />
                <v-text-field
                  v-model.number="splitState.amount2"
                  label="Amount"
                  type="number"
                  variant="solo"
                  inset
                  density="compact"
                  hide-details
                  :prefix="userSettings.currencySymbol"
                 color="primary" />
              </div>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="splitDialog = false">Cancel</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :loading="store.loading"
                :disabled="!isSplitValid"
                @click="saveSplits"
              >
                Save Splits
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Notes Dialog -->
        <v-dialog v-model="notesDialog" max-width="460">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="warning" size="20">mdi-note-text-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Notes</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="notesDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4 text-truncate">
                {{ notesTarget?.MEMO || notesTarget?.NAME || notesTarget?.FITID }}
              </div>
              <v-textarea
                v-model="notesValue"
                label="Add a note…"
                variant="solo"
                inset
                rows="4"
                hide-details
                autofocus
                no-resize
               color="primary" />
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="notesDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="store.loading" @click="saveNotes">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Bulk Category Dialog -->
        <v-dialog v-model="bulkCategoryDialog" max-width="420">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-tag-multiple-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Set Category</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="bulkCategoryDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4">
                Apply to <strong>{{ selectedRows.length }}</strong> selected transaction{{
                  selectedRows.length === 1 ? '' : 's'
                }}.
              </div>
              <v-autocomplete
                v-model="bulkCategoryValue"
                :items="bulkCategoryItems"
                label="Category"
                variant="solo"
                inset
                density="comfortable"
                hide-details
                autofocus
                clearable
               color="primary" />
              <div
                v-if="bulkSelectionKind === 'mixed'"
                class="text-caption text-medium-emphasis mt-2"
              >
                Selection contains both income and expense — showing all categories.
              </div>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="bulkCategoryDialog = false">Cancel</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :loading="store.loading"
                @click="saveBulkCategory"
              >
                Apply
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Bulk Payee Dialog -->
        <v-dialog v-model="bulkPayeeDialog" max-width="420">
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-account-edit-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Set Payee</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="bulkPayeeDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4">
                Apply to <strong>{{ selectedRows.length }}</strong> selected transaction{{
                  selectedRows.length === 1 ? '' : 's'
                }}.
              </div>
              <v-text-field
                v-model="bulkPayeeValue"
                label="Payee"
                variant="solo"
                inset
                density="comfortable"
                color="primary"
                hide-details
                autofocus
                clearable
                @keyup.enter="saveBulkPayee" />
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="bulkPayeeDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="store.loading" @click="saveBulkPayee">
                Apply
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Create Rule from Transaction Dialog -->
        <v-dialog v-model="ruleDialog" max-width="520" persistent>
          <v-card rounded="sm">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="primary" size="20">mdi-tag-multiple-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Create Rule</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="ruleDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="6">
                  <v-select
                    v-model="ruleForm.field"
                    :items="ruleFieldOptions"
                    item-title="label"
                    item-value="value"
                    label="Field"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                   color="primary" />
                </v-col>
                <v-col cols="6">
                  <v-select
                    v-model="ruleForm.operator"
                    :items="ruleOperatorOptions"
                    item-title="label"
                    item-value="value"
                    label="Operator"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                   color="primary" />
                </v-col>
                <v-col cols="12" class="mt-3">
                  <v-text-field
                    v-model="ruleForm.value"
                    label="Match value"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    persistent-hint
                    :hint="ruleOperatorHint"
                   color="primary" />
                </v-col>
                <v-col cols="8" class="mt-3">
                  <v-autocomplete
                    v-model="ruleForm.category"
                    :items="allCategoryItems"
                    label="Assign category"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    clearable
                   color="primary" />
                </v-col>
                <v-col cols="4" class="mt-3">
                  <v-text-field
                    v-model.number="ruleForm.priority"
                    label="Priority"
                    type="number"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                   color="primary" />
                </v-col>
                <v-col cols="12" class="mt-3">
                  <v-select
                    v-model="ruleForm.type"
                    :items="ruleTypeOptions"
                    item-title="label"
                    item-value="value"
                    label="Assign transaction type (optional)"
                    variant="solo"
                    inset
                    density="comfortable"
                    rounded="sm"
                    hide-details
                    clearable
                   color="primary" />
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer />
              <v-btn variant="text" @click="ruleDialog = false">Cancel</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                rounded="sm"
                :loading="rulesStore.loading"
                :disabled="
                  !ruleForm.field || !ruleForm.operator || !ruleForm.value || !ruleForm.category
                "
                @click="saveRule"
              >
                Add Rule
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card rounded="sm">
            <v-card-title class="text-h6 pa-6 pb-4">Delete Transaction</v-card-title>
            <v-card-text class="pa-6 pt-0 text-body-2 text-medium-emphasis">
              Permanently delete
              <strong>{{ deleteTarget?.MEMO || deleteTarget?.NAME || deleteTarget?.FITID }}</strong
              >? This action cannot be undone.
            </v-card-text>
            <v-card-actions class="pa-6 pt-0 ga-2">
              <v-spacer />
              <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
              <v-btn
                color="error"
                variant="flat"
                rounded="sm"
                :loading="store.loading"
                @click="doDelete"
              >
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-tabs-window-item>

      <!-- ── Rules Tab ─────────────────────────────────────────────────────── -->
      <v-tabs-window-item value="rules">
        <RulesView />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const emit = defineEmits(['navigate'])
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserRulesStore } from '../stores/userRules'
import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import RulesView from './Rules.vue'

const store = useUserTransactionsStore()
const accountsStore = useUserAccountsStore()
const categoriesStore = useUserCategoriesStore()
const userSettings = useUserSettingsStore()
const rulesStore = useUserRulesStore()
const { formatCurrency, formatDate } = userSettings

const activeTab = ref('transactions')

const _pf = usePeriodFilter()
const { period, periodLabel, periodMonths, isNextPeriodFuture } = storeToRefs(_pf)
const { prevPeriod, nextPeriod } = _pf

const uncategorizedCount = computed(
  () => store.transactions.filter((t) => !t.category && !t.splitCategory1).length
)

const categoryById = computed(() =>
  Object.fromEntries(categoriesStore.categories.map((c) => [c.id, c.name]))
)

function categoryName(id) {
  return categoryById.value[id] ?? null
}

const allCategoryItems = computed(() =>
  categoriesStore.categories.map((c) => ({ title: c.name, value: c.id }))
)

const incomeCategoryItems = computed(() =>
  categoriesStore.categories
    .filter((c) => c.type === 'income')
    .map((c) => ({ title: c.name, value: c.id }))
)

const nonIncomeCategoryItems = computed(() =>
  categoriesStore.categories
    .filter((c) => c.type !== 'income')
    .map((c) => ({ title: c.name, value: c.id }))
)

function categoriesForTransaction(item) {
  if (!item) return allCategoryItems.value
  return Number(item.TRNAMT) >= 0 ? incomeCategoryItems.value : nonIncomeCategoryItems.value
}

// ── Bulk Recategorization ─────────────────────────────────────────────────────
const selectedRows = ref([])
const bulkCategoryDialog = ref(false)
const bulkCategoryValue = ref('')

const bulkSelectionKind = computed(() => {
  const rows = selectedRows.value
  if (!rows.length) return 'mixed'
  let hasIncome = false
  let hasExpense = false
  for (const r of rows) {
    if (Number(r.TRNAMT) >= 0) hasIncome = true
    else hasExpense = true
    if (hasIncome && hasExpense) return 'mixed'
  }
  return hasIncome ? 'income' : 'expense'
})

const bulkCategoryItems = computed(() => {
  if (bulkSelectionKind.value === 'income') return incomeCategoryItems.value
  if (bulkSelectionKind.value === 'expense') return nonIncomeCategoryItems.value
  return allCategoryItems.value
})

function openBulkCategoryDialog() {
  bulkCategoryValue.value = ''
  bulkCategoryDialog.value = true
}

async function saveBulkCategory() {
  const category = bulkCategoryValue.value || null
  await Promise.all(
    selectedRows.value.map((item) => store.editTransaction(item.FITID, { category }))
  )
  bulkCategoryDialog.value = false
  selectedRows.value = []
}

// ── Bulk Payee ────────────────────────────────────────────────────────────────
const bulkPayeeDialog = ref(false)
const bulkPayeeValue = ref('')

function openBulkPayeeDialog() {
  bulkPayeeValue.value = ''
  bulkPayeeDialog.value = true
}

async function saveBulkPayee() {
  const NAME = bulkPayeeValue.value.trim() || null
  await Promise.all(selectedRows.value.map((item) => store.editTransaction(item.FITID, { NAME })))
  bulkPayeeDialog.value = false
  selectedRows.value = []
}

// ── Import dialog ────────────────────────────────────────────────────────────
const importDialog = ref(false)
const selectedFile = ref(null)
const lastImported = ref('')

async function handleImport() {
  if (!selectedFile.value) return
  const text = await selectedFile.value.text()

  await accountsStore.importAccountFromOfx(text)
  if (accountsStore.error) return

  const result = await store.importTransactionsFromOfx(text)
  if (result) {
    lastImported.value = `${result.inserted} new · ${result.skipped} skipped`
    selectedFile.value = null
    importDialog.value = false
    await Promise.all([accountsStore.fetchAccounts(), store.fetchMonthsWithData()])
    setTimeout(() => {
      lastImported.value = ''
    }, 5000)
  }
}

// ── Month navigation ──────────────────────────────────────────────────────────
function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

const selectedMonth = ref(currentMonthValue())

function offsetMonth(yyyymm, delta) {
  const year = Number(yyyymm.slice(0, 4))
  const month = Number(yyyymm.slice(4)) - 1 + delta
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

const isNextMonthFuture = computed(() => offsetMonth(selectedMonth.value, 1) > currentMonthValue())

function prevMonth() {
  selectedMonth.value = offsetMonth(selectedMonth.value, -1)
}

function nextMonth() {
  selectedMonth.value = offsetMonth(selectedMonth.value, 1)
}

// ── On mount ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    store.fetchMonthsWithData(),
    categoriesStore.fetchCategories()
  ])
  await store.fetchTransactionsByMonth(selectedMonth.value)
})

watch(selectedMonth, (month) => store.fetchTransactionsByMonth(month))

// ── Filters ───────────────────────────────────────────────────────────────────
const search = ref('')
const filterAccount = ref(null)

const accountById = computed(() =>
  Object.fromEntries(accountsStore.accounts.map((a) => [a.ACCTID, a]))
)

function accountName(acctid) {
  const a = accountById.value[acctid]
  if (!a) return acctid
  const name = a.displayName || a.ACCTTYPE || ''
  const last4 = String(acctid).slice(-4)
  return name ? `${name} ••${last4}` : `••${last4}`
}

const accountOptions = computed(() =>
  accountsStore.accounts.map((a) => ({
    label: a.displayName || a.ACCTTYPE || a.ACCTID,
    value: a.ACCTID
  }))
)

const typeOptions = [
  { label: 'Credit', value: 'CREDIT' }, // Generic credit
  { label: 'Debit', value: 'DEBIT' }, // Generic debit
  { label: 'Check', value: 'CHECK' }, // Written check
  { label: 'Deposit', value: 'DEP' }, // Deposit
  { label: 'ATM', value: 'ATM' }, // ATM debit/credit
  { label: 'Purchases', value: 'POS' }, // Point-of-sale
  { label: 'Transfer', value: 'XFER' }, // Account transfer
  { label: 'Payment', value: 'PAYMENT' }, // Electronic payment
  { label: 'Cash', value: 'CASH' }, // Cash withdrawal
  { label: 'Direct Dep', value: 'DIRECTDEP' }, // Direct deposit
  { label: 'Direct Debit', value: 'DIRECTDEBIT' }, // Merchant-initiated debit
  { label: 'Repeat Payment', value: 'REPEATPMT' }, // Standing order / repeat payment
  { label: 'Interest', value: 'INT' }, // Interest earned or charged
  { label: 'Dividend', value: 'DIV' }, // Dividend
  { label: 'Fee', value: 'FEE' }, // Financial institution fee
  { label: 'Service Charge', value: 'SRVCHG' }, // Service charge
  { label: 'Other', value: 'OTHER' } // Catch-all
]

// ── Table headers ─────────────────────────────────────────────────────────────
const headers = [
  { title: 'Date', key: 'DTPOSTED', width: '120px', sortable: true },
  { title: 'Payee', key: 'NAME', sortable: false },
  { title: 'Account', key: 'ACCTID', width: '160px', sortable: true },
  { title: 'Category', key: 'category', width: '180px', sortable: false },
  { title: 'Amount', key: 'TRNAMT', width: '130px', sortable: true, align: 'end' }
]

// ── Filtered data ─────────────────────────────────────────────────────────────
const filterKind = ref('all')
const filterKinds = [
  { label: 'All', value: 'all' },
  { label: 'Uncategorized', value: 'uncategorized' },
  { label: 'Income', value: 'income' },
  { label: 'Expenses', value: 'expenses' }
]

const filteredTransactions = computed(() => {
  let rows = store.transactions

  const q = (search.value || '').trim().toLowerCase()
  if (q) {
    rows = rows.filter((t) => `${t.MEMO || ''} ${t.NAME || ''}`.toLowerCase().includes(q))
  }

  if (filterAccount.value) {
    rows = rows.filter((t) => t.ACCTID === filterAccount.value)
  }

  if (filterKind.value === 'uncategorized') {
    rows = rows.filter((t) => !t.category && !t.splitCategory1)
  } else if (filterKind.value === 'income') {
    rows = rows.filter((t) => Number(t.TRNAMT) >= 0)
  } else if (filterKind.value === 'expenses') {
    rows = rows.filter((t) => Number(t.TRNAMT) < 0)
  }

  return rows
})

// ── Formatters ────────────────────────────────────────────────────────────────

function typeColor(type) {
  return (
    {
      CREDIT: 'success',
      DEBIT: 'error',
      CHECK: 'warning',
      DEP: 'success',
      POS: 'error',
      ATM: 'warning'
    }[String(type || '').toUpperCase()] || 'secondary'
  )
}

// ── Edit Category ─────────────────────────────────────────────────────────────
const editCategoryDialog = ref(false)
const editTarget = ref(null)
const editCategoryValue = ref('')

function openEditCategory(item) {
  editTarget.value = item
  editCategoryValue.value = item.category || ''
  editCategoryDialog.value = true
}

async function saveCategory() {
  if (!editTarget.value) return
  await store.editTransaction(editTarget.value.FITID, {
    category: editCategoryValue.value || null
  })
  editCategoryDialog.value = false
  editTarget.value = null
}

// ── Edit Payee ────────────────────────────────────────────────────────────────
const editPayeeDialog = ref(false)
const editPayeeTarget = ref(null)
const editPayeeValue = ref('')

function openEditPayee(item) {
  editPayeeTarget.value = item
  editPayeeValue.value = item.NAME || ''
  editPayeeDialog.value = true
}

async function savePayee() {
  if (!editPayeeTarget.value) return
  await store.editTransaction(editPayeeTarget.value.FITID, {
    NAME: editPayeeValue.value.trim() || null
  })
  editPayeeDialog.value = false
  editPayeeTarget.value = null
}

// ── Delete ────────────────────────────────────────────────────────────────────
const deleteDialog = ref(false)
const deleteTarget = ref(null)

function confirmDelete(item) {
  deleteTarget.value = item
  deleteDialog.value = true
}

async function doDelete() {
  if (!deleteTarget.value) return
  await store.removeTransaction(deleteTarget.value.FITID)
  deleteDialog.value = false
  deleteTarget.value = null
}

// ── Notes ─────────────────────────────────────────────────────────────────────
const notesDialog = ref(false)
const notesTarget = ref(null)
const notesValue = ref('')

function openNotesDialog(item) {
  notesTarget.value = item
  notesValue.value = item.notes || ''
  notesDialog.value = true
}

async function saveNotes() {
  if (!notesTarget.value) return
  await store.editTransaction(notesTarget.value.FITID, {
    notes: notesValue.value.trim() || null
  })
  notesDialog.value = false
  notesTarget.value = null
}

// ── Split Transactions ────────────────────────────────────────────────────────
const splitDialog = ref(false)
const splitTarget = ref(null)
const expandedRows = ref([])
const splitState = ref({
  category1: '',
  amount1: 0,
  category2: '',
  amount2: 0
})

function openSplitDialog(item) {
  splitTarget.value = item
  splitState.value = {
    category1: item.splitCategory1 || '',
    amount1: item.splitAmount1
      ? Math.abs(Number(item.splitAmount1))
      : Math.abs(Number(item.TRNAMT)),
    category2: item.splitCategory2 || '',
    amount2: item.splitAmount2 ? Math.abs(Number(item.splitAmount2)) : 0
  }
  splitDialog.value = true
}

const splitTotal = computed(() => {
  if (!splitTarget.value) return 0
  return Math.abs(Number(splitTarget.value.TRNAMT))
})

const splitSum = computed(() => {
  return (Number(splitState.value.amount1) || 0) + (Number(splitState.value.amount2) || 0)
})

const splitRemaining = computed(() => {
  return splitTotal.value - splitSum.value
})

const isSplitValid = computed(() => {
  return Math.abs(splitRemaining.value) < 0.001
})

async function saveSplits() {
  if (!splitTarget.value || !isSplitValid.value) return

  const sign = Math.sign(Number(splitTarget.value.TRNAMT)) || 1

  await store.editTransaction(splitTarget.value.FITID, {
    splitCategory1: splitState.value.category1 || null,
    splitAmount1: splitState.value.amount1 ? Number(splitState.value.amount1) * sign : null,
    splitCategory2: splitState.value.category2 || null,
    splitAmount2: splitState.value.amount2 ? Number(splitState.value.amount2) * sign : null
  })

  splitDialog.value = false
  splitTarget.value = null
}

// ── Create Rule from Transaction ───────────────────────────────────────────────
const ruleDialog = ref(false)
const ruleForm = ref({
  field: 'NAME',
  operator: 'contains',
  value: '',
  category: '',
  type: null,
  priority: 0
})

const ruleFieldOptions = [
  { label: 'Name (payee)', value: 'NAME' },
  { label: 'Memo', value: 'MEMO' },
  { label: 'Amount', value: 'TRNAMT' },
  { label: 'Tran. type', value: 'TRNTYPE' }
]

const ruleOperatorOptions = [
  { label: 'contains', value: 'contains' },
  { label: 'equals', value: 'equals' },
  { label: 'starts with', value: 'startsWith' },
  { label: 'wildcard (*)', value: 'wildcard' },
  { label: 'whole words', value: 'wholeWord' },
  { label: '> (greater than)', value: 'gt' },
  { label: '< (less than)', value: 'lt' }
]

const ruleTypeOptions = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Bills', value: 'bills' },
  { label: 'Variable', value: 'variable' },
  { label: 'Savings', value: 'savings' }
]

const ruleOperatorHint = computed(
  () =>
    ({
      contains:
        'Use wildcard (*) or quoted phrases — e.g. wal* matches "Walmart", "gas station" matches exactly',
      equals: 'Must match the full field exactly',
      startsWith: 'e.g. "wal" matches fields that begin with "wal"',
      wildcard: 'Use * for any characters — e.g. WAL*MART*',
      wholeWord: 'e.g. "gas" matches "gas station" but not "gasoline"',
      gt: 'Numeric — e.g. 50 matches amounts greater than 50',
      lt: 'Numeric — e.g. 50 matches amounts less than 50'
    })[ruleForm.value.operator] ?? ''
)

function openCreateRuleFromTransaction(item) {
  ruleForm.value = {
    field: 'MEMO',
    operator: 'contains',
    value: item.MEMO || '',
    category: item.category || '',
    type: null,
    priority: 0
  }
  ruleDialog.value = true
}

async function saveRule() {
  await rulesStore.createRule({
    field: ruleForm.value.field,
    operator: ruleForm.value.operator,
    value: ruleForm.value.value,
    category: ruleForm.value.category,
    type: ruleForm.value.type || null,
    priority: ruleForm.value.priority ?? 0
  })
  if (!rulesStore.error) ruleDialog.value = false
}
</script>

<style scoped>
:deep(.v-field--variant-solo),
:deep(.v-field--variant-solo-filled),
:deep(.v-field--variant-solo-inverted) {
  box-shadow: none;
}
</style>
