import Dexie from 'dexie'

// DO NOT add db.version() migrations. Bump the version number only if the schema must change.
const db = new Dexie('Budgets')

db.version(1).stores({
  budgets: 'id, type, amount, month, createdAt',
  debtDetails: 'id, updatedAt'
})

export default db
