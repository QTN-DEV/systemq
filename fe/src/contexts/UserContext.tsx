import { createContext, useContext, useState, type ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'secretary' | 'employee' | 'manager' | 'admin'
  avatar?: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  // Mock user data - in real app this would come from authentication
  const [user, setUser] = useState<User | null>({
    id: '1',
    name: 'Grace Edenia',
    email: 'grace.edenia@company.com',
    role: 'secretary' // Default role for demo
  })

  const isAuthenticated = user !== null

  const login = async (email: string, password: string) => {
    // Mock login logic - in real app this would call your auth API
    console.log('Login attempt:', { email, password })
    
    // Mock different users based on email for demo
    let mockUser: User
    if (email.includes('admin')) {
      mockUser = {
        id: '4',
        name: 'Admin User',
        email: email,
        role: 'admin'
      }
    } else if (email.includes('manager')) {
      mockUser = {
        id: '3',
        name: 'Manager User', 
        email: email,
        role: 'manager'
      }
    } else if (email.includes('employee')) {
      mockUser = {
        id: '2',
        name: 'Employee User',
        email: email,
        role: 'employee'
      }
    } else {
      mockUser = {
        id: '1',
        name: 'Grace Edenia',
        email: email,
        role: 'secretary'
      }
    }
    
    setUser(mockUser)
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
