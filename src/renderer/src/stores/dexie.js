import Dexie from 'dexie'
import defaultCategories from '../assets/categories.json'

const db = new Dexie('BudgetAppFrontendDB')
//  Do not create multiple versions of the database, it is not needed.
db.version(1).stores({
  incomeCategories: 'id, name, createdAt',
  savingsCategories: 'id, name, createdAt',
  variableCategories: 'id, name, createdAt',
  billsCategories: 'id, name, createdAt',
  debtCategories: 'id, name, createdAt',
  budgets: 'id, categoryId, amount, createdAt',
  goals: 'id, name, targetDate, status, createdAt',
  debtDetails: 'id, updatedAt',
  budgetRollovers: 'id, categoryId, month, createdAt',
  budgetGroups: 'id, type, categoryId, createdAt'
})

db.on('populate', () => {
  const now = new Date().toISOString()
  db.billsCategories.bulkAdd(
    defaultCategories
      .filter((d) => d.categoryGroup === 'Expenses')
      .map((d) => ({ id: crypto.randomUUID(), name: d.category, createdAt: now }))
  )
  db.variableCategories.bulkAdd(
    defaultCategories
      .filter((d) => d.categoryGroup === 'Variable')
      .map((d) => ({ id: crypto.randomUUID(), name: d.category, createdAt: now }))
  )
})

export default db
