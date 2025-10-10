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
  FileText,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ShareDocumentModal from '../components/ShareDocumentModal'
import MoveDocumentModal from '../components/MoveDocumentModal'
import {
  getDocumentsByParentId,
  getDocumentById,
  buildBreadcrumbs,
  getActualItemCount,
  createDocument,
  deleteDocument,
  renameDocument,
  getFolderPathIds,
} from '../services/DocumentService'
import { getDocumentAccess, searchDocuments } from '../services/DocumentService'
import { useAuthStore } from '../stores/authStore'
import type { DocumentItem, DocumentBreadcrumb } from '../types/documents'

function Documents(): ReactElement {
  const navigate = useNavigate()
  const { '*': currentPath } = useParams<{ '*': string }>()
  const getCurrentSession = useAuthStore((state) => state.getCurrentSession)
  const currentUser = useAuthStore((state) => state.user)

  const pathSegments = currentPath?.split('/').filter(Boolean) ?? []
  const isSharedView = pathSegments[0] === 'shared'
  const effectiveSegments = isSharedView ? pathSegments.slice(1) : pathSegments
  const currentFolderId =
    effectiveSegments.length > 0
      ? effectiveSegments[effectiveSegments.length - 1]
      : null

  // basic state
  const [searchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [showActionsDropdown, setShowActionsDropdown] = useState<string | null>(null)
  const [itemCounts, setItemCounts] = useState<Record<string, number | null>>({})

  // modals
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null)
  const [newItemName, setNewItemName] = useState('')

  // contributors UI state
  const [showContributors, setShowContributors] = useState(false)
  const [contributorsLoading, setContributorsLoading] = useState(false)
  const [contributorsError, setContributorsError] = useState<string | null>(null)
  const [contributorsList, setContributorsList] = useState<string[]>([])
  const [contributorsForName, setContributorsForName] = useState<string>('')

  // data/error
  const [currentFolder, setCurrentFolder] = useState<DocumentItem | null | undefined>(null)
  const [currentItems, setCurrentItems] = useState<DocumentItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DocumentBreadcrumb[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canEditFolder, setCanEditFolder] = useState(false)
  const [itemPermissions, setItemPermissions] = useState<Record<string, boolean>>({})
  const [contributorsMap, setContributorsMap] = useState<Record<string, string[]>>({})

  // global search
  const [globalQuery, setGlobalQuery] = useState('')
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalResults, setGlobalResults] = useState<DocumentItem[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  // owner check (null-safe)
  const isOwner = (item: DocumentItem): boolean =>
    Boolean(currentUser?.id && item.ownedBy?.id === currentUser.id)

  // mounted guard (hindari setState setelah unmount)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // load folder + items
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setIsInitialLoad(true)
      try {
        const [folder, items, breadcrumbsData] = await Promise.all([
          currentFolderId ? getDocumentById(currentFolderId, null) : Promise.resolve(null),
          getDocumentsByParentId(currentFolderId),
          buildBreadcrumbs(currentFolderId ?? null),
        ])

        if (!mountedRef.current) return
        setCurrentFolder(folder)
        setCurrentItems(items)
        setBreadcrumbs(breadcrumbsData)

        if (currentFolderId) {
          const access = await getDocumentAccess(currentFolderId).catch(() => null)
          if (!mountedRef.current) return
          setCanEditFolder(Boolean(access?.can_edit))
        } else {
          setCanEditFolder(false)
        }

        // counts per folder
        const counts: Record<string, number> = {}
        for (const item of items) {
          if (item.type === 'folder') {
            try {
              counts[item.id] = await getActualItemCount(item.id)
            } catch {
              counts[item.id] = 0
            }
          }
        }
        if (!mountedRef.current) return
        setItemCounts(counts)

        // permissions per item
        const permissions: Record<string, boolean> = {}
        for (const item of items) {
          try {
            const access = await getDocumentAccess(item.id)
            permissions[item.id] = Boolean(access?.can_edit)
          } catch {
            permissions[item.id] = false
          }
        }
        if (!mountedRef.current) return
        setItemPermissions(permissions)

        setError(null)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching documents:', err)
        if (!mountedRef.current) return
        setCurrentFolder(null)
        setCurrentItems([])
        setBreadcrumbs([{ id: 'root', name: 'Documents', path: [] }])
        setItemCounts({})
        setCanEditFolder(false)
        setItemPermissions({})
        setError('Failed to load documents. Please try again.')
      } finally {
        if (mountedRef.current) setIsInitialLoad(false)
      }
    }

    void fetchData()
  }, [currentFolderId])

  // prefetch contributors (My & Shared)
  const prefetchContributors = useMemo(() => {
    return async (items: DocumentItem[]): Promise<void> => {
      const folders = items.filter((i) => i.type === 'folder')
      if (folders.length === 0) return
      const { getDocumentPermissions } = await import('../services/DocumentService')
      const entries: Array<[string, string[]]> = []
      for (const f of folders) {
        try {
          const perms = await getDocumentPermissions(f.id)
          const names: string[] = []

          const ownerName = f.ownedBy?.name ?? 'Owner'
          names.push(ownerName)

          if (perms) {
            perms.user_permissions
              ?.filter((u: any) => u?.permission === 'editor' && u?.user_name)
              ?.forEach((u: any) => names.push(String(u.user_name)))

            // masukkan division editor juga
            perms.division_permissions
              ?.filter((d: any) => d?.permission === 'editor' && d?.division)
              ?.forEach((d: any) => names.push(String(d.division)))
          }

          // unik & bersih
          const cleaned = Array.from(new Set(names.filter(Boolean)))
          entries.push([f.id, cleaned])
        } catch {
          entries.push([f.id, [f.ownedBy?.name ?? 'Owner']])
        }
      }
      if (!mountedRef.current) return
      setContributorsMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    }
  }, [])

  // debounce global search
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
        const results = await searchDocuments(q, undefined, 100, 0)
        if (mountedRef.current) setGlobalResults(results)
      } catch (err) {
        console.error('searchDocuments failed:', err)
        if (mountedRef.current) setGlobalError('Search failed. Please try again.')
      } finally {
        if (mountedRef.current) setGlobalLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [globalQuery])

  // data untuk view
  const displayItems = useMemo(() => {
    if (!currentUser) return currentItems
    const myId = currentUser.id
    return isSharedView
      ? currentItems.filter((i) => i.ownedBy?.id !== myId)
      : currentItems.filter((i) => i.ownedBy?.id === myId)
  }, [currentItems, currentUser, isSharedView])

  // kategori
  const categories = useMemo((): string[] => {
    const uniqueCategories = [
      ...new Set(displayItems.map((item) => item.category).filter(Boolean)),
    ] as string[]
    return ['All', ...uniqueCategories]
  }, [displayItems])

  // filter lokal
  const filteredItems = useMemo((): DocumentItem[] => {
    let filtered = displayItems
    if (activeFilter !== 'All') {
      filtered = filtered.filter((item) => item.category === activeFilter)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.ownedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    return filtered
  }, [displayItems, activeFilter, searchTerm])

  // pagination
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, startIndex + rowsPerPage),
    [filteredItems, startIndex, rowsPerPage],
  )

  // dedupe prefetch
  const fetchedContribIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const toFetch = paginatedItems.filter(
      (i) => i.type === 'folder' && !fetchedContribIdsRef.current.has(i.id),
    )
    if (toFetch.length === 0) return
    toFetch.forEach((i) => fetchedContribIdsRef.current.add(i.id))
    void prefetchContributors(toFetch)
  }, [paginatedItems, prefetchContributors])

  // helpers
  const getInitials = (name: string): string =>
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '•'

  const getRoleColor = (role: string | undefined): string => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500',
      manager: 'bg-green-500',
      employee: 'bg-blue-500',
      secretary: 'bg-pink-500',
    }
    return (role && colors[role]) || 'bg-gray-500'
  }

  const avatarColors = [
    'bg-fuchsia-500', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-violet-500',
    'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-lime-500', 'bg-orange-500',
  ]
  const colorForName = (name: string | undefined | null): string => {
    const n = String(name ?? '')
    let h = 0
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
    return avatarColors[(h || 0) % avatarColors.length]
  }

  const openContributors = (e: React.MouseEvent, item: DocumentItem): void => {
    e.stopPropagation()
    const names = (contributorsMap[item.id] ?? [item.ownedBy?.name ?? 'Owner'])
      .filter(Boolean)
      .map(String)
    setContributorsForName(item.name)
    setContributorsList(names)
    setContributorsError(null)
    setContributorsLoading(false)
    setShowContributors(true)
  }

  const handleItemClick = (item: DocumentItem): void => {
    if (item.type === 'folder') {
      const newSegments = [...effectiveSegments, item.id]
      const prefix = isSharedView ? 'shared/' : ''
      navigate(`/documents/${prefix}${newSegments.join('/')}`)
    } else {
      const viewParam = isSharedView ? '?view=shared' : ''
      navigate(`/documents/file/${item.id}${viewParam}`)
    }
  }

  const handleOpenSearchItem = async (item: DocumentItem): Promise<void> => {
    if (item.type === 'folder') {
      try {
        const ids = await getFolderPathIds(item.id)
        navigate(`/documents/${ids.join('/')}`)
      } catch {
        navigate(`/documents/${item.id}`)
      }
    } else {
      navigate(`/documents/file/${item.id}`)
    }
  }

  const handleBreadcrumbClick = (breadcrumb: DocumentBreadcrumb): void => {
    if (breadcrumb.id === 'root') {
      navigate(isSharedView ? '/documents/shared' : '/documents')
    } else {
      const newPath = [...breadcrumb.path, breadcrumb.id].join('/')
      const prefix = isSharedView ? 'shared/' : ''
      navigate(`/documents/${prefix}${newPath}`)
    }
  }

  const refreshItemPermissions = async (items: DocumentItem[]): Promise<void> => {
    const permissions: Record<string, boolean> = {}
    for (const item of items) {
      try {
        const access = await getDocumentAccess(item.id)
        permissions[item.id] = Boolean(access?.can_edit)
      } catch {
        permissions[item.id] = false
      }
    }
    setItemPermissions(permissions)
  }

  const handleShowActions = (itemId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setShowActionsDropdown(showActionsDropdown === itemId ? null : itemId)
  }

  const handleCreateFolder = (): void => { setShowCreateFolder(true); setNewItemName('') }
  const handleCreateFile = (): void => { setShowCreateFile(true); setNewItemName('') }

  const handleRename = (item: DocumentItem): void => {
    setSelectedItem(item); setNewItemName(item.name); setShowRenameModal(true); setShowActionsDropdown(null)
  }
  const handleDelete = (item: DocumentItem): void => { if (!isOwner(item)) return; setSelectedItem(item); setShowDeleteModal(true); setShowActionsDropdown(null) }
  const handleShare = (item: DocumentItem): void => { setSelectedItem(item); setShowPermissionModal(true); setShowActionsDropdown(null) }
  const handleMove = (item: DocumentItem): void => { if (!isOwner(item)) return; setSelectedItem(item); setShowMoveModal(true); setShowActionsDropdown(null) }

  // create/rename/delete
  const validName = (n: string) => /^[A-Za-z0-9 _.-]+$/.test(n)

  const handleCreateFolderSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name || !validName(name)) return setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')

    const siblingNames = new Set(currentItems.map((i) => i.name.trim().toLowerCase()))
    if (siblingNames.has(name.toLowerCase())) return setError('Duplicate name: an item with this name already exists in this folder.')

    try {
      const session = getCurrentSession()
      if (!session) return setError('Authentication required')
      const authToken = `Bearer ${session.token}`
      const newFolder = await createDocument(name, 'folder', currentFolderId, authToken)
      if (newFolder) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        setItemCounts((prev) => ({ ...prev, [newFolder.id]: 0 }))
        setShowCreateFolder(false); setNewItemName(''); setError(null)
      } else setError('Failed to create folder. Please try again.')
    } catch (err) {
      console.error('Error creating folder:', err)
      setError('Failed to create folder. Please try again.')
    }
  }

  const handleCreateFileSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name || !validName(name)) return setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')

    const siblingNames = new Set(currentItems.map((i) => i.name.trim().toLowerCase()))
    if (siblingNames.has(name.toLowerCase())) return setError('Duplicate name: an item with this name already exists in this folder.')

    try {
      const session = getCurrentSession()
      if (!session) return setError('Authentication required')
      const authToken = `Bearer ${session.token}`
      const newFile = await createDocument(name, 'file', currentFolderId, authToken)
      if (newFile) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        setShowCreateFile(false); setNewItemName(''); setError(null)
      } else setError('Failed to create file. Please try again.')
    } catch (err) {
      console.error('Error creating file:', err)
      setError('Failed to create file. Please try again.')
    }
  }

  const handleRenameSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const name = newItemName.trim()
    if (!name || !selectedItem || !validName(name)) return setError('Invalid name: only letters, numbers, spaces, dot (.), hyphen (-), and underscore (_) are allowed.')

    const siblingNames = new Set(
      currentItems.filter((i) => i.id !== selectedItem.id).map((i) => i.name.trim().toLowerCase()),
    )
    if (siblingNames.has(name.toLowerCase())) return setError('Duplicate name: an item with this name already exists in this folder.')

    try {
      const updatedItem = await renameDocument(selectedItem.id, name)
      if (updatedItem) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        setShowRenameModal(false); setSelectedItem(null); setNewItemName(''); setError(null)
      } else setError('Failed to rename item. Please try again.')
    } catch (err) {
      console.error('Error renaming item:', err)
      setError('Failed to rename item. Please try again.')
    }
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedItem) return
    if (!isOwner(selectedItem)) {
      setError('Only the owner can delete this item.')
      setShowDeleteModal(false); setSelectedItem(null)
      return
    }
    try {
      const success = await deleteDocument(selectedItem.id)
      if (success) {
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)
        await refreshItemPermissions(updatedItems)
        if (selectedItem.type === 'folder') {
          setItemCounts((prev) => {
            const next = { ...prev }; delete next[selectedItem.id]; return next
          })
        }
        setShowDeleteModal(false); setSelectedItem(null)
      } else setError('Failed to delete item. Please try again.')
    } catch (err) {
      console.error('Error deleting item:', err)
      setError('Failed to delete item. Please try again.')
    }
  }

  const formatDate = (dateString: string): string => {
    try {
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)
      if (isNaN(date.getTime())) return dateString
      const now = new Date()
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
      if (diff < 0) return 'In the future'
      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`
      if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    const handleClickOutside = (): void => setShowActionsDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return (): void => document.removeEventListener('click', handleClickOutside)
  }, [])

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

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
          <div className="min-w-0">
            {currentFolder ? (
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4 border border-blue-100">
                  <Folder className="h-8 w-8 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-semibold text-gray-900 truncate">
                    {currentFolder.name}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>Owned by</span>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRoleColor(
                          currentFolder.ownedBy?.role,
                        )}`}
                      >
                        {getInitials(currentFolder.ownedBy?.name ?? '')}
                      </div>
                      <span className="font-medium">{currentFolder.ownedBy?.name ?? 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
                <p className="text-gray-600 mt-1">
                  Manage your documents, folders, and files in one centralized location.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {currentFolder && (
              <button
                onClick={() => { if (!currentFolder) return; setSelectedItem(currentFolder); setShowPermissionModal(true) }}
                disabled={!canEditFolder}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${canEditFolder ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            )}
            {!isSharedView && (
              <button
                onClick={handleCreateFolder}
                className="flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Folder</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between border-b mb-4">
        <div className="flex items-center space-x-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => { setActiveFilter(category); setCurrentPage(1) }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeFilter === category ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="relative ml-4 mb-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            placeholder="Search"
            className="w-[260px] pl-9 pr-9 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Global search results */}
      {globalQuery.trim().length >= 2 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Search Results {globalLoading ? '(loading...)' : `(${globalResults.length})`}
            </h2>
          </div>

          {globalError && (
            <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700 rounded mb-4">{globalError}</div>
          )}

          {!globalLoading && globalResults.length === 0 && !globalError && (
            <div className="px-6 py-12 text-center bg-white border border-gray-200 rounded">
              <p className="text-gray-600">No results for “{globalQuery}”.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {globalResults.map((item) => (
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
                      {isSharedView && (
                        <div
                          className={`absolute left-3 bottom-3 text-[10px] px-2 py-0.5 rounded-full font-medium shadow ${itemPermissions[item.id] ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                        >
                          {itemPermissions[item.id] ? 'Editor' : 'Viewer'}
                        </div>
                      )}
                      <div className="absolute right-4 top-9 text-xs text-white/90">
                        {(itemCounts[item.id] ?? 0)} documents
                      </div>
                      <div className="mt-8 text-white font-semibold leading-snug line-clamp-2 pr-4">
                        {item.name}
                      </div>
                    </div>
                    <div className="px-4 py-3 text-xs text-gray-500">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 mr-2">Folder</span>
                      <span className="truncate inline-block align-middle max-w-[70%]">{item.path?.join(' / ') ?? '—'}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</div>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="mt-3 h-24 bg-gray-100 rounded" aria-hidden="true" />
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getRoleColor(item.ownedBy?.role)}`}>
                          {getInitials(item.ownedBy?.name ?? '')}
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
        // default listing
        <>
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
                <button onClick={() => window.location.reload()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Page</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Folders */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Folders</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedItems.filter((i) => i.type === 'folder').map((item) => {
                    const showDots = !isSharedView || itemPermissions[item.id] || isOwner(item)
                    const showBadge = isSharedView
                    const names = (contributorsMap[item.id] ?? [item.ownedBy?.name ?? 'Owner']).filter(Boolean).map(String)
                    const maxCircles = 3
                    const visible = names.slice(0, maxCircles)
                    const extra = Math.max(0, names.length - maxCircles)

                    return (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-gray-200 bg-white hover:shadow transition cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative h-28 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-600 px-4 pt-3 rounded-t-xl">
                          <div className="absolute left-3 top-3 h-7 w-7 rounded-full bg-white/95 flex items-center justify-center shadow">
                            <Folder className="h-4 w-4 text-gray-700" />
                          </div>

                          {showDots && (
                            <button
                              onClick={(e) => handleShowActions(item.id, e)}
                              className="absolute right-2 top-2 p-1 rounded hover:bg-white/10 text-white/80 transition"
                              aria-label={`Actions for ${item.name}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          )}

                          {showBadge && (
                            <div
                              className={`absolute ${showDots ? 'right-10' : 'right-2'} top-2 text-[10px] px-2 py-0.5 rounded-full font-medium shadow ${itemPermissions[item.id] ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}
                            >
                              {itemPermissions[item.id] ? 'Editor' : 'Viewer'}
                            </div>
                          )}

                          <div className="mt-8 text-white font-semibold leading-snug line-clamp-2 pr-4">
                            {item.name}
                          </div>
                          <div className="mt-1 text-xs text-white/70">
                            {(itemCounts[item.id] ?? 0)} items
                          </div>
                        </div>

                        {/* Contributors footer */}
                        <button
                          onClick={(e) => openContributors(e, item)}
                          className="w-full bg-white px-4 py-3 flex items-center justify-between rounded-b-xl hover:bg-gray-50 transition text-left"
                          aria-label={`Open contributors for ${item.name}`}
                        >
                          <div className="text-sm text-gray-700 flex items-center">
                            <span className="font-medium">Contributors</span>
                            <span className="ml-1">:</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {visible.map((n, idx) => (
                              <div
                                key={`${item.id}-chip-${idx}`}
                                className={`w-6 h-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shadow ${colorForName(n)}`}
                                title={n}
                              >
                                {getInitials(n)}
                              </div>
                            ))}
                            {extra > 0 && (
                              <div className="px-2 h-6 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold flex items-center justify-center border border-gray-200" title={`${extra} more`}>
                                +{extra}
                              </div>
                            )}
                          </div>
                        </button>

                        {/* 3-dots dropdown */}
                        {showDots && showActionsDropdown === item.id && (
                          <div className="absolute right-2 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                            <div className="py-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRename(item) }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                              >
                                Rename
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMove(item) }}
                                disabled={!isOwner(item)}
                                title={!isOwner(item) ? 'Only the owner can move this item' : undefined}
                                className={`w-full text-left px-4 py-2 text-sm ${isOwner(item) ? 'hover:bg-gray-50 text-gray-900' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Move to Folder
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (isOwner(item)) handleDelete(item) }}
                                disabled={!isOwner(item)}
                                title={!isOwner(item) ? 'Only the owner can delete' : undefined}
                                className={`w-full text-left px-4 py-2 text-sm ${isOwner(item) ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShare(item) }}
                                disabled={!itemPermissions[item.id]}
                                className={`w-full text-left px-4 py-2 text-sm ${itemPermissions[item.id] ? 'hover:bg-gray-50 text-gray-900' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Share
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Files */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Documents</h2>
                  {!isSharedView && (
                    <button
                      onClick={handleCreateFile}
                      className="hidden sm:inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Document</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedItems.filter((i) => i.type === 'file').map((item) => {
                    const showDots = !isSharedView || itemPermissions[item.id] || isOwner(item)
                    const showBadge = isSharedView

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-lg border border-gray-200 bg-white hover:shadow transition cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="p-4 pb-0">
                          <div className="relative">
                            <div className="flex items-center space-x-2">
                              <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-gray-600" />
                              </div>
                            </div>

                            {showDots && (
                              <button
                                onClick={(e) => handleShowActions(item.id, e)}
                                className="absolute right-2 top-0 p-1 rounded hover:bg-gray-100 text-gray-600"
                                aria-label={`Actions for ${item.name}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            )}
                            {showBadge && (
                              <div
                                className={`absolute ${showDots ? 'right-10' : 'right-2'} top-0 text-[10px] px-2 py-0.5 rounded-full font-medium shadow ${itemPermissions[item.id] ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                  }`}
                              >
                                {itemPermissions[item.id] ? 'Editor' : 'Viewer'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-4 pt-2">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                            {item.name}
                          </div>
                          <div className="text-xs text-gray-500 mb-3">
                            Last edited {formatDate(item.lastModified)}
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center space-x-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${getRoleColor(item.ownedBy?.role)}`}>
                                {getInitials(item.ownedBy?.name ?? '')}
                              </div>
                              <span>
                                Created by{' '}
                                <span className="font-medium text-gray-700">{item.ownedBy?.name ?? 'Unknown'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {showDots && showActionsDropdown === item.id && (
                          <div className="absolute right-2 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                            <div className="py-1">
                              <button onClick={(e) => { e.stopPropagation(); handleRename(item) }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Rename</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMove(item) }}
                                disabled={!isOwner(item)}
                                title={!isOwner(item) ? 'Only the owner can move this item' : undefined}
                                className={`w-full text-left px-4 py-2 text-sm ${isOwner(item) ? 'hover:bg-gray-50 text-gray-900' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Move to Folder
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (isOwner(item)) handleDelete(item) }}
                                disabled={!isOwner(item)}
                                title={!isOwner(item) ? 'Only the owner can delete' : undefined}
                                className={`w-full text-left px-4 py-2 text-sm ${isOwner(item) ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Delete
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShare(item) }}
                                disabled={!itemPermissions[item.id]}
                                className={`w-full text-left px-4 py-2 text-sm ${itemPermissions[item.id] ? 'hover:bg-gray-50 text-gray-900' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                Share
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center space-x-2">
                  <label htmlFor="rowsPerPage" className="text-sm text-gray-700">Rows per page</label>
                  <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}
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
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    &lt;
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm border ${currentPage === page ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                    )
                  })}

                  {totalPages > 5 && (
                    <>
                      <span className="text-sm text-gray-500">...</span>
                      <button onClick={() => setCurrentPage(totalPages)} className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50">
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Contributors Modal */}
      {showContributors && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-xl shadow-2xl w-[460px] max-w-[92vw]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contributors</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {contributorsList.length} contributor{contributorsList.length !== 1 ? 's' : ''} · {contributorsForName}
                </p>
              </div>
              <button onClick={() => setShowContributors(false)} className="text-gray-400 hover:text-gray-600 rounded p-1" aria-label="Close">✕</button>
            </div>

            {contributorsList.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                {contributorsList.slice(0, 6).map((n, i) => (
                  <div key={`preview-${i}`} className={`w-7 h-7 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shadow ${colorForName(n)}`} title={n}>
                    {getInitials(n)}
                  </div>
                ))}
                {contributorsList.length > 6 && (
                  <div className="px-2 h-7 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold flex items-center justify-center border border-gray-200">
                    +{contributorsList.length - 6}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              {contributorsLoading && <div className="text-sm text-gray-600">Loading...</div>}
              {contributorsError && <div className="text-sm text-red-600">{contributorsError}</div>}

              {!contributorsLoading && !contributorsError && (
                <ul className="space-y-2 max-h-[50vh] overflow-auto pr-1">
                  {contributorsList.length === 0 ? (
                    <li className="text-sm text-gray-600">No contributors.</li>
                  ) : (
                    contributorsList.map((n, i) => (
                      <li key={`${n}-${i}`} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center ${colorForName(n)}`}>
                          {getInitials(n)}
                        </div>
                        <span className="text-sm text-gray-800">{n}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowContributors(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* other modals */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Folder</h3>
            <form onSubmit={(e) => { void handleCreateFolderSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">Folder Name</label>
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
                <button type="button" onClick={() => setShowCreateFolder(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Folder</button>
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
                <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
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
                <button type="button" onClick={() => setShowCreateFile(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenameModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rename {selectedItem.type === 'folder' ? 'Folder' : 'File'}</h3>
            <form onSubmit={(e) => { void handleRenameSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">{selectedItem.type === 'folder' ? 'Folder' : 'File'} Name</label>
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
                <button type="button" onClick={() => setShowRenameModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Rename</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete {selectedItem.type === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{selectedItem.name}&quot;?
              {selectedItem.type === 'folder' && ' This will also delete all items inside this folder.'} This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={() => { void handleDeleteConfirm() }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPermissionModal && selectedItem && (
        <ShareDocumentModal
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          documentId={selectedItem.id}
          documentName={selectedItem.name}
        />
      )}

      {showMoveModal && selectedItem && (
        <MoveDocumentModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          documentId={selectedItem.id}
          documentName={selectedItem.name}
          currentParentId={selectedItem.parentId}
          onMoveSuccess={async () => {
            const updatedItems = await getDocumentsByParentId(currentFolderId)
            setCurrentItems(updatedItems)
            await refreshItemPermissions(updatedItems)
            if (selectedItem.type === 'folder') {
              setItemCounts((prev) => {
                const next = { ...prev }
                if (selectedItem.parentId !== currentFolderId) delete next[selectedItem.id]
                return next
              })
            }
          }}
        />
      )}
    </div>
  )
}

export default Documents
