import {
  Folder,
  MoreHorizontal,
  ChevronRight,
  Home,
  RefreshCw,
  Plus,
  Share2,
  Search as SearchIcon,
  X as XIcon,
  FileText
} from 'lucide-react'
import { useState, useMemo, useEffect, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ShareDocumentModal from '../components/ShareDocumentModal'
import {
  getDocumentsByParentId,
  getDocumentById,
  buildBreadcrumbs,
  getActualItemCount,
  createDocument,
  deleteDocument,
  renameDocument,
  getFolderPathIds,          // <-- ADD
} from '../services/DocumentService'
import { getDocumentAccess, searchDocuments } from '../services/DocumentService' // <-- ADD
import { useAuthStore } from '../stores/authStore'
import type { DocumentItem, DocumentBreadcrumb } from '../types/documents'

function Documents(): ReactElement {
  const navigate = useNavigate()
  const { '*': currentPath } = useParams<{ '*': string }>()
  const getCurrentSession = useAuthStore((state) => state.getCurrentSession)

  // Parse current folder from URL path
  const pathSegments = currentPath?.split('/').filter(Boolean) ?? []
  const currentFolderId = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : null

  // State management
  const [searchTerm] = useState('') // local filter (tetap ada; tidak dipakai saat global search aktif)
  const [activeFilter, setActiveFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showActionsDropdown, setShowActionsDropdown] = useState<string | null>(null)
  const [itemCounts, setItemCounts] = useState<Record<string, number | null>>({})

  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null)
  const [newItemName, setNewItemName] = useState('')

  // State for loading, data, and errors
  const [currentFolder, setCurrentFolder] = useState<DocumentItem | null | undefined>(null)
  const [currentItems, setCurrentItems] = useState<DocumentItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DocumentBreadcrumb[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canEditFolder, setCanEditFolder] = useState(false)
  const [itemPermissions, setItemPermissions] = useState<Record<string, boolean>>({})

  // --- Global search states (NEW) ---
  const [globalQuery, setGlobalQuery] = useState('')
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalResults, setGlobalResults] = useState<DocumentItem[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalType, setGlobalType] = useState<'all' | 'file' | 'folder'>('all')

  // Fetch documents and current folder when currentFolderId changes
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setIsInitialLoad(true)
      try {
        // Fetch current folder and items
        const [folder, items, breadcrumbsData] = await Promise.all([
          currentFolderId ? getDocumentById(currentFolderId, null) : Promise.resolve(null),
          getDocumentsByParentId(currentFolderId),
          buildBreadcrumbs(currentFolderId ?? null),
        ])

        setCurrentFolder(folder)
        setCurrentItems(items)
        setBreadcrumbs(breadcrumbsData)

        // Fetch effective access for folder (enable/disable Share button)
        if (currentFolderId) {
          const access = await getDocumentAccess(currentFolderId).catch(() => null)
          setCanEditFolder(Boolean(access?.can_edit))
        } else {
          setCanEditFolder(false)
        }

        // Fetch item counts for each folder
        const counts: Record<string, number> = {}
        for (const item of items) {
          if (item.type === 'folder') {
            counts[item.id] = await getActualItemCount(item.id)
          }
        }
        setItemCounts(counts)

        // Fetch permissions for each item
        const permissions: Record<string, boolean> = {}
        for (const item of items) {
          try {
            const access = await getDocumentAccess(item.id)
            permissions[item.id] = Boolean(access?.can_edit)
          } catch (error) {
            // If permission check fails, default to no edit access
            permissions[item.id] = false
          }
        }
        setItemPermissions(permissions)

        setError(null) // Clear any previous errors
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching documents:', error)
        // Set empty arrays on error to prevent UI issues
        setCurrentFolder(null)
        setCurrentItems([])
        setBreadcrumbs([{ id: 'root', name: 'Documents', path: [] }])
        setItemCounts({})
        setCanEditFolder(false)
        setItemPermissions({})
        setError('Failed to load documents. Please try again.')
      } finally {
        setIsInitialLoad(false)
      }
    }

    void fetchData()
  }, [currentFolderId])

  // Global search effect (debounced)
  useEffect(() => {
    const q = globalQuery.trim()
    if (q.length < 2) {
      setGlobalResults([])
      setGlobalLoading(false)
      setGlobalError(null)
      return
    }

    setGlobalLoading(true)
    setGlobalError(null)

    const t = setTimeout(async () => {
      try {
        const types =
          globalType === 'all' ? undefined : [globalType] // ['file'] or ['folder'] or undefined
        const results = await searchDocuments(q, types, 100, 0)
        setGlobalResults(results)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('searchDocuments failed:', err)
        setGlobalError('Search failed. Please try again.')
      } finally {
        setGlobalLoading(false)
      }
    }, 300)

    return () => clearTimeout(t)
  }, [globalQuery, globalType])

  // Get unique categories for filter tabs (local listing)
  const categories = useMemo((): string[] => {
    const uniqueCategories = [...new Set(currentItems.map(item => item.category).filter(Boolean))] as string[]
    return ['All', ...uniqueCategories]
  }, [currentItems])

  // Filter and search documents (local listing)
  const filteredItems = useMemo((): DocumentItem[] => {
    let filtered = currentItems

    if (activeFilter !== 'All') {
      filtered = filtered.filter(item => item.category === activeFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ownedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [currentItems, activeFilter, searchTerm])

  // Pagination (local listing)
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage)

  // Helpers
  const getInitials = (name: string): string => name.split(' ').map(n => n[0]).join('').toUpperCase()

  const getRoleColor = (role: string): string => {
    const colors = {
      admin: 'bg-purple-500',
      manager: 'bg-green-500',
      employee: 'bg-blue-500',
      secretary: 'bg-pink-500',
    }
    return colors[role as keyof typeof colors] ?? 'bg-gray-500'
  }

  const handleItemClick = (item: DocumentItem): void => {
    if (item.type === 'folder') {
      const newPath = [...pathSegments, item.id].join('/')
      navigate(`/documents/${newPath}`)
    } else {
      navigate(`/documents/file/${item.id}`)
    }
  }

  const handleOpenSearchItem = async (item: DocumentItem): Promise<void> => {
    if (item.type === 'folder') {
      try {
        const ids = await getFolderPathIds(item.id)
        navigate(`/documents/${ids.join('/')}`)
      } catch {
        // fallback: open direct id
        navigate(`/documents/${item.id}`)
      }
    } else {
      navigate(`/documents/file/${item.id}`)
    }
  }

  const handleBreadcrumbClick = (breadcrumb: DocumentBreadcrumb): void => {
    if (breadcrumb.id === 'root') {
      navigate('/documents')
    } else {
      const newPath = [...breadcrumb.path, breadcrumb.id].join('/')
      navigate(`/documents/${newPath}`)
    }
  }

  // Helper function to refresh permissions for current items
  const refreshItemPermissions = async (items: DocumentItem[]): Promise<void> => {
    const permissions: Record<string, boolean> = {}
    for (const item of items) {
      try {
        const access = await getDocumentAccess(item.id)
        permissions[item.id] = Boolean(access?.can_edit)
      } catch (error) {
        // If permission check fails, default to no edit access
        permissions[item.id] = false
      }
    }
    setItemPermissions(permissions)
  }

  // Dropdown actions
  const handleShowActions = (itemId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setShowActionsDropdown(showActionsDropdown === itemId ? null : itemId)
  }

  const handleCreateFolder = (): void => { setShowCreateFolder(true); setNewItemName('') }
  const handleCreateFile = (): void => { setShowCreateFile(true); setNewItemName('') }

  const handleRename = (item: DocumentItem): void => {
    setSelectedItem(item)
    setNewItemName(item.name)
    setShowRenameModal(true)
    setShowActionsDropdown(null)
  }

  const handleDelete = (item: DocumentItem): void => {
    setSelectedItem(item)
    setShowDeleteModal(true)
    setShowActionsDropdown(null)
  }

  const handleShare = (item: DocumentItem): void => {
    setSelectedItem(item)
    setShowPermissionModal(true)
    setShowActionsDropdown(null)
  }

  // Create / Rename / Delete handlers omitted for brevity (unchanged from your code) ...
  // -- START: same as your current handlers --

  const handleCreateFolderSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name) return

    const validNamePattern = /^[A-Za-z0-9 _.-]+$/
    if (!validNamePattern.test(name)) {
      setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')
      return
    }

    const siblingNames = new Set(currentItems.map(i => i.name.trim().toLowerCase()))
    if (siblingNames.has(name.toLowerCase())) {
      setError('Duplicate name: an item with this name already exists in this folder.')
      return
    }

    try {
      const session = getCurrentSession()
      if (!session) { setError('Authentication required'); return }

      const authToken = `Bearer ${session.token}`
      const newFolder = await createDocument(name, 'folder', currentFolderId, authToken)

      if (newFolder) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        const counts = { ...itemCounts }
        counts[newFolder.id] = 0
        setItemCounts(counts)
        setShowCreateFolder(false)
        setNewItemName('')
        setError(null)
      } else {
        setError('Failed to create folder. Please try again.')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating folder:', error)
      setError('Failed to create folder. Please try again.')
    }
  }

  const handleCreateFileSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name) return

    const validNamePattern = /^[A-Za-z0-9 _.-]+$/
    if (!validNamePattern.test(name)) {
      setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')
      return
    }

    const siblingNames = new Set(currentItems.map(i => i.name.trim().toLowerCase()))
    if (siblingNames.has(name.toLowerCase())) {
      setError('Duplicate name: an item with this name already exists in this folder.')
      return
    }

    try {
      const session = getCurrentSession()
      if (!session) { setError('Authentication required'); return }

      const authToken = `Bearer ${session.token}`
      const newFile = await createDocument(name, 'file', currentFolderId, authToken)

      if (newFile) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        setShowCreateFile(false)
        setNewItemName('')
        setError(null)
      } else {
        setError('Failed to create file. Please try again.')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating file:', error)
      setError('Failed to create file. Please try again.')
    }
  }

  const handleRenameSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name || !selectedItem) return

    const validNamePattern = /^[A-Za-z0-9 _.-]+$/
    if (!validNamePattern.test(name)) {
      setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')
      return
    }

    const siblingNames = new Set(
      currentItems
        .filter(i => i.id !== selectedItem.id)
        .map(i => i.name.trim().toLowerCase()),
    )
    if (siblingNames.has(name.toLowerCase())) {
      setError('Duplicate name: an item with this name already exists in this folder.')
      return
    }

    try {
      const updatedItem = await renameDocument(selectedItem.id, name)
      if (updatedItem) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        setShowRenameModal(false)
        setSelectedItem(null)
        setNewItemName('')
        setError(null)
      } else {
        setError('Failed to rename item. Please try again.')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error renaming item:', error)
      setError('Failed to rename item. Please try again.')
    }
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedItem) return
    try {
      const success = await deleteDocument(selectedItem.id)
      if (success) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        if (selectedItem.type === 'folder') {
          const newCounts = { ...itemCounts }
          delete newCounts[selectedItem.id]
          setItemCounts(newCounts)
        }
        setShowDeleteModal(false)
        setSelectedItem(null)
      } else {
        setError('Failed to delete item. Please try again.')
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting item:', error)
      setError('Failed to delete item. Please try again.')
    }
  }
  // -- END same handlers --

  const formatDate = (dateString: string): string => {
    try {
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)
      if (isNaN(date.getTime())) return dateString
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      if (diffInSeconds < 0) return 'In the future'
      if (diffInSeconds < 60) return 'Just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minute${Math.floor(diffInSeconds / 60) !== 1 ? 's' : ''} ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) !== 1 ? 's' : ''} ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) !== 1 ? 's' : ''} ago`
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (): void => {
      setShowActionsDropdown(null)
    }
    document.addEventListener('click', handleClickOutside)
    return (): void => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Whether global search is active
  const isGlobalSearching = globalQuery.trim().length >= 2

  return (
    <div className="p-8">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center space-x-2 mb-6 text-sm text-gray-600">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <div key={breadcrumb.id} className="flex items-center space-x-2">
                {index > 0 && <ChevronRight className="w-4 h-4" />}
                {isLast ? (
                  <span className="text-gray-900 font-semibold flex items-center space-x-1">
                    {index === 0 && <Home className="w-4 h-4" />}
                    <span>{breadcrumb.name}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(breadcrumb)}
                    className="hover:text-blue-600 transition-colors flex items-center space-x-1"
                  >
                    {index === 0 && <Home className="w-4 h-4" />}
                    <span>{breadcrumb.name}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Header + Share + Create */}
      <div className="mb-6">
        <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            {currentFolder ? (
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4 border border-blue-100">
                  <Folder className="h-8 w-8 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold text-gray-900 truncate">{currentFolder.name}</div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>Owned by</span>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRoleColor(currentFolder.ownedBy.role)}`}
                      >
                        {currentFolder.ownedBy.avatar ?? getInitials(currentFolder.ownedBy.name)}
                      </div>
                      <span className="font-medium">{currentFolder.ownedBy.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
                <p className="text-gray-600 mt-1">Manage your documents, folders, and files in one centralized location.</p>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentFolder && (
              <button
                onClick={() => {
                  if (!currentFolder) return
                  setSelectedItem(currentFolder)
                  setShowPermissionModal(true)
                }}
                disabled={!canEditFolder}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${canEditFolder
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
            <button
              onClick={handleCreateFolder}
              className="flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Folder</span>
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search all documents and folders you can access…"
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {globalQuery && (
              <button
                onClick={() => { setGlobalQuery(''); setGlobalResults([]) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'file', 'folder'] as const).map(t => (
              <button
                key={t}
                onClick={() => setGlobalType(t)}
                className={`px-3 py-2 border text-sm rounded-md ${globalType === t ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {t === 'all' ? 'All' : t === 'file' ? 'Files' : 'Folders'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* When global search is active, show results */}
      {isGlobalSearching ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Search Results {globalLoading ? '(loading...)' : `(${globalResults.length})`}
            </h2>
          </div>

          {globalError && (
            <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700 rounded mb-4">
              {globalError}
            </div>
          )}

          {!globalLoading && globalResults.length === 0 && !globalError && (
            <div className="px-6 py-12 text-center bg-white border border-gray-200 rounded">
              <p className="text-gray-600">No results for “{globalQuery}”.</p>
            </div>
          )}

          {/* Results grid mixes folders & files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {globalResults.map(item => (
              <div
                key={item.id}
                className="relative rounded-lg border border-gray-200 bg-white hover:shadow transition cursor-pointer"
                onClick={() => { void handleOpenSearchItem(item) }}
              >
                {item.type === 'folder' ? (
                  <>
                    <div className="relative h-28 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-600 px-4 pt-3 rounded-t-lg">
                      <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-white/95 flex items-center justify-center shadow">
                        <Folder className="h-4 w-4 text-gray-700" />
                      </div>
                      <div className="mt-8 text-white font-semibold leading-snug line-clamp-2 pr-4">
                        {item.name}
                      </div>
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-500">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 mr-2">Folder</span>
                      <span className="truncate inline-block align-middle max-w-[70%]">
                        {item.path?.join(' / ') ?? '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </div>
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="mt-3 h-24 bg-gray-100 rounded" aria-hidden="true" />
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getRoleColor(item.ownedBy.role)}`}>
                            {getInitials(item.ownedBy.name)}
                          </div>
                          <span>{item.category || 'Uncategorized'}</span>
                        </div>
                        <span>{item.path?.join(' / ') ?? '—'}</span>
                      </div>
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Default listing (your original UI)
        <>
          {/* Filter Tabs */}
          <div className="flex items-center space-x-4 border-b">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveFilter(category)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeFilter === category
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Card-based layout */}
          {isInitialLoad ? (
            <div className="px-6 py-16 text-center bg-white border border-gray-200">
              <div className="flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" aria-label="Loading documents" />
                <p className="text-gray-600">Loading documents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center bg-white border border-gray-200">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4" aria-label="Error indicator">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Documents</h3>
                <p className="text-gray-500 mb-6 max-w-sm">There was an error loading your documents. Please check your connection and try again.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Page</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Folders Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Folders</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedItems.filter(i => i.type === 'folder').map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow transition cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="relative h-28 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-600 px-4 pt-3">
                        <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-white/95 flex items-center justify-center shadow">
                          <Folder className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="absolute right-4 top-9 text-xs text-white/90">
                          {(itemCounts[item.id] ?? 0)} documents
                        </div>
                        <div className="mt-8 text-white font-semibold leading-snug line-clamp-2 pr-4">
                          {item.name}
                        </div>
                      </div>
                      <div className="bg-white px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-700">Contributor:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                            {getInitials(item.ownedBy.name)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleShowActions(item.id, e)}
                        className="absolute right-2 top-2 p-1 rounded hover:bg-white/10 text-white/80 opacity-0 group-hover:opacity-100 transition"
                        aria-label={`Actions for ${item.name}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {showActionsDropdown === item.id && (
                        <div className="absolute right-2 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                          <div className="py-1">
                            <button onClick={(e) => { e.stopPropagation(); handleRename(item) }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Rename</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(item) }}
                              disabled={!itemPermissions[item.id]}
                              className={`w-full text-left px-4 py-2 text-sm ${
                                itemPermissions[item.id] 
                                  ? 'hover:bg-gray-50 text-gray-900' 
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Share
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Documents</h2>
                  <button onClick={handleCreateFile} className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
                    <Plus className="w-4 h-4" />
                    <span>Add New Document</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedItems.filter(i => i.type === 'file').map((item) => (
                    <div
                      key={item.id}
                      className="relative rounded-lg border border-gray-200 bg-white hover:shadow transition cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {item.name}
                          </div>
                          <button
                            onClick={(e) => handleShowActions(item.id, e)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label={`Actions for ${item.name}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-3 h-28 bg-gray-100 rounded-md" aria-hidden="true" />
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getRoleColor(item.ownedBy.role)}`}>{getInitials(item.ownedBy.name)}</div>
                            <span>Created by {item.ownedBy.name}</span>
                          </div>
                          <span>Updated {formatDate(item.lastModified)}</span>
                        </div>
                      </div>
                      {showActionsDropdown === item.id && (
                        <div className="absolute right-2 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                          <div className="py-1">
                            <button onClick={(e) => { e.stopPropagation(); handleRename(item) }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Rename</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(item) }}
                              disabled={!itemPermissions[item.id]}
                              className={`w-full text-left px-4 py-2 text-sm ${
                                itemPermissions[item.id] 
                                  ? 'hover:bg-gray-50 text-gray-900' 
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Share
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                    {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredItems.length)} of {filteredItems.length} rows
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
            </>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
            <form onSubmit={(e) => { void handleCreateFolderSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateFile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Document</h3>
            <form onSubmit={(e) => { void handleCreateFileSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter document name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateFile(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenameModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Rename {selectedItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <form onSubmit={(e) => { void handleRenameSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedItem.type === 'folder' ? 'Folder' : 'File'} Name
                </label>
                <input
                  type="text"
                  id="itemName"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete {selectedItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{selectedItem.name}&quot;?
              {selectedItem.type === 'folder' && ' This will also delete all items inside this folder.'}{' '}
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleDeleteConfirm() }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && selectedItem && (
        <ShareDocumentModal
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          documentId={selectedItem.id}
          documentName={selectedItem.name}
        />
      )}
    </div>
  )
}

export default Documents
