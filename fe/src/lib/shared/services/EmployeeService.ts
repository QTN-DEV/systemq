import { useAuthStore } from '@/stores/authStore'
import apiClient from '@/lib/shared/api/client'

const ensureAuth = () => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    apiClient.setAuthHeader(session.token)
  }
};

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
  ensureAuth();
  const response = await apiClient.post('/employees/', payload)
  return response
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
  ensureAuth();
  const response = await apiClient.get<EmployeeListItem[]>('/employees/')
  return response
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
  ensureAuth();
  const response = await apiClient.put<EmployeeListItem>(`/employees/${employeeId}`, payload)
  return response
}

export async function deactivateEmployee(employeeId: string): Promise<{ message: string }> {
  ensureAuth();
  const response = await apiClient.post<{ message: string }>(`/employees/${employeeId}/deactivate`, {}, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  return response
}

export async function getInactiveEmployees(search?: string): Promise<EmployeeListItem[]> {
  ensureAuth();
  const params = search ? { search } : {}
  const response = await apiClient.get<EmployeeListItem[]>('/employees/inactive', { params })
  return response
}

export async function activateEmployee(employeeId: string): Promise<{ message: string }> {
  ensureAuth();
  const response = await apiClient.post<{ message: string }>(`/employees/${employeeId}/activate`, {}, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  return response
}

