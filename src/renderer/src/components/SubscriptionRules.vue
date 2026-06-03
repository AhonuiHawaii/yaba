<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-5">
      <div>
        <div class="text-body-1 font-weight-bold">Subscription detection rules</div>
        <div class="text-caption text-medium-emphasis">
          Payees matching these are tracked as subscriptions
        </div>
      </div>
      <v-spacer />
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        rounded="sm"
        prepend-icon="mdi-import"
        class="mr-2"
        @click="openImport"
      >
        Import from rules
      </v-btn>
      <v-btn
        size="small"
        variant="flat"
        color="primary"
        rounded="sm"
        prepend-icon="mdi-plus"
        @click="openAdd"
      >
        Add rule
      </v-btn>
    </div>

    <!-- Table Card -->
    <v-card rounded="sm" elevation="1">
      <div v-if="!rules.length" class="d-flex flex-column align-center pa-12 text-medium-emphasis">
        <v-icon size="48" class="mb-3" style="opacity: 0.3" icon="mdi-tune-variant" />
        <div class="text-body-2">No rules yet.</div>
        <div class="text-caption mt-1">Rules force-track subscriptions by payee keyword.</div>
      </div>

      <template v-else>
        <div
          class="rule-row rule-row--header text-caption text-uppercase font-weight-bold text-medium-emphasis mb-1"
        >
          <span>When payee contains</span>
          <span>Cycle</span>
          <span>Expected</span>
          <span>Source</span>
          <span></span>
        </div>
        <v-divider class="mb-1" />

        <template v-for="(rule, i) in rules" :key="rule.id">
          <div class="rule-row py-3">
            <div>
              <v-chip
                size="small"
                variant="tonal"
                rounded="sm"
                class="font-weight-bold text-uppercase"
              >
                {{ rule.name }}
              </v-chip>
            </div>
            <div>
              <span class="text-body-2 text-medium-emphasis">Monthly</span>
            </div>
            <div>
              <span class="text-body-2 text-medium-emphasis">
                {{ matchedSub(rule) ? formatCurrency(matchedSub(rule).typicalAmount) : '—' }}
              </span>
            </div>
            <div>
              <v-chip size="x-small" variant="flat" color="primary" rounded="sm">Manual</v-chip>
            </div>
            <div class="text-right">
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                density="compact"
                color="error"
                @click="confirmDelete(rule)"
              />
            </div>
          </div>
          <v-divider v-if="i < rules.length - 1" />
        </template>
      </template>
    </v-card>

    <!-- Add rule dialog -->
    <v-dialog v-model="addDialog" max-width="420">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold"
          >Add detection rule</v-card-title
        >
        <v-divider />
        <v-card-text class="pa-5">
          <v-text-field
            v-model="form.name"
            label="Payee keyword"
            variant="outlined"
            density="compact"
            rounded="sm"
            autofocus
            class="mb-4"
            hint="Transactions containing this will be tracked as subscriptions"
            persistent-hint
            color="primary"
          />
          <v-select
            v-model="form.operator"
            :items="operatorOptions"
            label="Match type"
            variant="outlined"
            density="compact"
            rounded="sm"
            color="primary"
          />
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" :disabled="saving" @click="addDialog = false"
            >Cancel</v-btn
          >
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :disabled="!form.name.trim()"
            :loading="saving"
            @click="saveRule"
            >Add</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import from category rules dialog -->
    <v-dialog v-model="importDialog" max-width="560" :persistent="importing">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">
          Import from category rules
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-select
            v-model="importFilterCategory"
            :items="categoryOptions"
            label="Filter by category"
            variant="outlined"
            density="compact"
            rounded="sm"
            clearable
            hide-details
            color="primary"
            class="mb-4"
          />

          <div v-if="importableRules.length === 0" class="text-body-2 text-medium-emphasis">
            No compatible rules found{{ importFilterCategory ? ' for that category' : '' }}.
          </div>
          <template v-else>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis"
                >Select rules to import as subscription detection rules.</span
              >
              <v-btn size="x-small" variant="text" color="primary" @click="toggleSelectAll">
                {{
                  importSelection.length === selectableRules.length ? 'Deselect all' : 'Select all'
                }}
              </v-btn>
            </div>
            <v-list density="compact" class="py-0">
              <v-list-item
                v-for="r in importableRules"
                :key="r.id"
                :disabled="isAlreadyImported(r)"
                @click="toggleImportSelection(r.id)"
              >
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="importSelection.includes(r.id)"
                    :disabled="isAlreadyImported(r)"
                    color="primary"
                  />
                </template>
                <v-list-item-title class="text-body-2">
                  <span class="font-weight-medium">{{ r.value }}</span>
                  <span class="text-medium-emphasis ml-2">({{ r.operator }})</span>
                </v-list-item-title>
                <v-list-item-subtitle v-if="isAlreadyImported(r)" class="text-caption">
                  Already imported
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </template>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" :disabled="importing" @click="importDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :disabled="importSelection.length === 0"
            :loading="importing"
            @click="executeImport"
          >
            Import {{ importSelection.length || '' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="360">
      <v-card rounded="sm">
        <v-card-text class="pa-5">
          <div class="text-body-1 font-weight-bold mb-2">Remove rule?</div>
          <div class="text-body-2 text-medium-emphasis">
            Transactions matching <strong>{{ pendingDelete?.name }}</strong> will no longer be
            force-tracked as subscriptions.
          </div>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            rounded="sm"
            :loading="deleting"
            @click="executeDelete"
            >Remove</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useUserSettingsStore } from '../stores/userSettings'
import { useUserRulesStore } from '../stores/userRules'
import { useUserCategoriesStore } from '../stores/userCategories'

const props = defineProps({
  rules: { type: Array, default: () => [] },
  subscriptions: { type: Array, default: () => [] }
})
const emit = defineEmits(['updated'])

const { formatCurrency } = useUserSettingsStore()
const rulesStore = useUserRulesStore()
const categoriesStore = useUserCategoriesStore()

const addDialog = ref(false)
const deleteDialog = ref(false)
const importDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const importing = ref(false)
const pendingDelete = ref(null)
const form = ref({ name: '', operator: 'contains' })
const importSelection = ref([])
const importFilterCategory = ref(null)

// Only these operators have a direct equivalent in subscription rules
const COMPATIBLE_OPERATORS = new Set(['contains', 'startsWith', 'equals', 'wholeWord'])

const categoryOptions = computed(() =>
  categoriesStore.categories.map((c) => ({ title: c.name, value: c.id }))
)

const importableRules = computed(() => {
  const all = (rulesStore.rules || []).filter(
    (r) => COMPATIBLE_OPERATORS.has(r.operator) && r.value
  )
  if (!importFilterCategory.value) return all
  // Match by UUID (new rules) or by plain category name (legacy rules)
  const selectedCat = categoriesStore.categories.find((c) => c.id === importFilterCategory.value)
  return all.filter(
    (r) =>
      r.category === importFilterCategory.value || (selectedCat && r.category === selectedCat.name)
  )
})

function isAlreadyImported(rule) {
  const key = `${(rule.value || '').toLowerCase()}|${rule.operator}`
  return props.rules.some(
    (existing) => `${(existing.name || '').toLowerCase()}|${existing.operator}` === key
  )
}

const selectableRules = computed(() => importableRules.value.filter((r) => !isAlreadyImported(r)))

function toggleImportSelection(id) {
  const i = importSelection.value.indexOf(id)
  if (i === -1) importSelection.value.push(id)
  else importSelection.value.splice(i, 1)
}

function toggleSelectAll() {
  if (importSelection.value.length === selectableRules.value.length) {
    importSelection.value = []
  } else {
    importSelection.value = selectableRules.value.map((r) => r.id)
  }
}

async function openImport() {
  importFilterCategory.value = null
  await rulesStore.fetchRules()
  importSelection.value = selectableRules.value.map((r) => r.id)
  importDialog.value = true
}

async function executeImport() {
  if (importSelection.value.length === 0) return
  importing.value = true
  try {
    const selected = importableRules.value.filter((r) => importSelection.value.includes(r.id))
    for (const r of selected) {
      if (isAlreadyImported(r)) continue
      await window.electron.ipcRenderer.invoke('customRecurring:create', {
        name: r.value,
        operator: r.operator
      })
    }
    importDialog.value = false
    emit('updated')
  } finally {
    importing.value = false
  }
}

const operatorOptions = [
  { title: 'Contains', value: 'contains' },
  { title: 'Starts with', value: 'startsWith' },
  { title: 'Equals', value: 'equals' },
  { title: 'Whole word', value: 'wholeWord' }
]

function matchesRule(name, rule) {
  const haystack = (name || '').toLowerCase()
  const needle = (rule.name || '').toLowerCase()
  switch (rule.operator) {
    case 'equals':
      return haystack === needle
    case 'startsWith':
      return haystack.startsWith(needle)
    case 'wholeWord':
      return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack)
    default:
      return haystack.includes(needle)
  }
}

function matchedSub(rule) {
  return props.subscriptions.find((s) => matchesRule(s.name, rule)) || null
}

function openAdd() {
  form.value = { name: '', operator: 'contains' }
  addDialog.value = true
}

async function saveRule() {
  if (!form.value.name.trim()) return
  saving.value = true
  await window.electron.ipcRenderer.invoke('customRecurring:create', {
    name: form.value.name.trim(),
    operator: form.value.operator
  })
  saving.value = false
  addDialog.value = false
  emit('updated')
}

function confirmDelete(rule) {
  pendingDelete.value = rule
  deleteDialog.value = true
}

async function executeDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  await window.electron.ipcRenderer.invoke('customRecurring:delete', pendingDelete.value.id)
  deleting.value = false
  deleteDialog.value = false
  pendingDelete.value = null
  emit('updated')
}
</script>

<style scoped>
.rule-row {
  display: grid;
  grid-template-columns: 1fr 90px 110px 100px 48px;
  align-items: center;
  column-gap: 12px;
  padding-left: 4px;
  padding-right: 4px;
}

.rule-row--header {
  padding-top: 4px;
  padding-bottom: 4px;
}
</style>
