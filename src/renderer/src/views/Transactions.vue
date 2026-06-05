<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <v-row align="start" justify="space-between" class="mb-6 mx-0 ga-4">
      <v-col cols="auto" class="pa-0">
        <div class="text-h5 font-weight-bold">Transactions</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ periodLabel }} · {{ uncategorizedCount }} need a category
        </div>
      </v-col>
      <v-col cols="auto" class="pa-0 d-flex align-center ga-3 flex-wrap">
        <FilterComponent />
        <v-btn
          variant="flat"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-export"
          @click="emit('navigate', 'Backup')"
          >Export</v-btn
        >
        <v-btn
          variant="flat"
          color="primary"
          rounded="lg"
          prepend-icon="mdi-upload"
          @click="emit('navigate', 'Import')"
          >Import</v-btn
        >
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="transactions" prepend-icon="mdi-format-list-bulleted">Transactions</v-tab>
      <v-tab value="category-rules" prepend-icon="mdi-tag-multiple-outline">Category Rules</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- ── Transactions Tab ──────────────────────────────────────────────── -->
      <v-tabs-window-item value="transactions">
        <!-- Import Transactions Dialog -->
        <v-dialog v-model="importDialog" max-width="500">
          <v-card rounded="lg">
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
                variant="solo-filled"
                density="comfortable"
                rounded="lg"
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
        <v-card rounded="lg" border class="d-flex align-center ga-3 px-4 py-3 mb-4">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search payee or note"
            variant="solo-filled"
            density="compact"
            hide-details
            color="primary"
          />

          <div class="d-flex ga-2">
            <v-btn
              v-for="k in filterKinds"
              :key="k.value"
              :variant="filterKind === k.value ? 'flat' : 'flat'"
              :color="filterKind === k.value ? 'primary' : undefined"
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
            placeholder="Account"
            variant="solo-filled"
            density="compact"
            hide-details
            rounded="lg"
            max-width="200"
            color="primary"
          />
        </v-card>

        <!-- Bulk Action Bar -->
        <v-slide-y-transition>
          <div v-if="selectedRows.length > 0" class="mb-3">
            <v-sheet rounded color="primary" class="pa-3 d-flex align-center ga-3">
              <v-btn-group variant="flat" color="surface" size="small" divided>
                <v-btn class="font-weight-bold pe-none">{{ selectedRows.length }} selected</v-btn>
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
          rounded="lg"
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
        <v-card v-else rounded="lg" elevation="0" border>
          <v-data-table
            v-model="selectedRows"
            v-model:expanded="expanded"
            show-select
            show-expand
            return-object
            item-value="FITID"
            :headers="headers"
            :items="filteredTransactions"
            :loading="store.loading"
            density="comfortable"
            :items-per-page="25"
            :items-per-page-options="[10, 25, 50, 100]"
            hover
            @click:row="toggleRow"
          >
            <template #item.DTPOSTED="{ item }">
              <span class="text-body-2">{{ formatDate(item.DTPOSTED) }}</span>
            </template>

            <template #item.NAME="{ item }">
              <span class="text-body-2 font-weight-medium">{{ item.NAME }}</span>
            </template>

            <template #item.ACCTID="{ item }">
              <span class="text-body-2 text-medium-emphasis">{{
                item.accountName || accountName(item.ACCTID)
              }}</span>
            </template>

            <template #item.category="{ item }">
              <v-chip
                v-if="item.splitCategory2"
                color="info"
                variant="flat"
                size="x-small"
                rounded="pill"
                @click="openSplitDialog(item)"
                >Split</v-chip
              >
              <v-chip
                v-else-if="item.category"
                variant="flat"
                size="x-small"
                rounded="pill"
                @click="openEditCategory(item)"
                >{{ categoryName(item.category) }}</v-chip
              >
              <v-btn
                v-else
                color="primary"
                variant="flat"
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

            <template #item.actions="{ item }">
              <div class="d-flex align-center justify-end">
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-dots-vertical"
                      variant="text"
                      density="comfortable"
                      size="small"
                      @click.stop
                    />
                  </template>
                  <v-list density="compact" rounded="lg">
                    <v-list-item
                      prepend-icon="mdi-account-edit-outline"
                      title="Edit payee"
                      @click="openEditPayee(item)"
                    />
                    <v-list-item
                      prepend-icon="mdi-note-edit-outline"
                      title="Edit notes"
                      @click="openNotesDialog(item)"
                    />
                  </v-list>
                </v-menu>
                <v-btn
                  icon="mdi-tag-outline"
                  variant="text"
                  color="secondary"
                  density="comfortable"
                  size="small"
                  class="ml-1"
                  @click.stop="openTagsDialog(item)"
                />
                <v-btn
                  icon="mdi-call-split"
                  variant="text"
                  color="info"
                  density="comfortable"
                  size="small"
                  class="ml-1"
                  @click.stop="openSplitDialog(item)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  color="error"
                  density="comfortable"
                  size="small"
                  class="ml-1"
                  @click.stop="confirmDelete(item)"
                />
              </div>
            </template>

            <template #loading>
              <v-skeleton-loader type="table-row@8" />
            </template>

            <template #expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="text-center pa-4 bg-surface-light">
                  <div class="d-flex flex-column align-center justify-center ga-3">
                    <div class="text-medium-emphasis" style="font-family: monospace">
                      {{ item?.raw?.MEMO || item?.MEMO || 'No bank memo' }}
                    </div>

                    <div v-if="item.notes" class="text-body-2 text-warning d-flex align-start">
                      <v-icon size="small" class="mr-1">mdi-note-text-outline</v-icon>
                      <span style="white-space: pre-wrap; text-align: left">{{ item.notes }}</span>
                    </div>

                    <div
                      v-if="item.tags && parseTags(item.tags).length"
                      class="d-flex ga-2 flex-wrap justify-center"
                    >
                      <v-chip
                        v-for="tag in parseTags(item.tags)"
                        :key="tag"
                        size="small"
                        variant="tonal"
                        color="secondary"
                      >
                        <v-icon start size="small">mdi-tag-outline</v-icon>
                        {{ tag }}
                      </v-chip>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
          <div class="px-4 py-2 text-caption text-medium-emphasis text-center">
            {{ filteredTransactions.length }} transaction{{
              filteredTransactions.length === 1 ? '' : 's'
            }}
            · select rows to bulk-categorize
          </div>
        </v-card>

        <!-- Edit Category Dialog -->
        <v-dialog v-model="editCategoryDialog" max-width="420">
          <v-card rounded="lg">
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
                variant="solo-filled"
                inset
                density="comfortable"
                color="primary"
                hide-details
                clearable
                @keyup.enter="saveCategory"
              />
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
          <v-card rounded="lg">
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
                variant="solo-filled"
                inset
                density="comfortable"
                color="primary"
                hide-details
                autofocus
                clearable
                @keyup.enter="savePayee"
              />
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
          <v-card rounded="lg">
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
                <v-select
                  v-model="splitState.type1"
                  :items="budgetsStore.types"
                  label="Type"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  color="primary"
                  style="max-width: 140px"
                  @update:model-value="splitState.category1 = ''"
                />
                <v-combobox
                  v-model="splitState.category1"
                  :items="
                    categoriesStore.categories
                      .filter((c) => c.type === splitState.type1)
                      .map((c) => c.name)
                  "
                  label="Category"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  class="flex-grow-1"
                  color="primary"
                />
                <v-text-field
                  v-model.number="splitState.amount1"
                  label="Amount"
                  type="number"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  :prefix="userSettings.currencySymbol"
                  color="primary"
                  style="max-width: 120px"
                />
              </div>

              <!-- Split 2 -->
              <div class="d-flex align-start ga-3">
                <v-select
                  v-model="splitState.type2"
                  :items="budgetsStore.types"
                  label="Type"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  color="primary"
                  style="max-width: 140px"
                  @update:model-value="splitState.category2 = ''"
                />
                <v-combobox
                  v-model="splitState.category2"
                  :items="
                    categoriesStore.categories
                      .filter((c) => c.type === splitState.type2)
                      .map((c) => c.name)
                  "
                  label="Category"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  clearable
                  class="flex-grow-1"
                  color="primary"
                />
                <v-text-field
                  v-model.number="splitState.amount2"
                  label="Amount"
                  type="number"
                  variant="solo-filled"
                  inset
                  density="compact"
                  hide-details
                  :prefix="userSettings.currencySymbol"
                  color="primary"
                  style="max-width: 120px"
                />
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
          <v-card rounded="lg">
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
                variant="solo-filled"
                inset
                rows="4"
                hide-details
                no-resize
                color="primary"
              />
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

        <!-- Tags Dialog -->
        <v-dialog v-model="tagsDialog" max-width="460">
          <v-card rounded="lg">
            <v-card-title class="pa-6 pb-4">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center ga-3">
                  <v-icon color="secondary" size="20">mdi-tag-outline</v-icon>
                  <span class="text-h6 font-weight-bold">Tags</span>
                </div>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  density="compact"
                  @click="tagsDialog = false"
                />
              </div>
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-6">
              <div class="text-body-2 text-medium-emphasis mb-4 text-truncate">
                {{ tagsTarget?.MEMO || tagsTarget?.NAME || tagsTarget?.FITID }}
              </div>

              <!-- Selected Tags -->
              <div class="d-flex flex-wrap ga-2 mb-4" style="min-height: 32px">
                <div v-if="tagsValue.length === 0" class="text-caption text-disabled mt-1">
                  No tags added yet
                </div>
                <v-chip
                  v-for="tag in tagsValue"
                  :key="tag"
                  closable
                  color="primary"
                  variant="flat"
                  size="small"
                  @click:close="removeTag(tag)"
                >
                  {{ tag }}
                </v-chip>
              </div>

              <!-- Input -->
              <v-text-field
                v-model="newTagInput"
                label="Add a tag..."
                placeholder="Type and press Enter"
                variant="solo-filled"
                density="comfortable"
                rounded="lg"
                hide-details
                color="primary"
                autofocus
                @keydown.enter.prevent="addTag"
              >
                <template #append-inner>
                  <v-btn
                    icon="mdi-plus"
                    variant="text"
                    density="compact"
                    color="primary"
                    :disabled="!newTagInput.trim()"
                    @click="addTag"
                  />
                </template>
              </v-text-field>

              <!-- Suggestions -->
              <div v-if="suggestedTags.length > 0" class="mt-6">
                <div
                  class="text-caption text-medium-emphasis mb-2 text-uppercase font-weight-bold"
                  style="font-size: 0.7rem !important; letter-spacing: 0.05em"
                >
                  Existing Tags
                </div>
                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="tag in suggestedTags"
                    :key="tag"
                    variant="tonal"
                    size="small"
                    color="secondary"
                    class="cursor-pointer"
                    @click="addSuggestedTag(tag)"
                  >
                    <v-icon start size="small">mdi-plus</v-icon>
                    {{ tag }}
                  </v-chip>
                </div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0 ga-2">
              <v-spacer />
              <v-btn variant="text" @click="tagsDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" :loading="store.loading" @click="saveTags">
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Bulk Category Dialog -->
        <v-dialog v-model="bulkCategoryDialog" max-width="420">
          <v-card rounded="lg">
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
                variant="solo-filled"
                inset
                density="comfortable"
                hide-details
                clearable
                color="primary"
              />
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
          <v-card rounded="lg">
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
                variant="solo-filled"
                inset
                density="comfortable"
                color="primary"
                hide-details
                autofocus
                clearable
                @keyup.enter="saveBulkPayee"
              />
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

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="deleteDialog" max-width="400">
          <v-card rounded="lg">
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
                rounded="lg"
                :loading="store.loading"
                @click="doDelete"
              >
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-tabs-window-item>

      <!-- ── Category Rules Tab ───────────────────────────────────────────── -->
      <v-tabs-window-item value="category-rules">
        <RulesView />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const emit = defineEmits(['navigate'])
