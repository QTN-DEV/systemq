import {
  FileText,
  LayoutDashboard,
  Building2,
  Users,
  Folder,
  ChevronLeft,
  LogOut,
  Settings
} from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'
import type { AuthenticatedUser } from '@/services/AuthService'

import logo from '../assets/logo.png'
import menuConfig from '../config/menuConfig.json'
import { cn } from '../lib/utils'

import { getAvatarUrl } from './Avatar'

// Icon mapping
const iconMap = {
  FileText,
  LayoutDashboard,
  Building2,
  Users,
  Folder
}

interface SidebarProps {
  user?: AuthenticatedUser | null
}

function Sidebar({ user }: SidebarProps): ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const userRole = user?.role ?? 'employee'
  const rawName = user?.name?.trim()
  const displayName = rawName && rawName.length > 0 ? rawName : 'Employee User'
  const computedInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
  const initials = computedInitials.length > 0 ? computedInitials : 'EU'
  const avatarUrl = user ? getAvatarUrl(user.avatar, user.name) : null

  const handleLogout = (): void => {
    const result = navigate('/')
    if (result) {
      result.then(() => {
        logger.log('Logout successful')
      }).catch((error) => {
        logger.error('Logout failed', error)
      })
    }
  }

  // Filter menu items based on user role
  const filteredMenuItems = menuConfig.menuItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  )

  const currentRole = menuConfig.roles?.[userRole] ?? {
    name: 'Employee',
    color: 'blue'
  }

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Internal Ops" className="w-6 h-6 invert" />
            <span className="text-lg font-semibold text-gray-900">Internal Ops</span>
          </div>
        )}
        {isCollapsed && (
          <img src={logo} alt="Internal Ops" className="w-6 h-6 mx-auto invert" />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className={cn(
            'w-4 h-4 text-gray-500 transition-transform',
            isCollapsed && 'rotate-180'
          )} />
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                currentRole.color === 'pink' && 'bg-pink-500',
                currentRole.color === 'blue' && 'bg-blue-500',
                currentRole.color === 'green' && 'bg-green-500',
                currentRole.color === 'purple' && 'bg-purple-500'
              )}>
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{currentRole.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed user indicator */}
      {isCollapsed && (
        <div className="p-2 border-b border-gray-200 flex justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
              currentRole.color === 'pink' && 'bg-pink-500',
              currentRole.color === 'blue' && 'bg-blue-500', 
              currentRole.color === 'green' && 'bg-green-500',
              currentRole.color === 'purple' && 'bg-purple-500'
            )}>
              {initials}
            </div>
          )}
        </div>
      )}

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap]
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  'flex items-center px-2 py-2 text-sm font-medium transition-colors group',
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  isCollapsed && 'justify-center'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className={cn(
                  'flex-shrink-0 w-5 h-5',
                  isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500',
                  !isCollapsed && 'mr-3'
                )} />
                {!isCollapsed && (
                  <span className="truncate">{item.title}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Settings and Logout */}
      <div className="p-2 border-t border-gray-200 space-y-1">
        <Link
          to="/change-password"
          className={cn(
            'flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Change Password' : undefined}
        >
          <Settings className={cn(
            'w-5 h-5 text-gray-400',
            !isCollapsed && 'mr-3'
          )} />
          {!isCollapsed && <span>Change Password</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className={cn(
            'w-5 h-5 text-gray-400',
            !isCollapsed && 'mr-3'
          )} />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
