import { useContext } from 'react'

import { UserContext } from './UserContextDefinition'

interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'hr' | 'internalops' | 'pm'
  avatar?: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export function useUser(): UserContextType {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}