import FilterComponent from '../components/filterComponent.vue'
import { useUserTransactionsStore } from '../stores/userTransactions'
import { useUserAccountsStore } from '../stores/userAccounts'
import { useUserCategoriesStore } from '../stores/userCategories'
import { useUserBudgetsStore } from '../stores/userBudgets'
import { useUserSettingsStore } from '../stores/userSettings'

import { storeToRefs } from 'pinia'
import { usePeriodFilter } from '../stores/usePeriodFilter'
import RulesView from '@components/Rules.vue'
const store = useUserTransactionsStore()
const accountsStore = useUserAccountsStore()
const categoriesStore = useUserCategoriesStore()
const budgetsStore = useUserBudgetsStore()
const userSettings = useUserSettingsStore()

const { formatCurrency, formatDate } = userSettings

const activeTab = ref('transactions')

const _pf = usePeriodFilter()
const { periodLabel, periodMonths } = storeToRefs(_pf)

const uncategorizedCount = computed(() => store.transactions.filter((t) => !t.category).length)

const categoryById = computed(() =>
  Object.fromEntries(categoriesStore.categories.map((c) => [c.id, c.name]))
)

function categoryName(id) {
  return categoryById.value[id] ?? (id || null)
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

// ── On mount ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    accountsStore.fetchAccounts(),
    store.fetchMonthsWithData(),
    categoriesStore.fetchCategories()
  ])
  await store.fetchTransactionsForPeriod(periodMonths.value)
})

