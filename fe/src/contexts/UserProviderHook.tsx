import { useContext } from 'react'

import type { AuthenticatedUser } from '@/services/AuthService'

import { UserContext } from './UserContextDefinition'

interface UserContextType {
  user: AuthenticatedUser | null
  setUser: (user: AuthenticatedUser | null) => void
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
