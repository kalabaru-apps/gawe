import { openDB as idbOpenDB, type IDBPDatabase } from 'idb'
import type { HistoryEntry, SavedSession } from '@/types'

const DB_NAME = 'gawe-app'
const DB_VERSION = 1
const HISTORY_MAX_PER_TOOL = 100

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
            autoIncrement: true,
          })
          historyStore.createIndex('toolId', 'toolId')
          historyStore.createIndex('timestamp', 'timestamp')
        }
        if (!db.objectStoreNames.contains('saved')) {
          const savedStore = db.createObjectStore('saved', {
            keyPath: 'id',
            autoIncrement: true,
          })
          savedStore.createIndex('toolId', 'toolId')
        }
      },
    })
  }
  return dbPromise
}

export async function addHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
  const db = await getDB()
  await db.add('history', { ...entry, timestamp: Date.now() })
  // Prune oldest entries if over limit
  const all = await db.getAllFromIndex('history', 'toolId', entry.toolId)
  if (all.length > HISTORY_MAX_PER_TOOL) {
    const sorted = all.sort((a, b) => a.timestamp - b.timestamp)
    const toDelete = sorted.slice(0, all.length - HISTORY_MAX_PER_TOOL)
    const tx = db.transaction('history', 'readwrite')
    for (const old of toDelete) await tx.store.delete(old.id as number)
    await tx.done
  }
}

export async function getHistory(toolId: string): Promise<HistoryEntry[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('history', 'toolId', toolId)
  return all.sort((a, b) => b.timestamp - a.timestamp)
}

export async function labelHistory(id: number, label: string): Promise<void> {
  const db = await getDB()
  const entry = await db.get('history', id)
  if (entry) await db.put('history', { ...entry, label })
}

export async function deleteHistory(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('history', id)
}

export async function clearHistory(toolId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('history', 'readwrite')
  const index = tx.store.index('toolId')
  const keys = await index.getAllKeys(toolId)
  for (const key of keys) await tx.store.delete(key)
  await tx.done
}

export async function addSaved(session: Omit<SavedSession, 'id'>): Promise<void> {
  const db = await getDB()
  await db.add('saved', { ...session, createdAt: Date.now() })
}

export async function getSaved(toolId: string): Promise<SavedSession[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('saved', 'toolId', toolId)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSaved(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('saved', id)
}

export async function exportAllData(): Promise<string> {
  const db = await getDB()
  const history = await db.getAll('history')
  const saved = await db.getAll('saved')
  return JSON.stringify({ history, saved, exportedAt: Date.now() }, null, 2)
}