watch(periodMonths, (months) => store.fetchTransactionsForPeriod(months))

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

// ── Table headers ─────────────────────────────────────────────────────────────
const headers = [
  { title: 'Date', key: 'DTPOSTED', width: '120px', sortable: true },
  { title: 'Payee', key: 'NAME', sortable: false },
  { title: 'Account', key: 'ACCTID', width: '200px', sortable: true },
  { title: 'Category', key: 'category', width: '180px', sortable: false },
  { title: 'Amount', key: 'TRNAMT', width: '130px', sortable: true, align: 'end' },
  { title: '', key: 'actions', width: '96px', sortable: false, align: 'end' }
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
    rows = rows.filter((t) =>
      `${t.MEMO || ''} ${t.NAME || ''} ${t.notes || ''} ${parseTags(t.tags).join(' ')}`
        .toLowerCase()
        .includes(q)
    )
  }

  if (filterAccount.value) {
    rows = rows.filter((t) => t.ACCTID === filterAccount.value)
  }

  if (filterKind.value === 'uncategorized') {
    rows = rows.filter((t) => !t.category)
  } else if (filterKind.value === 'income') {
    rows = rows.filter((t) => Number(t.TRNAMT) >= 0)
  } else if (filterKind.value === 'expenses') {
    rows = rows.filter((t) => Number(t.TRNAMT) < 0)
  }

  return rows
})

