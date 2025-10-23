import { type ReactElement } from 'react'

function Dashboard(): ReactElement {
  return (
    <div className="p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="bg-white rounded-lg shadow-sm border p-12">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h2>
            </div>
            <div className="text-sm text-gray-500">
              <p>In the meantime, you can explore other sections using the sidebar navigation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
