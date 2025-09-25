import type { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps): ReactElement {
  const isSessionValid = useAuthStore((state) => state.isSessionValid)
  const location = useLocation()

  const allowed = isSessionValid()
  if (!allowed) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children as ReactElement
}


