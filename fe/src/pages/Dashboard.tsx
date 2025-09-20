import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your Internal Ops dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
          <p className="text-gray-600 mb-4">Access your most used features</p>
          <div className="space-y-2">
            <Link
              to="/about"
              className="block text-blue-600 hover:text-blue-700 transition-colors"
            >
              View About →
            </Link>
            <Link
              to="/contact"
              className="block text-blue-600 hover:text-blue-700 transition-colors"
            >
              Contact Support →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">System Status</h3>
          <p className="text-gray-600 mb-4">All systems operational</p>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Online</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
          <p className="text-gray-600">No recent activity</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
