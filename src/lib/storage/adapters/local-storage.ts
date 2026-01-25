import type { StorageAdapter } from '../types'

function isClient(): boolean {
  return typeof window !== 'undefined'
}

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    if (!isClient()) return null

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null
      return JSON.parse(stored) as T
    } catch {
      return null
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    if (!isClient()) return
    localStorage.setItem(key, JSON.stringify(value))
  },

  async remove(key: string): Promise<void> {
    if (!isClient()) return
    localStorage.removeItem(key)
  },

  async clear(): Promise<void> {
    if (!isClient()) return
    localStorage.clear()
  },
}
