import usersData from '../data/mockUsers.json'
import type { User } from '../types/user-type'

const users = usersData as User[]

export function getAllEmployees(): User[] {
  return users
}

export function getEmployeeById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function searchEmployees(query: string): User[] {
  const q = query.toLowerCase()
  return users.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.title.toLowerCase().includes(q) ||
    u.id.toLowerCase().includes(q)
  )
}

export function getSubordinates(userId: string): User[] {
  const user = getEmployeeById(userId)
  if (!user) return []
  return users.filter(u => user.subordinates.includes(u.id))
}

