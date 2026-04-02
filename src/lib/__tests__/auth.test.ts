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
  }
}

describe('createAuthRepository', () => {
  let adapter: StorageAdapter
  let repo: ReturnType<typeof createAuthRepository>

  beforeEach(() => {
    adapter = createMockAdapter()
    repo = createAuthRepository(adapter)
  })

  it('stores and retrieves tokens', async () => {
    const tokens = { access_token: 'abc', refresh_token: 'def', expires_at: 9999999999 }
    await repo.setTokens(tokens)
    const result = await repo.getTokens()
    expect(result).toEqual(tokens)
    expect(adapter.set).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKENS, tokens)
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

  it('clears both tokens and athlete', async () => {
    await repo.setTokens({ access_token: 'a', refresh_token: 'b', expires_at: 0 })
    await repo.setAthlete({
      id: 1,
      firstname: 'J',
      lastname: 'D',
      profile: '',
      city: '',
      country: '',
    })
    await repo.clear()
    expect(adapter.remove).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_TOKENS)
    expect(adapter.remove).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_ATHLETE)
  })

  describe('isTokenExpired', () => {
    it('returns true when no tokens exist', async () => {
      expect(await repo.isTokenExpired()).toBe(true)
    })

    it('returns true when token is expired', async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 120
      await repo.setTokens({
        access_token: 'a',
        refresh_token: 'b',
        expires_at: pastExpiry,
      })
      expect(await repo.isTokenExpired()).toBe(true)
    })

    it('returns true within 60 second buffer', async () => {
      // Token expires 30 seconds from now — within the 60s buffer
      const almostExpired = Math.floor(Date.now() / 1000) + 30
      await repo.setTokens({
        access_token: 'a',
        refresh_token: 'b',
        expires_at: almostExpired,
      })
      expect(await repo.isTokenExpired()).toBe(true)
    })

    it('returns false when token is fresh', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600
      await repo.setTokens({
        access_token: 'a',
        refresh_token: 'b',
        expires_at: futureExpiry,
      })
      expect(await repo.isTokenExpired()).toBe(false)
    })
  })
})
