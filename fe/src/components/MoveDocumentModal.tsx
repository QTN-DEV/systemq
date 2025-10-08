import { 
    X, 
    Search, 
    Folder,
    ChevronRight,
    Home,
    Check
  } from 'lucide-react'
  import { useState, useEffect, useMemo, type ReactElement } from 'react'
  import Swal from 'sweetalert2'
  
  import { 
    getAllAccessibleFolders,
    moveDocument
  } from '../services/DocumentService'
  import type { DocumentItem } from '../types/documents'
  
  interface MoveDocumentModalProps {
    isOpen: boolean
    onClose: () => void
    documentId: string
    documentName: string
    currentParentId?: string
    onMoveSuccess?: () => void
  }
  
  // ---- FIX: node type with children ----
  type FolderNode = DocumentItem & { children: FolderNode[] }
  
  function MoveDocumentModal({ 
    isOpen, 
    onClose, 
    documentId, 
    documentName, 
    currentParentId,
    onMoveSuccess 
  }: MoveDocumentModalProps): ReactElement {
    const [folders, setFolders] = useState<DocumentItem[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
    const [moving, setMoving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  
    // Load folders when modal opens
    useEffect(() => {
      if (isOpen) {
        setLoading(true)
        setError(null)
        setSelectedFolderId(null)
        setSearchQuery('')
        setExpandedFolders(new Set())
        
        const loadFolders = async (): Promise<void> => {
          try {
            const allFolders = await getAllAccessibleFolders()
            setFolders(allFolders)
          } catch (err) {
            setError('Failed to load folders')
          } finally {
            setLoading(false)
          }
        }
        
        void loadFolders()
      }
    }, [isOpen])
  
    // Filter folders based on search query
    const filteredFolders = useMemo((): DocumentItem[] => {
      if (!searchQuery.trim()) return folders
      
      const query = searchQuery.toLowerCase()
      return folders.filter(folder => 
        folder.name.toLowerCase().includes(query) ||
        folder.path.some(pathSegment => pathSegment.toLowerCase().includes(query))
      )
    }, [folders, searchQuery])
  
    // ---- FIX: Build folder tree as FolderNode[] (has children) ----
    const folderTree = useMemo((): FolderNode[] => {
      const folderMap = new Map<string, FolderNode>()
      const rootFolders: FolderNode[] = []
  
      // Initialize all folders with children array
      filteredFolders.forEach(folder => {
        folderMap.set(folder.id, { ...folder, children: [] })
      })
  
      // Build tree structure
      filteredFolders.forEach(folder => {
        const node = folderMap.get(folder.id)!
        if (folder.parentId && folderMap.has(folder.parentId)) {
          folderMap.get(folder.parentId)!.children.push(node)
        } else {
          rootFolders.push(node)
        }
      })
  
      return rootFolders
    }, [filteredFolders])
  
    // Validate move operation
    const validateMove = (targetFolderId: string | null): string | null => {
      // Can't move to the same parent
      if (targetFolderId === currentParentId) {
        return 'Item is already in this folder'
      }
  
      // Can't move folder into itself or its subfolders (circular reference)
      if (targetFolderId === documentId) {
        return 'Cannot move folder into itself'
      }
  
      // Check for circular reference in subfolders
      const checkCircularReference = (folderId: string): boolean => {
        if (folderId === documentId) return true
        const folder = folders.find(f => f.id === folderId)
        if (folder?.parentId) {
          return checkCircularReference(folder.parentId)
        }
        return false
      }
  
      if (targetFolderId && checkCircularReference(targetFolderId)) {
        return 'Cannot move folder into its own subfolder'
      }
  
      return null
    }
  
    const handleFolderSelect = (folderId: string | null): void => {
      const validationError = validateMove(folderId)
      if (validationError) {
        setError(validationError)
        return
      }
      
      setError(null)
      setSelectedFolderId(folderId)
    }
  
    const handleMove = async (): Promise<void> => {
      if (!selectedFolderId && selectedFolderId !== null) return
  
      setMoving(true)
      setError(null)
  
      try {
        const movedItem = await moveDocument(documentId, selectedFolderId)
        if (movedItem) {
          await Swal.fire({
            title: 'Item moved',
            text: `"${documentName}" has been moved successfully.`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3B82F6'
          })
          onMoveSuccess?.()
          onClose()
        } else {
          setError('Failed to move item. Please try again.')
          await Swal.fire({
            title: 'Move failed',
            text: 'Failed to move item. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3B82F6'
          })
        }
      } catch (err) {
        setError('Failed to move item. Please try again.')
        await Swal.fire({
          title: 'Move failed',
          text: 'Failed to move item. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        })
      } finally {
        setMoving(false)
      }
    }
  
    const toggleFolderExpansion = (folderId: string): void => {
      const newExpanded = new Set(expandedFolders)
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId)
      } else {
        newExpanded.add(folderId)
      }
      setExpandedFolders(newExpanded)
    }
  
    // ---- FIX: renderFolderTree expects FolderNode[] ----
    const renderFolderTree = (nodes: FolderNode[], level = 0): ReactElement[] => {
      return nodes.map(folder => (
        <div key={folder.id}>
          <div
            className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
              selectedFolderId === folder.id
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-50'
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => handleFolderSelect(folder.id)}
          >
            {folder.children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFolderExpansion(folder.id)
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${
                    expandedFolders.has(folder.id) ? 'rotate-90' : ''
                  }`} 
                />
              </button>
            )}
            {folder.children.length === 0 && <div className="w-6" />}
            <Folder className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">{folder.name}</span>
            {selectedFolderId === folder.id && (
              <Check className="w-4 h-4 text-blue-600 ml-auto" />
            )}
          </div>
          {expandedFolders.has(folder.id) && folder.children.length > 0 && (
            <div>
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      ))
    }
  
    if (!isOpen) return <></>
  
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Move to Folder</h2>
              <p className="text-sm text-gray-600 mt-1">Moving: {documentName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
  
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
  
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-700 rounded-md">
                {error}
              </div>
            )}
  
            {/* Folder Tree */}
            <div className="space-y-1">
              {/* Root option */}
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  selectedFolderId === null
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleFolderSelect(null)}
              >
                <Home className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Root (All Documents)</span>
                {selectedFolderId === null && (
                  <Check className="w-4 h-4 text-blue-600 ml-auto" />
                )}
              </div>
  
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Loading accessible folders...</span>
                </div>
              )}
  
              {/* Folder Tree */}
              {!loading && renderFolderTree(folderTree)}
            </div>
          </div>
  
          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={selectedFolderId === undefined || moving}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedFolderId !== undefined && !moving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {moving ? 'Moving...' : 'Move'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  export default MoveDocumentModal
  