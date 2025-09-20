import type { ReactElement } from 'react'
import { useState } from 'react'
import { Building2, Users, Eye } from 'lucide-react'

import OrganizationChart from '../components/OrganizationChart'

export default function StructureOrganization(): ReactElement {
  const [activeTab, setActiveTab] = useState<'general' | 'project'>('general')

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Structure Organization</h1>
        </div>
        <p className="text-gray-600">Dynamic tool to define and visualize company hierarchy and reporting lines.</p>
      </div>

      {/* Organization Chart */}
      <div className="flex-1 bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden">
        {activeTab === 'general' && (
          <OrganizationChart className="h-full w-full" />
        )}
        {activeTab === 'project' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Project Structure View</h3>
              <p className="text-gray-600">Project-based organizational structure coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
