import users from '../data/mockUsers.json'
import type { User } from '../types/user-type'

export interface AuthSession {
  token: string
  user: User
  expiresAt: number // epoch ms
}

const SESSION_KEY = 'auth.session'
const RESET_TOKEN_KEY = 'auth.resetToken'

function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
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

export async function login(email: string, _password: string): Promise<AuthSession> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200))

  const normalizedEmail = email.trim().toLowerCase()
  const allUsers = users as User[]
  const matched = allUsers.find(u => u.email.toLowerCase() === normalizedEmail)
  if (!matched) {
    throw new Error('Invalid email or password')
  }

  // Issue a mock token valid for 2 hours
  const token = btoa(`${matched.id}:${Date.now()}`)
  const session: AuthSession = {
    token,
    user: matched,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  }
  saveSession(session)
  return session
}

export async function forgotPassword(email: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200))
  const normalizedEmail = email.trim().toLowerCase()
  const allUsers = users as User[]
  const exists = allUsers.some(u => u.email.toLowerCase() === normalizedEmail)
  if (!exists) {
    // Avoid leaking which emails exist
    return
  }
  // Store a simple reset token in localStorage for demo purposes
  const token = `reset-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(RESET_TOKEN_KEY, JSON.stringify({ email: normalizedEmail, token }))
}

export async function resetPassword(token: string, _newPassword: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200))
  const raw = localStorage.getItem(RESET_TOKEN_KEY)
  if (!raw) throw new Error('Invalid or expired reset token')
  const { token: savedToken } = JSON.parse(raw) as { email: string; token: string }
  if (savedToken !== token) throw new Error('Invalid or expired reset token')
  // Clear token (pretend password updated server-side)
  localStorage.removeItem(RESET_TOKEN_KEY)
}

export async function changePassword(_userId: string, _currentPassword: string, _newPassword: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200))
  // Always succeed in mock. Real implementation would verify server-side.
}

