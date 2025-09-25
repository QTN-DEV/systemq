import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

interface RoleProtectedRouteProps {
  allowed: Array<'employee' | 'hr' | 'internalops' | 'pm'>
  children: ReactNode
}

export default function RoleProtectedRoute({ allowed, children }: RoleProtectedRouteProps): ReactElement {
  const isSessionValid = useAuthStore((s) => s.isSessionValid)
  const userRole = useAuthStore((s) => s.user?.role)
  const location = useLocation()

  if (!isSessionValid()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return children as ReactElement
}


