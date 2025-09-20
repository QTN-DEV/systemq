import { useState, useMemo, type ReactNode } from 'react'

import { logger } from '@/lib/logger'

import { UserContext } from './UserContextDefinition'

interface User {
  id: string
  name: string
  email: string
  role: 'secretary' | 'employee' | 'manager' | 'admin'
  avatar?: string
}

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps): ReactNode {
  // Mock user data - in real app this would come from authentication
  const [user, setUser] = useState<User | null>({
    id: '1',
    name: 'Grace Edenia',
    email: 'grace.edenia@company.com',
    role: 'secretary' // Default role for demo
  })

  const isAuthenticated = user !== null

  const login = async (email: string, _password: string): Promise<void> => {
    // Mock login logic - in real app this would call your auth API
    logger.log('Login attempt:', { email, password: _password })

    // Mock different users based on email for demo
    let mockUser: User
    if (email.includes('admin')) {
      mockUser = {
        id: '4',
        name: 'Admin User',
        email,
        role: 'admin'
      }
    } else if (email.includes('manager')) {
      mockUser = {
        id: '3',
        name: 'Manager User',
        email,
        role: 'manager'
      }
    } else if (email.includes('employee')) {
      mockUser = {
        id: '2',
        name: 'Employee User',
        email,
        role: 'employee'
      }
    } else {
      mockUser = {
        id: '1',
        name: 'Grace Edenia',
        email,
        role: 'secretary'
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