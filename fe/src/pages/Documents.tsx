import { 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  Share2, 
  Folder, 
  File, 
  MoreHorizontal,
  ChevronRight,
  Home,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react'
import { useState, useMemo, useEffect, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  getDocumentsByParentId,
  getDocumentById,
  buildBreadcrumbs,
  getActualItemCount,
  createDocument,
  deleteDocument,
  renameDocument,
} from '../services/DocumentService'
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
  const [searchTerm, setSearchTerm] = useState('')
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
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)

  // State for loading, data, and errors
  const [currentFolder, setCurrentFolder] = useState<DocumentItem | null | undefined>(null)
  const [currentItems, setCurrentItems] = useState<DocumentItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DocumentBreadcrumb[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch documents and current folder when currentFolderId changes
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setIsInitialLoad(true)
      try {
        // Fetch current folder and items
        const [folder, items, breadcrumbsData] = await Promise.all([
          currentFolderId ? getDocumentById(currentFolderId, null) : Promise.resolve(null),
          getDocumentsByParentId(currentFolderId),
          buildBreadcrumbs(currentFolderId ?? null)
        ])
        
        setCurrentFolder(folder)
        setCurrentItems(items)
        setBreadcrumbs(breadcrumbsData)
        
        // Fetch item counts for each folder
        const counts: Record<string, number> = {}
        for (const item of items) {
          if (item.type === 'folder') {
            counts[item.id] = await getActualItemCount(item.id)
          }
        }
        setItemCounts(counts)
        setError(null) // Clear any previous errors
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching documents:', error)
        // Set empty arrays on error to prevent UI issues
        setCurrentFolder(null)
        setCurrentItems([])
        setBreadcrumbs([{ id: 'root', name: 'Documents', path: [] }])
        setItemCounts({})
        setError('Failed to load documents. Please try again.')
      } finally {
        setIsInitialLoad(false)
      }
    }
    
    void fetchData()
  }, [currentFolderId])

  // Get unique categories for filter tabs
  const categories = useMemo((): string[] => {
    const uniqueCategories = [...new Set(currentItems.map(item => item.category).filter(Boolean))] as string[]
    return ['All', ...uniqueCategories]
  }, [currentItems])

  // Filter and search documents
  const filteredItems = useMemo((): DocumentItem[] => {
    let filtered = currentItems

    // Filter by category
    if (activeFilter !== 'All') {
      filtered = filtered.filter(item => item.category === activeFilter)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ownedBy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [currentItems, activeFilter, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + rowsPerPage)

  // Helper functions
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }


  const getRoleColor = (role: string): string => {
    const colors = {
      'admin': 'bg-purple-500',
      'manager': 'bg-green-500',
      'employee': 'bg-blue-500',
      'secretary': 'bg-pink-500'
    }
    return colors[role as keyof typeof colors] ?? 'bg-gray-500'
  }

  const formatFileSize = (size: string | undefined): string => {
    return size ?? '-'
  }

  // Navigation handlers
  const handleItemClick = (item: DocumentItem): void => {
    if (item.type === 'folder') {
      const newPath = [...pathSegments, item.id].join('/')
      navigate(`/documents/${newPath}`)
    } else {
      // For files, navigate to a file viewer page
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

  // Action handlers
  const handleShowActions = (itemId: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setShowActionsDropdown(showActionsDropdown === itemId ? null : itemId)
  }

  const handleCreateFolder = (): void => {
    setShowCreateFolder(true)
    setNewItemName('')
  }

  const handleCreateFile = (): void => {
    setShowCreateFile(true)
    setNewItemName('')
  }

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
    const baseUrl = window.location.origin
    const itemUrl = item.type === 'folder' 
      ? `${baseUrl}/documents/${[...item.path, item.name].join('/')}`
      : `${baseUrl}/documents/file/${item.id}`
    setShareUrl(itemUrl)
    setShowShareModal(true)
    setShowActionsDropdown(null)
  }

  const handleCopyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy URL:', err)
    }
  }

  // Form submission handlers
  const handleCreateFolderSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      const session = getCurrentSession()
      if (!session) {
        setError('Authentication required')
        return
      }

      const authToken = `Bearer ${session.token}`
      const newFolder = await createDocument(newItemName.trim(), 'folder', currentFolderId, authToken)

      if (newFolder) {
        // Refresh the current items
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)

        // Update item counts for new folder
        const counts = { ...itemCounts }
        counts[newFolder.id] = 0
        setItemCounts(counts)

        setShowCreateFolder(false)
        setNewItemName('')
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
    if (!newItemName.trim()) return

    try {
      const session = getCurrentSession()
      if (!session) {
        setError('Authentication required')
        return
      }

      const authToken = `Bearer ${session.token}`
      const newFile = await createDocument(newItemName.trim(), 'file', currentFolderId, authToken)

      if (newFile) {
        // Refresh the current items
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)

        setShowCreateFile(false)
        setNewItemName('')
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
    if (!newItemName.trim() || !selectedItem) return

    try {
      const updatedItem = await renameDocument(selectedItem.id, newItemName.trim())

      if (updatedItem) {
        // Refresh the current items after successful rename
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)

        setShowRenameModal(false)
        setSelectedItem(null)
        setNewItemName('')
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
        // Refresh the current items after successful deletion
        const updatedItems = await getDocumentsByParentId(currentFolderId)
        setCurrentItems(updatedItems)

        // Remove from item counts if it was a folder
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

  // Helper function to format dates in a user-friendly way
  const formatDate = (dateString: string): string => {
    try {
      // Server returns UTC time, so we need to parse it as UTC
      // If the dateString doesn't end with 'Z', assume it's UTC and add 'Z'
      const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
      const date = new Date(utcString)

      // Verify the date is valid
      if (isNaN(date.getTime())) {
        return dateString
      }

      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 0) {
        return 'In the future'
      } else if (diffInSeconds < 60) {
        return 'Just now'
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400)
        return `${days} day${days !== 1 ? 's' : ''} ago`
      } else {
        // For older dates, show in user's local timezone
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
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

  return (
    <div className="p-8">
      {breadcrumbs.length > 1 && (
        <div className="flex items-center space-x-2 mb-6 text-sm text-gray-600">
          {breadcrumbs.map((breadcrumb, index) => (
            <div key={breadcrumb.id} className="flex items-center space-x-2">
              {index > 0 && <ChevronRight className="w-4 h-4" />}
              <button
                onClick={() => handleBreadcrumbClick(breadcrumb)}
                className="hover:text-blue-600 transition-colors flex items-center space-x-1"
              >
                {index === 0 && <Home className="w-4 h-4" />}
                <span>{breadcrumb.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            {currentFolder ? (
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4 border border-blue-100">
                  <Folder className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-gray-900">{currentFolder.name}</div>
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
                <p className="text-gray-600 mt-1">
                  Manage your documents, folders, and files in one centralized location.
                </p>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreateFile}
              className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 hover:bg-gray-200 transition-colors"
            >
              <File className="w-4 h-4" />
              <span>New File</span>
            </button>
            <button
              onClick={handleCreateFolder}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              <Folder className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          </div>
        </div>
      </div>

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

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 border-b">
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

      {/* Search and Export */}
      {/* <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64"
            aria-label="Search documents"
          />
        </div>
        <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div> */}

      <div className="bg-white border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Folder/File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owned By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isInitialLoad ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" aria-label="Loading documents" />
                    <p className="text-gray-600">Loading documents...</p>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
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
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Folder className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm || activeFilter !== 'All' ? 'No matching items found' : 'This folder is empty'}
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      {searchTerm || activeFilter !== 'All' 
                        ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                        : 'Get started by creating a new file or folder in this location.'
                      }
                    </p>
                    {(!searchTerm && activeFilter === 'All') && (
                      <div className="flex space-x-3">
                        <button
                          onClick={handleCreateFile}
                          className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <File className="w-4 h-4" />
                          <span>New File</span>
                        </button>
                        <button
                          onClick={handleCreateFolder}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Folder className="w-4 h-4" />
                          <span>New Folder</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center" aria-label={`${item.type === 'folder' ? 'Folder' : 'File'} icon`}>
                      {item.type === 'folder' ? (
                        <Folder className="h-8 w-8 text-blue-500" />
                      ) : (
                        <File className="h-8 w-8 text-gray-500" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.type === 'folder'
                          ? itemCounts[item.id] !== undefined
                            ? `${itemCounts[item.id] ?? 0} items`
                            : 'Loading...'
                          : formatFileSize(item.size)
                        }
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8" aria-label="Owner avatar">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm ${getRoleColor(item.ownedBy.role)}`}
                        role="img"
                        aria-label={`${item.ownedBy.name}'s avatar`}
                      >
                        {item.ownedBy.avatar ?? getInitials(item.ownedBy.name)}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{item.ownedBy.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{item.ownedBy.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{item.category ?? '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(item.lastModified)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={(e) => handleShowActions(item.id, e)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label={`Actions for ${item.name}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {showActionsDropdown === item.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
                        <div className="py-1">
                          <button
                            onClick={() => handleRename(item)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => handleShare(item)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New File</h3>
            <form onSubmit={(e) => { void handleCreateFileSubmit(e) }}>
              <div className="mb-4">
                <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter file name (e.g., document.pdf)"
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
                  Create File
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
              {selectedItem.type === 'folder' && ' This will also delete all items inside this folder.'}
              {' '}This action cannot be undone.
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

      {showShareModal && selectedItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Share {selectedItem.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <p className="text-gray-600 mb-4">
              Share &quot;{selectedItem.name}&quot; with others by copying the link below:
            </p>
            <div className="mb-4">
              <label htmlFor="shareUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Share URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="shareUrl"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600"
                />
                <button
                  onClick={() => { void handleCopyUrl() }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                >
                  {urlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {urlCopied && (
                <p className="text-sm text-green-600 mt-1">URL copied to clipboard!</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Documents
