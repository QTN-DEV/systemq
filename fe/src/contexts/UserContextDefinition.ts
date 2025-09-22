import { createContext } from 'react'

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

export const UserContext = createContext<UserContextType | undefined>(undefined)