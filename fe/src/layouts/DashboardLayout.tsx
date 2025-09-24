import { type ReactElement, type ReactNode } from 'react'

import Sidebar from '../components/Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout
