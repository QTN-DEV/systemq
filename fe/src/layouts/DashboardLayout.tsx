import { ReactNode } from 'react'
import Sidebar from '../components/Sidebar'
import { useUser } from '../contexts/UserContext'

interface DashboardLayoutProps {
  children: ReactNode
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useUser()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole={user?.role} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout
