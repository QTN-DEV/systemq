import type { ReactElement } from 'react'

import OrganizationChart from '@/components/OrganizationChart'

export default function StructureOrganization(): ReactElement {
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
        <OrganizationChart className="h-full w-full" />
      </div>
    </div>
  )
}
