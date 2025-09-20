import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Download, X, Edit } from 'lucide-react'
import mockData from '../data/mockData.json'

interface Employee {
  id: string
  name: string
  email: string
  title: string
  division: string
  level: string
  position: string
  subordinates: string[]
  projects: string[]
  avatar: string
}

interface Project {
  id: string
  name: string
  avatar: string
}

function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Employees')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showSubordinatesDropdown, setShowSubordinatesDropdown] = useState<string | null>(null)
  const [showProjectsDropdown, setShowProjectsDropdown] = useState<string | null>(null)

  const employees: Employee[] = mockData.employees
  const projects: Project[] = mockData.projects

  // Get unique positions for filter tabs
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(employees.map(emp => emp.position))]
    return ['All Employees', ...uniquePositions]
  }, [employees])

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees

    // Filter by position
    if (activeFilter !== 'All Employees') {
      filtered = filtered.filter(emp => emp.position === activeFilter)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [employees, activeFilter, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + rowsPerPage)

  // Helper functions
  const getProjectsByIds = (projectIds: string[]) => {
    return projects.filter(project => projectIds.includes(project.id))
  }

  const getSubordinatesByIds = (subordinateIds: string[]) => {
    return employees.filter(emp => subordinateIds.includes(emp.id))
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getPositionBadgeColor = (position: string) => {
    const colors = {
      'CEO': 'bg-purple-100 text-purple-800',
      'Division Lead': 'bg-blue-100 text-blue-800',
      'PMs': 'bg-pink-100 text-pink-800',
      'Developers': 'bg-green-100 text-green-800',
      'UI/UX Designers': 'bg-orange-100 text-orange-800',
      'HRs': 'bg-red-100 text-red-800',
      'Marketings': 'bg-indigo-100 text-indigo-800'
    }
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleShowSubordinates = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSubordinatesDropdown(showSubordinatesDropdown === employeeId ? null : employeeId)
    setShowProjectsDropdown(null) // Close projects dropdown if open
  }

  const handleShowProjects = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowProjectsDropdown(showProjectsDropdown === employeeId ? null : employeeId)
    setShowSubordinatesDropdown(null) // Close subordinates dropdown if open
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-pink-500', 'bg-blue-500', 'bg-red-500', 'bg-green-500',
      'bg-yellow-500', 'bg-purple-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSubordinatesDropdown(null)
      setShowProjectsDropdown(null)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Centralized system to manage employee profiles, roles, and lifecycle.</p>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 mb-6 border-b">
          {positions.map((position) => (
            <button
              key={position}
              onClick={() => {
                setActiveFilter(position)
                setCurrentPage(1)
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeFilter === position
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {position}
            </button>
          ))}
        </div>

        {/* Search and Export */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
            />
          </div>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Position
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subordinates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projects
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEmployees.map((employee) => {
              const employeeProjects = getProjectsByIds(employee.projects)
              const subordinates = getSubordinatesByIds(employee.subordinates)

              return (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div
                          className="h-10 w-10 rounded-full bg-cover bg-center flex items-center justify-center text-white font-medium text-sm"
                          style={{
                            backgroundImage: `url(${employee.avatar})`,
                            backgroundColor: employee.avatar ? 'transparent' : '#6B7280'
                          }}
                        >
                          {!employee.avatar && getInitials(employee.name)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{employee.title}</div>
                    <div className="text-sm text-gray-500">{employee.division}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getPositionBadgeColor(employee.position)}`}>
                      {employee.position}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1">
                      {subordinates.slice(0, 2).map((sub) => (
                        <div key={sub.id} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                          <div
                            className="w-5 h-5 rounded-full bg-cover bg-center flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              backgroundImage: `url(${sub.avatar})`,
                              backgroundColor: sub.avatar ? 'transparent' : '#6B7280'
                            }}
                          >
                            {!sub.avatar && getInitials(sub.name)}
                          </div>
                          <span className="text-sm text-gray-900">{sub.name}</span>
                        </div>
                      ))}
                      {subordinates.length > 2 && (
                        <div className="relative">
                          <span
                            className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 px-3"
                            onClick={(e) => handleShowSubordinates(employee.id, e)}
                          >
                            {subordinates.length - 2} more
                          </span>
                          {showSubordinatesDropdown === employee.id && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                              <div className="p-2 border-b border-gray-100">
                                <div className="text-sm font-medium text-gray-900">{employee.name}'s Subordinates</div>
                              </div>
                              <div className="p-2 max-h-48 overflow-y-auto">
                                <div className="space-y-2">
                                  {subordinates.map((subordinate) => (
                                    <div key={subordinate.id} className="flex items-center space-x-2 px-2 py-0.5 hover:bg-gray-50 rounded">
                                      <div
                                        className={`w-6 h-6 rounded-full bg-cover bg-center flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(subordinate.name)}`}
                                        style={{
                                          backgroundImage: `url(${subordinate.avatar})`,
                                          backgroundColor: subordinate.avatar ? 'transparent' : undefined
                                        }}
                                      >
                                        {!subordinate.avatar && getInitials(subordinate.name)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">{subordinate.name}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-2 border-t border-gray-100 bg-gray-50">
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs">
                                  <Edit className="w-3 h-3" />
                                  <span>Manage Subordinate</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {employeeProjects.slice(0, 3).map((project) => (
                        <div key={project.id} className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                          <div
                            className="w-5 h-5 rounded bg-cover bg-center flex items-center justify-center text-white text-xs font-medium"
                            style={{
                              backgroundImage: `url(${project.avatar})`,
                              backgroundColor: project.avatar ? 'transparent' : '#6B7280'
                            }}
                          >
                            {!project.avatar && getInitials(project.name)}
                          </div>
                          <span className="text-sm text-gray-900">{project.name}</span>
                        </div>
                      ))}
                      {employeeProjects.length > 3 && (
                        <div className="relative">
                          <span
                            className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 px-3"
                            onClick={(e) => handleShowProjects(employee.id, e)}
                          >
                            {employeeProjects.length - 3} more
                          </span>
                          {showProjectsDropdown === employee.id && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                              <div className="p-2 border-b border-gray-100">
                                <div className="text-sm font-medium text-gray-900">{employee.name}'s Projects</div>
                              </div>
                              <div className="p-2 max-h-48 overflow-y-auto">
                                <div className="space-y-2">
                                  {employeeProjects.map((project) => (
                                    <div key={project.id} className="flex items-center space-x-2 px-2 py-0.5 hover:bg-gray-50 rounded">
                                      <div
                                        className={`w-6 h-6 rounded bg-cover bg-center flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(project.name)}`}
                                        style={{
                                          backgroundImage: `url(${project.avatar})`,
                                          backgroundColor: project.avatar ? 'transparent' : undefined
                                        }}
                                      >
                                        {!project.avatar && getInitials(project.name)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">{project.name}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="p-2 border-t border-gray-100 bg-gray-50">
                                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs">
                                  <Edit className="w-3 h-3" />
                                  <span>Manage projects by going to Project Management page</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-700">
            {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length} rows
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &lt;
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page = i + 1
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm border ${currentPage === page
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            )
          })}

          {totalPages > 5 && (
            <>
              <span className="text-sm text-gray-500">...</span>
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &gt;
          </button>
        </div>
      </div>

    </div>
  )
}

export default EmployeeManagement
