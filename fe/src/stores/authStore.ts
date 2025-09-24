import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthSession, AuthenticatedUser } from '@/services/AuthService'

interface AuthState {
  session: AuthSession | null
  user: AuthenticatedUser | null
  setSession: (session: AuthSession | null) => void
  setUser: (user: AuthenticatedUser | null) => void
  clearSession: () => void
  getCurrentSession: () => AuthSession | null
  isSessionValid: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,

      setSession: (session: AuthSession | null): void => {
        set({ session, user: session?.user ?? null })
      },

      setUser: (user: AuthenticatedUser | null): void => {
        set({ user })
      },

      clearSession: (): void => {
        set({ session: null, user: null })
      },

      getCurrentSession: (): AuthSession | null => {
        const { session } = get()
        if (!session) return null

        // Check if session is expired
        if (Date.now() > session.expiresAt) {
          get().clearSession()
          return null
        }

        return session
      },

      isSessionValid: (): boolean => {
        const session = get().getCurrentSession()
        return session !== null
      }
    }),
    {
      name: 'auth.session',
      partialize: (state) => ({ session: state.session, user: state.user })
    }
  )
)