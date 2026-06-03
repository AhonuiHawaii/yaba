import Dexie from 'dexie'
import defaultCategories from '../assets/categories.json'

// DO NOT add db.version() migrations. Bump the version number only if the schema must change.
const db = new Dexie('BudgetAppFrontendDB')

db.version(3).stores({
  categories: 'id, name, type, createdAt',
  budgets: 'id, categoryId, amount, month, createdAt',
  debtDetails: 'id, updatedAt'
})

db.on('populate', () => {
  const now = new Date().toISOString()
  const groupToType = { Expenses: 'bills', Variable: 'variable' }
  db.categories.bulkAdd(
    defaultCategories.map((d) => ({
      id: crypto.randomUUID(),
      name: d.category,
      type: groupToType[d.categoryGroup] ?? 'variable',
      createdAt: now
    }))
  )
})

export default db
