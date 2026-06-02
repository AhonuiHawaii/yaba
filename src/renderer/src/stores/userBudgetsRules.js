import { defineStore } from 'pinia'
import { ref } from 'vue'
import db from './dexie'

const ipc = window.electron?.ipcRenderer

// Map category type → Dexie table name
function catTable(type) {
  return db[`${type}Categories`]
}

function stripQuotes(rule) {
  return rule.replace(/^["']|["']$/g, '').trim()
}

async function createSQLiteRules(categoryId, rules) {
  if (!ipc) return []
  const ids = []
  for (const rule of rules) {
    const keyword = stripQuotes(rule)
    if (!keyword) continue
    const created = await ipc.invoke('rules:create', {
      field: 'NAME',
      operator: 'contains',
      value: keyword,
      category: categoryId,
      type: null,
      priority: 0
    })
    ids.push(created.id)
  }
  return ids
}

async function deleteSQLiteRules(ruleIds = []) {
  if (!ipc) return
  for (const id of ruleIds) {
    await ipc.invoke('rules:delete', id)
  }
}

export const useUserBudgetsRulesStore = defineStore('userBudgetsRules', () => {
  const groups = ref([])

  async function fetchGroups() {
    const rows = await db.budgetGroups.orderBy('createdAt').toArray()
    // Sync amount from the budgets table so MonthlyBudgets edits are reflected
    groups.value = await Promise.all(
      rows.map(async (g) => {
        if (!g.categoryId) return g
        const budget = await db.budgets.where('categoryId').equals(g.categoryId).first()
        return { ...g, amount: budget?.amount ?? g.amount ?? 0 }
      })
    )
  }

  async function addGroup(group) {
    const now = new Date().toISOString()
    const categoryId = crypto.randomUUID()

    // Write into the shared category table MonthlyBudgets reads from
    await catTable(group.type).add({ id: categoryId, name: group.label, createdAt: now })

    // Write the budget amount into the shared budgets table
    await db.budgets.add({
      id: crypto.randomUUID(),
      categoryId,
      amount: group.amount || 0,
      createdAt: now
    })

    // Create SQLite auto-categorization rules keyed by categoryId
    const ruleIds = await createSQLiteRules(categoryId, group.rules)

    const row = { ...group, id: crypto.randomUUID(), categoryId, ruleIds, createdAt: now }
    await db.budgetGroups.add(row)
    groups.value.push(row)
  }

  async function updateGroup(id, updates) {
    const existing = groups.value.find((g) => g.id === id)
    if (!existing) return

    const merged = { ...existing, ...updates }

    // Sync label → category name
    if (updates.label !== undefined && existing.categoryId) {
      await catTable(existing.type).update(existing.categoryId, { name: updates.label })
    }

    // Sync amount → budgets table
    if (updates.amount !== undefined && existing.categoryId) {
      const budget = await db.budgets.where('categoryId').equals(existing.categoryId).first()
      if (budget) {
        await db.budgets.update(budget.id, { amount: updates.amount })
      } else {
        await db.budgets.add({
          id: crypto.randomUUID(),
          categoryId: existing.categoryId,
          amount: updates.amount,
          createdAt: new Date().toISOString()
        })
      }
    }

    // Resync SQLite rules if rules or label changed
    if (updates.rules !== undefined || updates.label !== undefined) {
      await deleteSQLiteRules(existing.ruleIds)
      const ruleIds = await createSQLiteRules(existing.categoryId, merged.rules)
      updates = { ...updates, ruleIds }
    }

    await db.budgetGroups.update(id, updates)
    const idx = groups.value.findIndex((g) => g.id === id)
    if (idx !== -1) groups.value[idx] = { ...existing, ...updates }
  }

  async function deleteGroup(id) {
    const existing = groups.value.find((g) => g.id === id)
    if (!existing) return

    if (existing.categoryId) {
      await catTable(existing.type).delete(existing.categoryId)
      await db.budgets.where('categoryId').equals(existing.categoryId).delete()
    }

    await deleteSQLiteRules(existing.ruleIds)
    await db.budgetGroups.delete(id)
    groups.value = groups.value.filter((g) => g.id !== id)
  }

  return { groups, fetchGroups, addGroup, updateGroup, deleteGroup }
})