// ── Formatters ────────────────────────────────────────────────────────────────

// ── Row Expansion ─────────────────────────────────────────────────────────────
const expanded = ref([])

function toggleRow(event, row) {
  if (row && typeof row.toggleExpand === 'function') {
    row.toggleExpand(row.internalItem || row.item)
  }
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

// ── Tags ──────────────────────────────────────────────────────────────────────
const tagsDialog = ref(false)
const tagsTarget = ref(null)
const tagsValue = ref([])
const newTagInput = ref('')

const allExistingTags = computed(() => {
  const tagsSet = new Set()
  store.transactions.forEach((t) => {
    const parsed = parseTags(t.tags)
    parsed.forEach((tag) => tagsSet.add(tag))
  })
  return Array.from(tagsSet).sort()
})

const suggestedTags = computed(() => {
  return allExistingTags.value.filter((tag) => !tagsValue.value.includes(tag))
})

function parseTags(tagString) {
  if (!tagString) return []
  try {
    return JSON.parse(tagString)
  } catch {
    return []
  }
}

function addTag() {
  const val = newTagInput.value.trim()
  if (val && !tagsValue.value.includes(val)) {
    tagsValue.value.push(val)
  }
  newTagInput.value = ''
}

function addSuggestedTag(tag) {
  if (!tagsValue.value.includes(tag)) {
    tagsValue.value.push(tag)
  }
}

function removeTag(tag) {
  tagsValue.value = tagsValue.value.filter((t) => t !== tag)
}

function openTagsDialog(item) {
  tagsTarget.value = item
  tagsValue.value = parseTags(item.tags)
  newTagInput.value = ''
  tagsDialog.value = true
}

async function saveTags() {
  if (!tagsTarget.value) return
  const serialized = JSON.stringify(tagsValue.value.map((t) => String(t).trim()).filter(Boolean))
  await store.editTransaction(tagsTarget.value.FITID, {
    tags: tagsValue.value.length ? serialized : null
  })
  tagsDialog.value = false
  tagsTarget.value = null
}

// ── Split Transactions ────────────────────────────────────────────────────────
const splitDialog = ref(false)
const splitTarget = ref(null)
const splitState = ref({
  type1: null,
  category1: '',
  amount1: 0,
  type2: null,
  category2: '',
  amount2: 0
})

function openSplitDialog(item) {
  splitTarget.value = item
  const findType = (name) => categoriesStore.categories.find((c) => c.name === name)?.type ?? null
  splitState.value = {
    type1: item.category ? findType(item.category) : null,
    category1: item.category || '',
    amount1: item.splitAmount1 ? Math.abs(Number(item.splitAmount1)) : 0,
    type2: item.splitCategory2 ? findType(item.splitCategory2) : null,
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
  return (
    Math.abs(splitRemaining.value) < 0.001 &&
    !!splitState.value.category1 &&
    !!splitState.value.category2
  )
})

async function saveSplits() {
  if (!splitTarget.value || !isSplitValid.value) return

  const sign = Math.sign(Number(splitTarget.value.TRNAMT)) || 1

  await store.editTransaction(splitTarget.value.FITID, {
    category: splitState.value.category1 || null,
    splitAmount1: Number(splitState.value.amount1) * sign,
    splitCategory2: splitState.value.category2 || null,
    splitAmount2: Number(splitState.value.amount2) * sign
  })

  splitDialog.value = false
  splitTarget.value = null
}
</script>

<style scoped>
:deep(.v-field--variant-solo),
:deep(.v-field--variant-solo-filled),
:deep(.v-field--variant-solo-inverted) {
  box-shadow: none;
}
</style>
