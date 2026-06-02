<template>
  <v-container class="pa-6" style="max-width: 1100px">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Payee Rules</div>
        <div class="text-body-2 text-medium-emphasis">Group spending &amp; set auto-rules</div>
      </div>
      <v-btn variant="flat" color="primary" rounded="lg" prepend-icon="mdi-plus" @click="openAdd">New category</v-btn>
    </div>

    <!-- Empty State -->
    <v-card v-if="store.groups.length === 0" rounded="lg" elevation="0" border>
      <v-card-text class="pa-12 text-center">
        <v-icon size="60" class="mb-4 text-disabled">mdi-tag-multiple-outline</v-icon>
        <div class="text-h6 font-weight-medium mb-2">No payee rules yet</div>
        <div class="text-body-2 text-medium-emphasis">Add a category with keywords to auto-categorize transactions on import.</div>
      </v-card-text>
    </v-card>

    <!-- Table -->
    <v-card v-else rounded="lg" elevation="0" border class="mb-4">
      <v-data-table
        :headers="headers"
        :items="store.groups"
        density="comfortable"
        :items-per-page="-1"
        hide-default-footer
        hover
      >
        <template #item.label="{ item }">
          <span class="text-body-2 font-weight-medium">{{ item.label }}</span>
        </template>

        <template #item.type="{ item }">
          <v-chip size="x-small" variant="tonal" rounded="pill">{{ sectionLabel(item.type) }}</v-chip>
        </template>

        <template #item.rules="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <v-chip
              v-for="r in item.rules"
              :key="r"
              size="x-small"
              variant="tonal"
              rounded="sm"
              class="font-weight-bold text-uppercase"
            >{{ r }}</v-chip>
            <span v-if="!item.rules.length" class="text-body-2 text-medium-emphasis">—</span>
          </div>
        </template>

        <template #item.categoryId="{ item }">
          <v-chip v-if="categoryName(item.categoryId)" size="x-small" variant="tonal" color="primary" rounded="pill">
            {{ categoryName(item.categoryId) }}
          </v-chip>
          <span v-else class="text-body-2 text-medium-emphasis">—</span>
        </template>

        <template #item.amount="{ item }">
          <span class="text-body-2">${{ item.amount }}/mo</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              density="compact"
              @click="openEdit(item)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              color="error"
              density="compact"
              @click="store.deleteGroup(item.id)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Info banner -->
    <v-alert
      variant="tonal"
      color="primary"
      density="compact"
      rounded="lg"
      prepend-icon="mdi-information-outline"
    >
      When a rule matches a new import, the category is applied automatically.
    </v-alert>

    <!-- Add / Edit Dialog -->
    <v-dialog v-model="addDialog" max-width="420">
      <v-card rounded="sm">
        <v-card-title class="pa-5 pb-3 text-body-1 font-weight-bold">{{
          editingId ? 'Edit category' : 'New category'
        }}</v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <div class="form-row mb-3">
            <label>Category</label>
            <v-autocomplete
              v-model="form.categoryId"
              :items="categoryItems"
              item-title="name"
              item-value="id"
              placeholder="Pick existing or leave blank"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
              clearable
              color="primary"
              @update:model-value="onCategoryPicked"
            />
          </div>
          <div class="form-row mb-3">
            <label>Name</label>
            <v-text-field
              v-model="form.label"
              variant="outlined"
              density="compact"
              rounded="sm"
              autofocus
              hide-details
              color="primary"
            />
          </div>
          <div class="form-row mb-3">
            <label>Section</label>
            <v-select
              v-model="form.type"
              :items="typeItems"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
              color="primary"
            />
          </div>
          <div class="form-row mb-3">
            <label>Monthly amount</label>
            <v-text-field
              v-model="form.amount"
              type="number"
              prefix="$"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
              color="primary"
            />
          </div>
          <div class="form-row">
            <label>Keywords</label>
            <v-text-field
              v-model="form.rulesRaw"
              placeholder="e.g. NETFLIX, SPOTIFY"
              variant="outlined"
              density="compact"
              rounded="sm"
              hide-details
              color="primary"
            />
          </div>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0">
          <v-spacer />
          <v-btn variant="text" rounded="sm" @click="addDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="sm"
            :disabled="!form.label.trim()"
            @click="save"
            >{{ editingId ? 'Save' : 'Create' }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserBudgetsRulesStore } from '../stores/userBudgetsRules'
import { useUserCategoriesStore } from '../stores/userCategories'

const store = useUserBudgetsRulesStore()
const categoriesStore = useUserCategoriesStore()

const categoryItems = computed(() => categoriesStore.categories)

const categoryById = computed(() =>
  Object.fromEntries(categoriesStore.categories.map((c) => [c.id, c.name]))
)

function categoryName(id) {
  return id ? (categoryById.value[id] ?? null) : null
}

function onCategoryPicked(id) {
  if (!id) return
  const cat = categoriesStore.categories.find((c) => c.id === id)
  if (!cat) return
  form.value.label = cat.name
  form.value.type = cat.type
}

const SECTION_LABELS = { variable: 'Spending', bills: 'Bills', income: 'Income' }
function sectionLabel(type) {
  return SECTION_LABELS[type] ?? type
}

const headers = [
  { title: 'Name', key: 'label', sortable: false },
  { title: 'Category', key: 'categoryId', width: '160px', sortable: false },
  { title: 'Section', key: 'type', width: '130px', sortable: false },
  { title: 'Keywords', key: 'rules', sortable: false },
  { title: 'Amount', key: 'amount', width: '120px', sortable: false },
  { title: '', key: 'actions', width: '90px', sortable: false, align: 'end' }
]

const typeItems = [
  { title: 'Variable Expenses', value: 'variable' },
  { title: 'Bills', value: 'bills' },
  { title: 'Income', value: 'income' }
]


const addDialog = ref(false)
const editingId = ref(null)
const form = ref({ label: '', type: 'variable', amount: 0, rulesRaw: '', categoryId: null })

function openAdd() {
  editingId.value = null
  form.value = { label: '', type: 'variable', amount: 0, rulesRaw: '', categoryId: null }
  addDialog.value = true
}

function openEdit(g) {
  editingId.value = g.id
  form.value = { label: g.label, type: g.type, amount: g.amount, rulesRaw: g.rules.join(', '), categoryId: g.categoryId ?? null }
  addDialog.value = true
}

async function save() {
  const label = form.value.label.trim()
  if (!label) return
  const rules = form.value.rulesRaw.split(',').map((r) => r.trim()).filter(Boolean)
  const payload = { type: form.value.type, label, rules, amount: Number(form.value.amount) || 0, categoryId: form.value.categoryId || null }
  if (editingId.value) {
    await store.updateGroup(editingId.value, payload)
  } else {
    await store.addGroup(payload)
  }
  addDialog.value = false
}

onMounted(() => store.fetchGroups())
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 12px;
}

.form-row label {
  font-size: 0.875rem;
  text-align: right;
  white-space: nowrap;
}
</style>
