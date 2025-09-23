import axios from 'axios'
import type { AxiosRequestHeaders } from 'axios'

import type { Position, User } from '../types/user-type'

export interface AuthenticatedUser extends User {
  role: 'employee' | 'hr' | 'internalops' | 'pm'
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

const SESSION_KEY = 'auth.session'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'https://api.systemq.qtn.ai'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

type ApiErrorPayload = {
  detail?: string | { msg?: string }[]
  message?: string
}

api.interceptors.request.use(config => {
  const session = getCurrentSession()
  if (session?.token) {
    const headers = (config.headers ?? {}) as AxiosRequestHeaders
    headers.Authorization = `Bearer ${session.token}`
    config.headers = headers
  }
  return config
})

function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
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

export function getCurrentSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function login(email: string, password: string): Promise<AuthSession> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    const session = mapLoginResponse(data)
    saveSession(session)
    return session
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export async function forgotPassword(email: string): Promise<string> {
  try {
    const { data } = await api.post<MessageResponse>('/auth/forgot-password', { email })
    return data.message
  } catch (error) {
    throw new Error(extractErrorMessage(error))
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
    throw new Error(extractErrorMessage(error))
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
    throw new Error(extractErrorMessage(error))
  }
}

