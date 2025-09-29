import axios from 'axios'

import { useAuthStore } from '@/stores/authStore'

import type { Position, User } from '../types/user-type'

export interface AuthenticatedUser extends User {
  role: 'employee' | 'hr' | 'internalops' | 'pm' | 'ceo'
}

export interface AuthSession {
  token: string
  user: AuthenticatedUser
  expiresAt: number // epoch ms
}

interface LoginResponse {
  token: string
  expires_at: number
  user: ApiUserProfile
}

interface MessageResponse {
  message: string
}

interface ApiUserProfile {
  id: string
  name: string
  email: string
  title?: string | null
  division?: string | null
  level?: string | null
  position?: string | null
  subordinates?: string[] | null
  projects?: string[] | null
  avatar?: string | null
}


const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

type ApiErrorPayload = {
  detail?: string | { msg?: string }[]
  message?: string
}

export class AuthServiceError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthServiceError'
    this.status = status
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

api.interceptors.request.use((config) => {
  const session = useAuthStore.getState().getCurrentSession()
  if (session?.token) {
    const headers = config.headers ?? {}
    headers.Authorization = `Bearer ${session.token}`
    config.headers = headers
  }
  return config
})

function saveSession(session: AuthSession): void {
  useAuthStore.getState().setSession(session)
}

function clearSession(): void {
  useAuthStore.getState().clearSession()
}

function mapApiUserToUser(profile: ApiUserProfile): AuthenticatedUser {
  const position = derivePosition(profile.position)
  const user: User = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    title: sanitizeNullable(profile.title),
    division: sanitizeNullable(profile.division),
    level: sanitizeNullable(profile.level),
    position,
    subordinates: Array.isArray(profile.subordinates) ? profile.subordinates : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    avatar: sanitizeNullable(profile.avatar),
  }

  return {
    ...user,
    role: deriveRole(position)
  }
}

function sanitizeNullable(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function derivePosition(value: string | null | undefined): Position {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('ceo')) return 'CEO'
  if (normalized.includes('internal') || normalized.includes('operation')) return 'Internal Ops'
  if (normalized.includes('hr') || normalized.includes('human resource')) return 'HR'
  if (normalized.includes('project') || normalized.includes('pm')) return 'PM'
  if (normalized.includes('lead') || normalized.includes('head')) return 'Div. Lead'
  return 'Team Member'
}

function deriveRole(position: Position): AuthenticatedUser['role'] {
  switch (position) {
    case 'CEO':
      return 'ceo'
    case 'HR':
      return 'hr'
    case 'Internal Ops':
      return 'internalops'
    case 'PM':
      return 'pm'
    default:
      return 'employee'
  }
}

function mapLoginResponse(data: LoginResponse): AuthSession {
  const expiresAt = normalizeExpiry(data.expires_at)
  const user = mapApiUserToUser(data.user)
  return {
    token: data.token,
    expiresAt,
    user
  }
}

function normalizeExpiry(value: number): number {
  if (!Number.isFinite(value)) {
    return Date.now() + 2 * 60 * 60 * 1000
  }
  // Treat values that look like seconds since epoch
  if (value < 1e12) {
    return value * 1000
  }
  return value
}

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data
    if (payload) {
      if (typeof payload.message === 'string' && payload.message.trim() !== '') {
        return payload.message
      }
      if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        const first = payload.detail[0]
        if (typeof first === 'string') {
          return first
        }
        if (first && typeof first.msg === 'string') {
          return first.msg
        }
      }
      if (typeof payload.detail === 'string' && payload.detail.trim() !== '') {
        return payload.detail
      }
    }
    if (typeof error.message === 'string' && error.message.trim() !== '') {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

function toAuthServiceError(error: unknown): AuthServiceError {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  return new AuthServiceError(extractErrorMessage(error), status)
}

export function getCurrentSession(): AuthSession | null {
  return useAuthStore.getState().getCurrentSession()
}

export async function login(email: string, password: string): Promise<AuthSession> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    const session = mapLoginResponse(data)
    saveSession(session)
    return session
  } catch (error) {
    throw toAuthServiceError(error)
  }
}

export async function forgotPassword(email: string): Promise<string> {
  try {
    const { data } = await api.post<MessageResponse>('/auth/forgot-password', { email })
    return data.message
  } catch (error) {
    throw toAuthServiceError(error)
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  try {
    const { data } = await api.post<MessageResponse>('/auth/reset-password', {
      token,
      new_password: newPassword
    })
    return data.message
  } catch (error) {
    throw toAuthServiceError(error)
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<string> {
  try {
    const { data } = await api.post<MessageResponse>('/auth/change-password', {
      user_id: userId,
      current_password: currentPassword,
      new_password: newPassword
    })
    return data.message
  } catch (error) {
    throw toAuthServiceError(error)
  }
}

function persistUserToSession(user: AuthenticatedUser): void {
  const session = getCurrentSession()
  if (!session) return
  saveSession({ ...session, user })
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  try {
    const { data } = await api.get<ApiUserProfile>('/auth/me')
    const user = mapApiUserToUser(data)
    persistUserToSession(user)
    return user
  } catch (error) {
    throw toAuthServiceError(error)
  }
}

export async function renewSession(): Promise<AuthSession> {
  const existing = getCurrentSession()
  if (!existing) {
    throw new AuthServiceError('No active session to renew')
  }

  try {
    const { data } = await api.post<LoginResponse>('/auth/renew', { token: existing.token })
    const session = mapLoginResponse(data)
    saveSession(session)
    return session
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSession()
    }
    throw toAuthServiceError(error)
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return
    }
    throw toAuthServiceError(error)
  } finally {
    clearSession()
  }
}
