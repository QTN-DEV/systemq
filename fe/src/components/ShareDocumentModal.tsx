import { 
  X, 
  Search, 
  Link, 
  Users,
  Building2
} from 'lucide-react'
import { useState, useEffect, useCallback, type ReactElement } from 'react'

import { 
  getDocumentPermissions,
  addUserPermission,
  addDivisionPermission,
  removeUserPermission,
  removeDivisionPermission,
  searchForPermissions,
  type SearchResult
} from '../services/DocumentService'
import type { 
  DocumentPermissions, 
  PermissionLevel
} from '../types/document-permissions'
import { validatePermissionInheritance, getHighestAncestorPermission } from '../utils/permissionValidation'

interface ShareDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentName: string
}

function ShareDocumentModal({ isOpen, onClose, documentId, documentName }: ShareDocumentModalProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [permissions, setPermissions] = useState<DocumentPermissions>({
    user_permissions: [],
    division_permissions: []
  })
  const [, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userAncestorPermissions, setUserAncestorPermissions] = useState<Record<string, PermissionLevel | null>>({})

  // Load permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async (): Promise<void> => {
        setIsLoading(true)
        setError(null)
        try {
          const permissionsData = await getDocumentPermissions(documentId)
          if (permissionsData) {
            setPermissions(permissionsData)
            
            // Load ancestor permissions for all users
            const ancestorPermissions: Record<string, PermissionLevel | null> = {}
            for (const userPermission of permissionsData.user_permissions) {
              const highestPermission = await getHighestAncestorPermission(userPermission.user_id, documentId)
              ancestorPermissions[userPermission.user_id] = highestPermission
            }
            setUserAncestorPermissions(ancestorPermissions)
          }
        } catch (err) {
          setError('Failed to load permissions data')
          // eslint-disable-next-line no-console
          console.error('Error loading permissions:', err)
        } finally {
          setIsLoading(false)
        }
      }
      void loadData()
    }
  }, [isOpen, documentId])

  // Search with debounce using the new typed search function
  const searchDebounced = useCallback(
    async (query: string): Promise<void> => {
      if (!query.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchForPermissions(query)
        setSearchResults(results)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error searching:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    []
  )

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      void searchDebounced(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, searchDebounced])

  const handleAddUserPermission = async (user: SearchResult): Promise<void> => {
    if (user.type !== 'user') return

    try {
      // Check if user already has higher permissions in ancestor folders
      const highestAncestorPermission = await getHighestAncestorPermission(user.id, documentId)
      
      if (highestAncestorPermission && highestAncestorPermission === 'editor') {
        setError(`${user.name} has editor access in their ancestor folder. Cannot assign viewer access.`)
        return
      }
      
      const success = await addUserPermission(documentId, {
        user_id: user.id,
        user_name: user.name,
        user_email: user.email || '',
        permission: 'viewer'
      })

      if (success) {
        setPermissions(prev => ({
          ...prev,
          user_permissions: [...prev.user_permissions, {
            user_id: user.id,
            user_name: user.name,
            user_email: user.email || '',
            permission: 'viewer'
          }]
        }))
        setSearchQuery('')
        setSearchResults([])
        setError(null) // Clear any previous errors
      }
    } catch (err) {
      setError('Failed to add user permission')
      // eslint-disable-next-line no-console
      console.error('Error adding user permission:', err)
    }
  }

  const handleAddDivisionPermission = async (division: SearchResult): Promise<void> => {
    if (division.type !== 'division') return

    try {
      const success = await addDivisionPermission(documentId, {
        division: division.id,
        permission: 'viewer'
      })

      if (success) {
        setPermissions(prev => ({
          ...prev,
          division_permissions: [...prev.division_permissions, {
            division: division.id,
            permission: 'viewer'
          }]
        }))
        setSearchQuery('')
        setSearchResults([])
      }
    } catch (err) {
      setError('Failed to add division permission')
      // eslint-disable-next-line no-console
      console.error('Error adding division permission:', err)
    }
  }

  const handleRemoveUserPermission = async (userId: string): Promise<void> => {
    try {
      const success = await removeUserPermission(documentId, userId)
      if (success) {
        setPermissions(prev => ({
          ...prev,
          user_permissions: prev.user_permissions.filter(p => p.user_id !== userId)
        }))
      }
    } catch (err) {
      setError('Failed to remove user permission')
      // eslint-disable-next-line no-console
      console.error('Error removing user permission:', err)
    }
  }

  const handleRemoveDivisionPermission = async (division: string): Promise<void> => {
    try {
      const success = await removeDivisionPermission(documentId, division)
      if (success) {
        setPermissions(prev => ({
          ...prev,
          division_permissions: prev.division_permissions.filter(p => p.division !== division)
        }))
      }
    } catch (err) {
      setError('Failed to remove division permission')
      // eslint-disable-next-line no-console
      console.error('Error removing division permission:', err)
    }
  }

  const handlePermissionChange = async (
    type: 'user' | 'division',
    id: string,
    newPermission: PermissionLevel
  ): Promise<void> => {
    try {
      if (type === 'user') {
        // Validate permission inheritance for users
        const validation = await validatePermissionInheritance(id, documentId, newPermission)
        
        if (!validation.isValid && validation.conflictDetails) {
          setError(validation.conflictDetails.message)
          return
        }
        
        // For users, we need to remove and re-add with new permission
        const user = permissions.user_permissions.find(p => p.user_id === id)
        if (user) {
          await removeUserPermission(documentId, id)
          await addUserPermission(documentId, {
            user_id: user.user_id,
            user_name: user.user_name,
            user_email: user.user_email,
            permission: newPermission
          })
          
          setPermissions(prev => ({
            ...prev,
            user_permissions: prev.user_permissions.map(p => 
              p.user_id === id ? { ...p, permission: newPermission } : p
            )
          }))
        }
      } else {
        // For divisions, we need to remove and re-add with new permission
        await removeDivisionPermission(documentId, id)
        await addDivisionPermission(documentId, {
          division: id,
          permission: newPermission
        })
        
        setPermissions(prev => ({
          ...prev,
          division_permissions: prev.division_permissions.map(p => 
            p.division === id ? { ...p, permission: newPermission } : p
          )
        }))
      }
      
      // Clear any previous errors on successful update
      setError(null)
    } catch (err) {
      setError('Failed to update permission')
      // eslint-disable-next-line no-console
      console.error('Error updating permission:', err)
    }
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }


  const copyDocumentLink = async (): Promise<void> => {
    try {
      const link = `${window.location.origin}/documents/file/${documentId}`
      await navigator.clipboard.writeText(link)
      // You could add a toast notification here
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy link:', err)
    }
  }

  if (!isOpen) return <></>

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Share Document</h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Search Section */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Add people or divisions
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or division..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      {result.type === 'user' ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {result.avatar ? (
                              <img src={result.avatar} alt={result.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              getInitials(result.name)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">{result.email}</p>
                            {result.division && (
                              <p className="text-xs text-gray-400">{result.division} • {result.position}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">Division</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (result.type === 'user') {
                          void handleAddUserPermission(result)
                        } else {
                          void handleAddDivisionPermission(result)
                        }
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Permissions */}
          <div className="space-y-4">
            {/* User Permissions */}
            {permissions.user_permissions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  People with access ({permissions.user_permissions.length})
                </h3>
                <div className="space-y-2">
                  {permissions.user_permissions.map((permission) => {
                    const ancestorPermission = userAncestorPermissions[permission.user_id]
                    const hasHigherAncestorPermission = ancestorPermission === 'editor'
                    
                    return (
                      <div key={permission.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {getInitials(permission.user_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{permission.user_name}</p>
                            <p className="text-xs text-gray-500">{permission.user_email}</p>
                            {hasHigherAncestorPermission && (
                              <p className="text-xs text-amber-600 font-medium">
                                Has editor access in ancestor folder
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={permission.permission}
                            onChange={(e) => handlePermissionChange('user', permission.user_id, e.target.value as PermissionLevel)}
                            disabled={hasHigherAncestorPermission && permission.permission === 'viewer'}
                            className={`text-sm border border-gray-300 rounded px-2 py-1 ${
                              hasHigherAncestorPermission && permission.permission === 'viewer' 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                : ''
                            }`}
                          >
                            <option value="viewer" disabled={hasHigherAncestorPermission}>
                              Viewer
                            </option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            onClick={() => handleRemoveUserPermission(permission.user_id)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Division Permissions */}
            {permissions.division_permissions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Divisions with access ({permissions.division_permissions.length})
                </h3>
                <div className="space-y-2">
                  {permissions.division_permissions.map((permission) => (
                    <div key={permission.division} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{permission.division}</p>
                          <p className="text-xs text-gray-500">Division</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={permission.permission}
                          onChange={(e) => handlePermissionChange('division', permission.division, e.target.value as PermissionLevel)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => handleRemoveDivisionPermission(permission.division)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No permissions message */}
            {permissions.user_permissions.length === 0 && permissions.division_permissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No one has access to this document yet.</p>
                <p className="text-xs mt-1">Search above to add people or divisions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={copyDocumentLink}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Link className="w-4 h-4" />
            <span className="text-sm">Copy link</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareDocumentModal
