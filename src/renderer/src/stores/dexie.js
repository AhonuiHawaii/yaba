import Dexie from 'dexie'
import defaultCategories from '../assets/categories.json'

// DO NOT add db.version() migrations. Bump the version number only if the schema must change.
const db = new Dexie('BudgetAppFrontendDB')

db.version(1).stores({
  categories: 'id, name, type, createdAt',
  budgets: 'id, type, amount, month, createdAt',
  debtDetails: 'id, updatedAt'
})

export default db
