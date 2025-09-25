import axios from 'axios'

import { useAuthStore } from '@/stores/authStore'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'https://api.systemq.qtn.ai'

// console.log('QB base:', API_BASE_URL)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
})

api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

export interface CreateUserPayload {
  id?: string | null
  name: string
  email: string
  title?: string | null
  division?: string | null
  level?: string | null
  position?: string | null
  employment_type: 'full-time' | 'part-time' | 'intern'
  subordinates?: string[]
  projects?: string[]
  avatar?: string | null
  hashed_password?: string
  is_active?: boolean
}

export async function createEmployee(payload: CreateUserPayload): Promise<unknown> {
  const response = await api.post('/employees/', payload)
  return response.data
}

export interface EmployeeListItem {
  id: string
  name: string
  email: string
  title?: string | null
  division?: string | null
  position?: string | null
  subordinates: string[]
  projects: string[]
  avatar?: string | null
  level?: string | null
  employment_type?: 'full-time' | 'part-time' | 'intern'
  is_active: boolean
}

export async function getEmployees(): Promise<EmployeeListItem[]> {
  const response = await api.get<EmployeeListItem[]>('/employees/')
  return response.data
}

export type UpdateEmployeePayload = Partial<{
  name: string
  email: string
  title: string | null
  division: string | null
  level: string | null
  position: string | null
  employment_type: 'full-time' | 'part-time' | 'intern'
  subordinates: string[]
  projects: string[]
  avatar: string | null
  is_active: boolean
}>

export async function updateEmployee(employeeId: string, payload: UpdateEmployeePayload): Promise<EmployeeListItem> {
  const response = await api.put<EmployeeListItem>(`/employees/${employeeId}`, payload)
  return response.data
}

export async function deactivateEmployee(employeeId: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/employees/${employeeId}/deactivate`, {}, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  return response.data
}

export async function getInactiveEmployees(search?: string): Promise<EmployeeListItem[]> {
  const params = search ? { search } : {}
  const response = await api.get<EmployeeListItem[]>('/employees/inactive', { params })
  return response.data
}


