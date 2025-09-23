import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'

import { logger } from '@/lib/logger'
import { getCurrentSession, login as loginService, logout as logoutService, type AuthenticatedUser } from '@/services/AuthService'

import { UserContext } from './UserContextDefinition'

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps): ReactNode {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => getCurrentSession()?.user ?? null)

  useEffect(() => {
    const session = getCurrentSession()
    if (session) {
      setUser(session.user)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    logger.log('Login attempt:', { email })
    const session = await loginService(email, password)
    setUser(session.user)
    logger.log('Login successful', { userId: session.user.id })
  }, [])

  const logout = useCallback(() => {
    logoutService()
    setUser(null)
    logger.log('User logged out')
  }, [])

  const isAuthenticated = user !== null

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    login,
    logout
  }), [user, isAuthenticated, login, logout])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
