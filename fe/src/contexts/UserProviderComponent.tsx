import { useMemo, useEffect, useCallback, type ReactNode, type ReactElement } from 'react'

import { logger } from '@/lib/logger'
import {
  AuthServiceError,
  fetchCurrentUser,
  login as loginService,
  logout as logoutService,
  renewSession
} from '@/services/AuthService'
import { useAuthStore } from '@/stores/authStore'

import { UserContext } from './UserContextDefinition'

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps): ReactElement {
  const { getCurrentSession, user, setUser } = useAuthStore((state) => ({
    getCurrentSession: state.getCurrentSession,
    user: state.user,
    setUser: state.setUser
  }))

  useEffect(() => {
    let cancelled = false

    const clearSessionSilently = async (): Promise<void> => {
      try {
        await logoutService()
      } catch (logoutError) {
        logger.warn('Logout request failed while clearing stale session', logoutError)
      } finally {
        if (!cancelled) {
          setUser(null)
        }
      }
    }

    const hydrateSession = async (): Promise<void> => {
      const session = getCurrentSession()
      if (!session) {
        return
      }

      try {
        const profile = await fetchCurrentUser()
        if (!cancelled) {
          setUser(profile)
        }
        logger.log('Hydrated user from /auth/me', { userId: profile.id })
      } catch (error) {
        if (error instanceof AuthServiceError) {
          if (error.status === 401) {
            try {
              const renewed = await renewSession()
              if (!cancelled) {
                setUser(renewed.user)
              }
              logger.log('Session token renewed successfully', { userId: renewed.user.id })
              return
            } catch (renewError) {
              logger.warn('Session renewal failed; clearing session', renewError)
            }
          } else if (error.status === 404) {
            logger.warn('User no longer exists; clearing session')
          } else {
            logger.error('Failed to hydrate user profile', error)
            return
          }
        } else {
          logger.error('Unexpected error while hydrating session', error)
          return
        }

        await clearSessionSilently()
      }
    }

    void hydrateSession()

    return (): void => {
      cancelled = true
    }
  }, [getCurrentSession, setUser])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    logger.log('Login attempt:', { email })
    const session = await loginService(email, password)
    setUser(session.user)
    logger.log('Login successful', { userId: session.user.id })
  }, [setUser])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutService()
    } catch (error) {
      logger.error('Logout request failed', error)
      throw error
    } finally {
      setUser(null)
      logger.log('User logged out')
    }
  }, [setUser])

  const isAuthenticated = user !== null

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    login,
    logout
  }), [user, setUser, isAuthenticated, login, logout])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
