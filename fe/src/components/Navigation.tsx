import type { ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'

import { cn } from '../lib/utils'

function Navigation(): ReactElement {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/home', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ]

  const handleLogout = (): void => {
    // TODO: Add actual logout logic
    const result = navigate('/')
    if (result) {
      result.then(() => {
        logger.log('Logout successful')
      }).catch((error) => {
        logger.error('Logout failed', error)
      })
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-slate-900 rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-sm" />
              </div>
              <span className="text-xl font-bold text-gray-900">Internal Ops</span>
            </Link>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
