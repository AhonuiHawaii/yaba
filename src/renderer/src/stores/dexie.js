import Dexie from 'dexie'

/*
Initialize Dexie database

DO NOT UPDATE OR ALTER THIS FILE

*/

const db = new Dexie('Budgets')

db.version(1).stores({
  budgets: 'id, type, amount, month, createdAt',
  debtDetails: 'id, updatedAt'
})

export default db
