import { useState, useMemo, type ReactNode } from 'react'

import { logger } from '@/lib/logger'

import { UserContext } from './UserContextDefinition'

interface User {
  id: string
  name: string
  email: string
  role: 'employee' | 'hr' | 'internalops' | 'pm'
  avatar?: string
}

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps): ReactNode {
  // Mock user data - in real app this would come from authentication
  const [user, setUser] = useState<User | null>(null)

  const isAuthenticated = user !== null

  const login = async (email: string, _password: string): Promise<void> => {
    // Mock login logic - in real app this would call your auth API
    logger.log('Login attempt:', { email, password: _password })

    // Mock different users based on email for demo
    let mockUser: User
    if (email === 'hr@quantumteknologi.com') {
      mockUser = {
        id: '1',
        name: 'HR User',
        email,
        role: 'hr'
      }
    } else if (email === 'internalops@quantumteknologi.com') {
      mockUser = {
        id: '2',
        name: 'Internal Ops User',
        email,
        role: 'internalops'
      }
    } else {
      mockUser = {
        id: '3',
        name: 'Employee User',
        email,
        role: 'employee'
      }
    }

    setUser(mockUser)
  }

  const logout = (): void => {
    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    login,
    logout
  }), [user, isAuthenticated])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}