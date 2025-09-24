/* eslint-disable jsx-a11y/control-has-associated-label */
import { Search, Plus, Download, X, Edit } from 'lucide-react'
import { useState, useMemo, useEffect, type ReactElement } from 'react'

import { logger } from '@/lib/logger'

import { getProjectsByIds as getProjectsByIdsService } from '../services/ProjectService'
import { createEmployee, getEmployees, updateEmployee, type EmployeeListItem } from '@/services/EmployeeService'
import type { Project } from '../types/project-type'
// Using API types instead of mock User type

function EmployeeManagement(): ReactElement {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Employees')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showSubordinatesDropdown, setShowSubordinatesDropdown] = useState<string | null>(null)
  const [showProjectsDropdown, setShowProjectsDropdown] = useState<string | null>(null)
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showManageSubordinatesForm, setShowManageSubordinatesForm] = useState(false)
  const [isSubordinateFormAnimating, setIsSubordinateFormAnimating] = useState(false)
  const [selectedEmployeeForSubordinates, setSelectedEmployeeForSubordinates] = useState<EmployeeListItem | null>(null)
  const [subordinateSearchTerm, setSubordinateSearchTerm] = useState('')
  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    email: '',
    division: '',
    title: '',
    position: '',
    subordinates: '',
    level: '',
    employment_type: 'full-time' as 'full-time' | 'part-time' | 'intern'
  })

  const [employees, setEmployees] = useState<EmployeeListItem[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const data = await getEmployees()
        setEmployees(data)
      } catch (error) {
        logger.error('Failed to load employees', error)
      }
    })()
  }, [])

  // Build a map of subordinateId -> managerId to prevent multi-managers
  const subordinateToManager = useMemo(() => {
    const map = new Map<string, string>()
    employees.forEach((manager) => {
      ;(manager.subordinates || []).forEach((sid) => {
        if (!map.has(sid)) map.set(sid, manager.id)
      })
    })
    return map
  }, [employees])

  // Get unique positions for filter tabs
  const positions = useMemo((): string[] => {
    return ['All Employees', 'CEO', 'Internal Ops', 'HR', 'PM', 'Div. Lead', 'Team Member']
  }, [])

  // Filter and search employees
  const filteredEmployees = useMemo((): EmployeeListItem[] => {
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
        (emp.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  const getProjectsByIds = (projectIds: string[]): Project[] => getProjectsByIdsService(projectIds)

  const getSubordinatesByIds = (subordinateIds: string[]): EmployeeListItem[] => {
    return employees.filter(emp => subordinateIds.includes(emp.id))
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getPositionBadgeColor = (position: string): string => {
    const colors = {
      'CEO': 'bg-purple-100 text-purple-800',
      'Internal Ops': 'bg-blue-100 text-blue-800',
      'HR': 'bg-red-100 text-red-800',
      'PM': 'bg-pink-100 text-pink-800',
      'Div. Lead': 'bg-green-100 text-green-800',
      'Team Member': 'bg-gray-100 text-gray-800'
    }
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleShowSubordinates = (employeeId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setShowSubordinatesDropdown(showSubordinatesDropdown === employeeId ? null : employeeId)
    setShowProjectsDropdown(null) // Close projects dropdown if open
  }

  const handleShowSubordinatesKeyboard = (employeeId: string, e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setShowSubordinatesDropdown(showSubordinatesDropdown === employeeId ? null : employeeId)
      setShowProjectsDropdown(null) // Close projects dropdown if open
    }
  }

  const handleShowProjects = (employeeId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setShowProjectsDropdown(showProjectsDropdown === employeeId ? null : employeeId)
    setShowSubordinatesDropdown(null) // Close subordinates dropdown if open
  }

  const handleShowProjectsKeyboard = (employeeId: string, e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setShowProjectsDropdown(showProjectsDropdown === employeeId ? null : employeeId)
      setShowSubordinatesDropdown(null) // Close subordinates dropdown if open
    }
  }

  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-pink-500', 'bg-blue-500', 'bg-red-500', 'bg-green-500',
      'bg-yellow-500', 'bg-purple-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Helper function to get available employees for subordinate assignment
  const getAvailableEmployeesForSubordinate = (currentEmployeeId: string): EmployeeListItem[] => {
    return employees.filter(emp => 
      emp.id !== currentEmployeeId && 
      emp.position !== 'CEO' &&
      !selectedEmployeeForSubordinates?.subordinates.includes(emp.id)
    ).filter(emp =>
      // Not already subordinate of someone else (except current manager)
      (!subordinateToManager.has(emp.id) || subordinateToManager.get(emp.id) === currentEmployeeId)
    ).filter(emp =>
      subordinateSearchTerm === '' ||
      emp.name.toLowerCase().includes(subordinateSearchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(subordinateSearchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(subordinateSearchTerm.toLowerCase())
    )
  }

  // Handle manage subordinates click
  const handleManageSubordinates = (employee: EmployeeListItem): void => {
    setSelectedEmployeeForSubordinates(employee)
    setShowManageSubordinatesForm(true)
    setShowSubordinatesDropdown(null)
  }

  // Handle adding subordinate
  const handleAddSubordinate = (subordinateId: string): void => {
    if (selectedEmployeeForSubordinates) {
      // In a real app, you would update the backend here
      const updatedEmployee = {
        ...selectedEmployeeForSubordinates,
        subordinates: [...selectedEmployeeForSubordinates.subordinates, subordinateId]
      }
      setSelectedEmployeeForSubordinates(updatedEmployee)
      setSubordinateSearchTerm('')
      logger.log('Adding subordinate:', subordinateId, 'to employee:', selectedEmployeeForSubordinates.id)
    }
  }

  // Handle removing subordinate
  const handleRemoveSubordinate = (subordinateId: string): void => {
    if (selectedEmployeeForSubordinates) {
      // In a real app, you would update the backend here
      const updatedEmployee = {
        ...selectedEmployeeForSubordinates,
        subordinates: selectedEmployeeForSubordinates.subordinates.filter(id => id !== subordinateId)
      }
      setSelectedEmployeeForSubordinates(updatedEmployee)
      logger.log('Removing subordinate:', subordinateId, 'from employee:', selectedEmployeeForSubordinates.id)
    }
  }

  // Persist subordinate changes using the existing update API
  const handleSaveSubordinateChanges = async (): Promise<void> => {
    if (!selectedEmployeeForSubordinates) return
    try {
      await updateEmployee(selectedEmployeeForSubordinates.id, {
        subordinates: selectedEmployeeForSubordinates.subordinates
      })
      // refresh list after save
      const data = await getEmployees()
      setEmployees(data)
    } catch (error) {
      logger.error('Failed to update subordinates', error)
    } finally {
      handleCloseSubordinateForm()
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (): void => {
      setShowSubordinatesDropdown(null)
      setShowProjectsDropdown(null)
    }

    document.addEventListener('click', handleClickOutside)
    return (): void => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Trigger animation when form opens
  useEffect(() => {
    if (showAddEmployeeForm) {
      // Small delay to ensure the form is rendered before animating
      setTimeout(() => setIsAnimating(true), 10)
    }
  }, [showAddEmployeeForm])

  // Trigger animation when subordinate form opens
  useEffect(() => {
    if (showManageSubordinatesForm) {
      // Small delay to ensure the form is rendered before animating
      setTimeout(() => setIsSubordinateFormAnimating(true), 10)
    }
  }, [showManageSubordinatesForm])

  // Handle form input changes
  const handleInputChange = (field: string, value: string): void => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle form submission
  const handleSubmitEmployee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      const payload = {
        id: newEmployee.id || undefined,
        name: newEmployee.name,
        email: newEmployee.email,
        title: newEmployee.title || null,
        division: newEmployee.division || null,
        position: newEmployee.position || null,
        level: newEmployee.level || null,
        employment_type: newEmployee.employment_type,
        subordinates: [],
        projects: []
      }
      if (isEditing && newEmployee.id) {
        const { id, ...updatePayload } = payload
        await updateEmployee(newEmployee.id, updatePayload)
      } else {
        await createEmployee(payload)
      }
      logger.log('Employee created successfully')
      // refresh list
      const data = await getEmployees()
      setEmployees(data)
    } catch (error) {
      logger.error('Failed to create employee', error)
    }

    // Close with animation
    handleCloseForm()
  }

  // Close form
  const handleCloseForm = (): void => {
    setIsAnimating(false)
    setTimeout(() => {
      setShowAddEmployeeForm(false)
      setIsEditing(false)
      setNewEmployee({
        id: '',
        name: '',
        email: '',
        division: '',
        title: '',
        position: '',
        subordinates: '',
        level: '',
        employment_type: 'full-time'
      })
    }, 300)
  }

  // Close form when clicking on overlay
  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      handleCloseForm()
    }
  }

  // Close subordinate form
  const handleCloseSubordinateForm = (): void => {
    setIsSubordinateFormAnimating(false)
    setTimeout(() => {
      setShowManageSubordinatesForm(false)
      setSelectedEmployeeForSubordinates(null)
      setSubordinateSearchTerm('')
    }, 300)
  }

  // Close subordinate form when clicking on overlay
  const handleSubordinateOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      handleCloseSubordinateForm()
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Centralized system to manage employee profiles, roles, and lifecycle.</p>
          </div>
          <button
            onClick={() => setShowAddEmployeeForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
          >
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
              aria-label="Search employees"
            />
          </div>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-x-auto">
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
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
                    <div className="flex items-center" aria-hidden="true">
                      <div className="flex-shrink-0 h-10 w-10" aria-hidden="true">
                        <div
                          className="h-10 w-10 rounded-full bg-cover bg-center flex items-center justify-center text-white font-medium text-sm"
                          style={{
                            backgroundImage: `url(${employee.avatar})`,
                            backgroundColor: employee.avatar ? 'transparent' : '#6B7280'
                          }}
                          role="img"
                          aria-label={`${employee.name}'s avatar`}
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getPositionBadgeColor(employee.position ?? '')}`}>
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
                            role="img"
                            aria-label={`${sub.name}'s avatar`}
                          >
                            {!sub.avatar && getInitials(sub.name)}
                          </div>
                          <span className="text-sm text-gray-900">{sub.name}</span>
                        </div>
                      ))}
                      <div className="relative">
                        {employee.position === 'Team Member' ? (
                          <span
                            className="text-sm text-gray-400 px-3 cursor-not-allowed"
                            aria-disabled="true"
                          >
                            {subordinates.length > 2 ? `${subordinates.length - 2} more` : 'Manage'}
                          </span>
                        ) : (
                          <span
                            className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 px-3"
                            onClick={(e) => handleShowSubordinates(employee.id, e)}
                            onKeyDown={(e) => {
                              handleShowSubordinatesKeyboard(employee.id, e)
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {subordinates.length > 2 ? `${subordinates.length - 2} more` : 'Manage'}
                          </span>
                        )}
                        {showSubordinatesDropdown === employee.id && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="p-2 border-b border-gray-100">
                              <div className="text-sm font-medium text-gray-900">{employee.name}&#39;s Subordinates</div>
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
                                      role="img"
                                      aria-label={`${subordinate.name}'s avatar`}
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
                              <button 
                                onClick={() => handleManageSubordinates(employee)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Manage Subordinate</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
                            role="img"
                            aria-label={`${project.name}'s avatar`}
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
                            onKeyDown={(e) => {
                              handleShowProjectsKeyboard(employee.id, e)
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {employeeProjects.length - 3} more
                          </span>
                          {showProjectsDropdown === employee.id && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                              <div className="p-2 border-b border-gray-100">
                                <div className="text-sm font-medium text-gray-900">{employee.name}&#39;s Projects</div>
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
                                        role="img"
                                        aria-label={`${project.name}'s avatar`}
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
                  <td className="px-6 py-4 text-right">
                    <button
                      className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50"
                      onClick={() => {
                        setNewEmployee({
                          id: employee.id,
                          name: employee.name,
                          email: employee.email,
                          division: employee.division ?? '',
                          title: employee.title ?? '',
                          position: employee.position ?? '',
                          subordinates: '',
                          level: employee.level ?? '',
                          employment_type: (employee.employment_type ?? 'full-time') as 'full-time' | 'part-time' | 'intern'
                        })
                        setIsEditing(true)
                        setShowAddEmployeeForm(true)
                      }}
                    >
                      Edit
                    </button>
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
          <label htmlFor="rowsPerPage" className="text-sm text-gray-700">Rows per page</label>
          <select
            id="rowsPerPage"
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

      {/* Add Employee Floating Form */}
      {showAddEmployeeForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end transition-all duration-300 ease-in-out"
          onClick={handleOverlayClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCloseForm()
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close add employee form"
        >
          <div className={`bg-white w-[500px] h-full shadow-2xl overflow-y-auto transform transition-all duration-300 ease-in-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
            <form onSubmit={handleSubmitEmployee}>
              {/* Form Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                {/* Employee ID */}
                <div>
                  <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    value={newEmployee.id}
                    onChange={(e) => handleInputChange('id', e.target.value)}
                    placeholder="QTN-00012"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={newEmployee.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="emailAddress"
                    value={newEmployee.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="johndoe@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Make sure to enter work email</p>
                </div>

                {/* Division */}
                <div>
                  <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-2">
                    Division
                  </label>
                  <select
                    id="division"
                    value={newEmployee.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select division</option>
                    {newEmployee.division && !['Engineering','Product','Design','Marketing','Sales','HR','Finance'].includes(newEmployee.division) && (
                      <option value={newEmployee.division}>{newEmployee.division}</option>
                    )}
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <select
                    id="title"
                    value={newEmployee.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select title</option>
                    {newEmployee.title && !['CEO','CTO','Engineering Manager','Senior Developer','Developer','Junior Developer','UI/UX Designer','Product Manager','Marketing Manager','HR Manager'].includes(newEmployee.title) && (
                      <option value={newEmployee.title}>{newEmployee.title}</option>
                    )}
                    <option value="CEO">CEO</option>
                    <option value="CTO">CTO</option>
                    <option value="Engineering Manager">Engineering Manager</option>
                    <option value="Senior Developer">Senior Developer</option>
                    <option value="Developer">Developer</option>
                    <option value="Junior Developer">Junior Developer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="Product Manager">Product Manager</option>
                    <option value="Marketing Manager">Marketing Manager</option>
                    <option value="HR Manager">HR Manager</option>
                  </select>
                </div>

                {/* Position */}
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <select
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select position</option>
                    {newEmployee.position && !['CEO','Internal Ops','HR','PM','Div. Lead','Team Member'].includes(newEmployee.position) && (
                      <option value={newEmployee.position}>{newEmployee.position}</option>
                    )}
                    <option value="CEO">CEO</option>
                    <option value="Internal Ops">Internal Ops</option>
                    <option value="HR">HR</option>
                    <option value="PM">PM</option>
                    <option value="Div. Lead">Div. Lead</option>
                    <option value="Team Member">Team Member</option>
                  </select>
                </div>

                {/* Subordinates */}
                <div>
                  <label htmlFor="subordinates" className="block text-sm font-medium text-gray-400 mb-2">
                    Subordinates
                  </label>
                  <select
                    id="subordinates"
                    value={newEmployee.subordinates}
                    onChange={(e) => handleInputChange('subordinates', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-400 cursor-not-allowed"
                    disabled
                  >
                    <option value="">Select people</option>
                    <option value="none">None</option>
                    <option value="team-lead">Team Lead</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                {/* Level */}
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <select
                    id="level"
                    value={newEmployee.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select level</option>
                    {newEmployee.level && !['Entry','Junior','Mid','Senior','Lead','Principal'].includes(newEmployee.level) && (
                      <option value={newEmployee.level}>{newEmployee.level}</option>
                    )}
                    <option value="Entry">Entry</option>
                    <option value="Junior">Junior</option>
                    <option value="Mid">Mid</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Principal">Principal</option>
                  </select>
                </div>

                {/* Employment Type */}
                <div>
                  <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <select
                    id="employmentType"
                    value={newEmployee.employment_type}
                    onChange={(e) => handleInputChange('employment_type', e.target.value as 'full-time' | 'part-time' | 'intern')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    {newEmployee.employment_type && !['full-time','part-time','intern'].includes(newEmployee.employment_type) && (
                      <option value={newEmployee.employment_type}>{newEmployee.employment_type}</option>
                    )}
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>

              {/* Form Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {isEditing ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Subordinates Floating Form */}
      {showManageSubordinatesForm && selectedEmployeeForSubordinates && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex justify-end transition-all duration-300 ease-in-out"
          onClick={handleSubordinateOverlayClick}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCloseSubordinateForm()
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close manage subordinates form"
        >
          <div className={`bg-white w-[500px] h-full shadow-2xl overflow-y-auto transform transition-all duration-300 ease-in-out ${isSubordinateFormAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Form Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manage {selectedEmployeeForSubordinates.name}&apos;s Subordinates</h2>
                <p className="text-sm text-gray-500 mt-1">Add or remove subordinates for this employee</p>
              </div>
              <button
                type="button"
                onClick={handleCloseSubordinateForm}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Current Subordinates */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subordinates</h3>
              {selectedEmployeeForSubordinates.subordinates.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No subordinates assigned</p>
              ) : (
                <div className="space-y-3">
                  {getSubordinatesByIds(selectedEmployeeForSubordinates.subordinates).map((subordinate) => (
                    <div key={subordinate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full bg-cover bg-center flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(subordinate.name)}`}
                          style={{
                            backgroundImage: `url(${subordinate.avatar})`,
                            backgroundColor: subordinate.avatar ? 'transparent' : undefined
                          }}
                          role="img"
                          aria-label={`${subordinate.name}'s avatar`}
                        >
                          {!subordinate.avatar && getInitials(subordinate.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{subordinate.name}</p>
                          <p className="text-xs text-gray-500">{subordinate.email}</p>
                          <p className="text-xs text-gray-500">{subordinate.title} - {subordinate.division}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSubordinate(subordinate.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="Remove subordinate"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Subordinate */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Subordinate</h3>
              
              {/* Search Input */}
              <div className="mb-4">
                <label htmlFor="subordinateSearch" className="block text-sm font-medium text-gray-700 mb-2">
                  Search employee by name/ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    id="subordinateSearch"
                    value={subordinateSearchTerm}
                    onChange={(e) => setSubordinateSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Available Employees */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getAvailableEmployeesForSubordinate(selectedEmployeeForSubordinates.id).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full bg-cover bg-center flex items-center justify-center text-white text-sm font-medium ${getAvatarColor(employee.name)}`}
                        style={{
                          backgroundImage: `url(${employee.avatar})`,
                          backgroundColor: employee.avatar ? 'transparent' : undefined
                        }}
                        role="img"
                        aria-label={`${employee.name}'s avatar`}
                      >
                        {!employee.avatar && getInitials(employee.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.id} - {employee.email}</p>
                        <p className="text-xs text-gray-500">{employee.title} - {employee.division}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSubordinate(employee.id)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
                {getAvailableEmployeesForSubordinate(selectedEmployeeForSubordinates.id).length === 0 && subordinateSearchTerm && (
                  <p className="text-sm text-gray-500 italic text-center py-4">No employees found matching your search</p>
                )}
                {getAvailableEmployeesForSubordinate(selectedEmployeeForSubordinates.id).length === 0 && !subordinateSearchTerm && (
                  <p className="text-sm text-gray-500 italic text-center py-4">All employees are already subordinates or unavailable</p>
                )}
              </div>
            </div>

            {/* Form Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={async () => { await handleSaveSubordinateChanges() }}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default EmployeeManagement
