import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StorageAdapter } from '~/lib/storage/types'
import { createAuthRepository } from '~/lib/storage/repositories/auth'
import { STORAGE_KEYS } from '~/lib/storage/keys'

function createMockAdapter(): StorageAdapter {
  const store = new Map<string, unknown>()
  return {
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      return (store.get(key) as T) ?? null
    }),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
    remove: vi.fn(async (key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(async () => {
      store.clear()
    }),
  }
}

describe('createAuthRepository', () => {
  let adapter: StorageAdapter
  let repo: ReturnType<typeof createAuthRepository>

  beforeEach(() => {
    adapter = createMockAdapter()
    repo = createAuthRepository(adapter)
  })

  it('stores and retrieves the passphrase', async () => {
    await repo.setPassphrase('open sesame')
    const result = await repo.getPassphrase()
    expect(result).toBe('open sesame')
    expect(adapter.set).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_PASSPHRASE, 'open sesame')
  })

  it('returns null when no passphrase is stored', async () => {
    expect(await repo.getPassphrase()).toBeNull()
  })

  it('stores and retrieves athlete', async () => {
    const athlete = {
      id: 1,
      firstname: 'John',
      lastname: 'Doe',
      profile: 'https://example.com/photo.jpg',
      city: 'Copenhagen',
      country: 'Denmark',
    }
    await repo.setAthlete(athlete)
    const result = await repo.getAthlete()
    expect(result).toEqual(athlete)
  })

  it('clears passphrase, athlete and legacy tokens', async () => {
    await repo.setPassphrase('secret')
    await repo.setAthlete({
      id: 1,
      firstname: 'J',
      lastname: 'D',
      profile: '',
      city: '',
      country: '',
    })
    await repo.clear()
    expect(adapter.remove).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_PASSPHRASE)
    expect(adapter.remove).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_ATHLETE)
    expect(adapter.remove).toHaveBeenCalledWith(STORAGE_KEYS.LEGACY_AUTH_TOKENS)
    expect(await repo.getPassphrase()).toBeNull()
    expect(await repo.getAthlete()).toBeNull()
  })
})
