import {
  Tag,
  Share2,
  MoreHorizontal
} from 'lucide-react'
import { useState, useEffect, type ReactElement } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'

import DocumentEditor from '../components/DocumentEditor'
import SearchableDropdown from '../components/SearchableDropdown'
import ShareDocumentModal from '../components/ShareDocumentModal'
import {
  getDocumentById,
  getFolderPathIds,
  getDocumentCategories,
  updateDocumentContent,
  renameDocument,
} from '../services/DocumentService'
import { getDocumentAccess } from '../services/DocumentService' // <-- ADD
import { useAuthStore } from '../stores/authStore'
import type { DocumentItem, DocumentBlock } from '../types/documents'

function DocumentEditorPage(): ReactElement {
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  const getCurrentSession = useAuthStore((s) => s.getCurrentSession)

  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [blocks, setBlocks] = useState<DocumentBlock[]>([])
  const [fileName, setFileName] = useState('')
  const [documentCategory, setDocumentCategory] = useState<string>('')
  const [showShareModal, setShowShareModal] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (!fileId) return
    const loadDocument = async (): Promise<void> => {
      const session = getCurrentSession()
      if (!session) { void navigate('/login'); return }

      // 1) Ambil dokumen — backend /documents/{id} sudah enforce can_view (403 kalau tidak boleh)
      const doc = await getDocumentById(fileId, null).catch(() => null)
      if (!doc || doc.type !== 'file') { void navigate('/documents'); return }

      // 2) Tanya akses efektif (viewer/editor) — termasuk inherited
      const access = await getDocumentAccess(fileId).catch(() => null)
      if (!access?.can_view) { // tidak punya akses lihat
        void navigate('/documents')
        return
      }
      setCanEdit(Boolean(access.can_edit))

      // 3) Set state lain
      setDocument(doc)
      setFileName(doc.name)
      setDocumentCategory(doc.category ?? '')

      if (doc.content && doc.content.length > 0) {
        setBlocks(doc.content)
      } else {
        setBlocks([])
      }
    }
    void loadDocument()
  }, [fileId, getCurrentSession, navigate])

  const handleSave = async (newBlocks: DocumentBlock[]): Promise<void> => {
    setBlocks(newBlocks)
    if (fileId && document) {
      try {
        const updatedDoc = await updateDocumentContent(fileId, {
          category: documentCategory,
          content: newBlocks
        })
        if (updatedDoc) {
          setDocument(updatedDoc)
        }
      } catch (error) {
        logger.error('Failed to save document:', error)
      }
    }
  }

  const handleNameChange = async (newName: string): Promise<void> => {
    setFileName(newName)
    if (document) {
      setDocument({ ...document, name: newName })
    }
    if (fileId) {
      try {
        const renamed = await renameDocument(fileId, newName)
        if (renamed) setDocument(renamed)
      } catch (error) {
        logger.error('Failed to rename file:', error)
      }
    }
  }

  const handleCategoryChange = async (newCategory: string): Promise<void> => {
    setDocumentCategory(newCategory)
    if (document) {
      setDocument({ ...document, category: newCategory })
    }
    if (fileId && document) {
      try {
        await updateDocumentContent(fileId, {
          category: newCategory,
          content: blocks
        })
      } catch (error) {
        logger.error('Failed to save category:', error)
      }
    }
  }

  if (!document || document.type !== 'file') {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Document Not Found</h1>
          <p className="text-gray-600 mb-6">The document you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <button
            onClick={(): void => { void navigate('/documents') }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Documents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={(): void => { void navigate('/documents') }}
              className="hover:text-gray-700 transition-colors"
            >
              All Documents
            </button>
            <span>/</span>
            {document?.parentId && (
              <>
                <button
                  onClick={(): void => {
                    if (document.parentId) {
                      const navigateToParent = async (): Promise<void> => {
                        try {
                          const parentPathIds = await getFolderPathIds(document.parentId ?? null)
                          const parentPath = parentPathIds.join('/')
                          void navigate(`/documents/${parentPath}`)
                        } catch {
                          // jika parent tidak bisa diakses, biarkan tetap di halaman ini
                        }
                      }
                      void navigateToParent()
                    }
                  }}
                  className="hover:text-gray-700 transition-colors"
                >
                  {document.path.length > 0 ? document.path[document.path.length - 1] : 'Documents'}
                </button>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 font-medium">{fileName || 'New Document'}</span>
          </div>

          {/* Share Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!canEdit}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white">
        <div className="px-20 py-8">
          {/* File Name (used as title) */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="text"
                value={fileName}
                onChange={(e) => { void handleNameChange(e.target.value) }}
                className="flex-1 text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400"
                placeholder="Untitled Document"
                readOnly={!canEdit}
              />
              {canEdit ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Editor
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Viewer
                </span>
              )}
            </div>

            {/* Category Searchable Dropdown */}
            <div className="flex items-center space-x-3 mb-6">
              <SearchableDropdown
                value={documentCategory}
                placeholder="Add Category"
                icon={Tag}
                onSelect={(category) => { void handleCategoryChange(category) }}
                fetchOptions={getDocumentCategories}
                disabled={!canEdit}
              />
            </div>

            {/* HR Line */}
            <hr className="border-gray-200 mb-6" />

            {/* Document Editor */}
            <DocumentEditor
              initialBlocks={blocks}
              onSave={(newBlocks): void => { void handleSave(newBlocks) }}
              readOnly={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* Share Document Modal */}
      {fileId && (
        <ShareDocumentModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={fileId}
          documentName={fileName || 'Untitled Document'}
        />
      )}
    </div>
  )
}

export default DocumentEditorPage
