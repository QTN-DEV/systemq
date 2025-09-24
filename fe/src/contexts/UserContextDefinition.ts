import { createContext } from 'react'

import type { AuthenticatedUser } from '@/services/AuthService'

interface UserContextType {
  user: AuthenticatedUser | null
  setUser: (user: AuthenticatedUser | null) => void
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const UserContext = createContext<UserContextType | undefined>(undefined)
