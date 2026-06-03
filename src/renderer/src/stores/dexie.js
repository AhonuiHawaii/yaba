import Dexie from 'dexie'
import defaultCategories from '../assets/categories.json'

const db = new Dexie('BudgetAppFrontendDB')

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

db.version(2).stores({
  incomeCategories: null,
  savingsCategories: null,
  variableCategories: null,
  billsCategories: null,
  debtCategories: null,
  categories: 'id, name, type, createdAt',
  budgets: 'id, categoryId, amount, createdAt',
  goals: 'id, name, targetDate, status, createdAt',
  debtDetails: 'id, updatedAt',
  budgetRollovers: 'id, categoryId, month, createdAt',
  budgetGroups: 'id, type, categoryId, createdAt'
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
