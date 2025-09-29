import { 
  Tag,
  Share2,
  MoreHorizontal
} from 'lucide-react'
import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'

import DocumentEditor from '../components/DocumentEditor'
import SearchableDropdown from '../components/SearchableDropdown'
import ShareDocumentModal from '../components/ShareDocumentModal'
import { getDocumentById, getFolderPathIds, getDocumentCategories, updateDocumentContent, renameDocument, getDocumentPermissions } from '../services/DocumentService'
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

  const getMockDocumentContent = useCallback((docId: string, doc?: DocumentItem | null): DocumentBlock[] => {
    // Return different mock content based on document ID
    switch (docId) {
      case 'work-arrangement':
        return [
          {
            id: '1',
            type: 'heading1',
            content: 'Work Arrangement Request Form',
            alignment: 'left'
          },
          {
            id: '2',
            type: 'paragraph',
            content: 'This document outlines the process and requirements for submitting work arrangement requests within our organization.',
            alignment: 'left'
          },
          {
            id: '3',
            type: 'heading2',
            content: 'Purpose',
            alignment: 'left'
          },
          {
            id: '4',
            type: 'paragraph',
            content: 'To provide employees with flexible work options while maintaining operational efficiency and team collaboration.',
            alignment: 'left'
          },
          {
            id: '5',
            type: 'heading2',
            content: 'Available Arrangements',
            alignment: 'left'
          },
          {
            id: '6',
            type: 'bulleted-list',
            content: 'Remote work (full-time or hybrid)',
            alignment: 'left'
          },
          {
            id: '7',
            type: 'bulleted-list',
            content: 'Flexible hours',
            alignment: 'left'
          },
          {
            id: '8',
            type: 'bulleted-list',
            content: 'Compressed workweek',
            alignment: 'left'
          },
          {
            id: '9',
            type: 'bulleted-list',
            content: 'Job sharing',
            alignment: 'left'
          }
        ]

      case 'charter-kenamaan':
        return [
          {
            id: '1',
            type: 'heading1',
            content: 'Charter Kenamaan - P/KEN/2504/006',
            alignment: 'center'
          },
          {
            id: '2',
            type: 'paragraph',
            content: 'Official charter document establishing the operational framework and guidelines for the Kenamaan project initiative.',
            alignment: 'center'
          },
          {
            id: '3',
            type: 'heading2',
            content: 'Project Overview',
            alignment: 'left'
          },
          {
            id: '4',
            type: 'paragraph',
            content: 'This charter defines the scope, objectives, and governance structure for the Kenamaan project, ensuring alignment with organizational goals and regulatory requirements.',
            alignment: 'left'
          },
          {
            id: '5',
            type: 'heading2',
            content: 'Key Stakeholders',
            alignment: 'left'
          },
          {
            id: '6',
            type: 'numbered-list',
            content: 'Project Sponsor: Executive Leadership Team',
            alignment: 'left'
          },
          {
            id: '7',
            type: 'numbered-list',
            content: 'Project Manager: Grace Maron',
            alignment: 'left'
          },
          {
            id: '8',
            type: 'numbered-list',
            content: 'Technical Lead: Development Team',
            alignment: 'left'
          },
          {
            id: '9',
            type: 'quote',
            content: 'Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill',
            alignment: 'left'
          }
        ]

      default:
        return [
          {
            id: '1',
            type: 'heading1',
            content: doc?.name ?? 'Untitled Document',
            alignment: 'left'
          },
          {
            id: '2',
            type: 'paragraph',
            content: 'Start writing your content here...',
            alignment: 'left'
          }
        ]
    }
  }, [])

  useEffect(() => {
    if (!fileId) return
    const loadDocument = async (): Promise<void> => {
      const session = getCurrentSession()
      if (!session) { void navigate('/login'); return }
      const doc = await getDocumentById(fileId, null)
      if (!doc || doc.type !== 'file') { void navigate('/documents'); return }

      // Check permissions and edit rights
      const userId = (session.user.id ?? '').trim()
      const userEmail = (session.user.email ?? '').trim().toLowerCase()
      const division = ((session.user as unknown as { division?: string }).division ?? '').trim()
      
      // Owners always have edit permissions
      if ((doc.ownedBy?.id ?? '').trim() === userId) {
        setCanEdit(true)
      } else {
        // Check inline permissions first
        const hasUserEditInline = doc.userPermissions?.some(p => 
          ((p.user_id ?? '').trim() === userId || (p.user_email ?? '').trim().toLowerCase() === userEmail) &&
          p.permission === 'editor'
        ) || false

        const hasDivisionEditInline = division ? (doc.divisionPermissions?.some(p => 
          (p.division ?? '').trim().toLowerCase() === division.toLowerCase() &&
          p.permission === 'editor'
        ) || false) : false

        if (hasUserEditInline || hasDivisionEditInline) {
          setCanEdit(true)
        } else {
          // Fallback to API permissions
          const perms = await getDocumentPermissions(fileId)
          const hasUser = perms?.user_permissions?.some(p => (p.user_id ?? '').trim() === userId || (p.user_email ?? '').trim().toLowerCase() === userEmail) ?? false
          const hasDivision = division ? (perms?.division_permissions?.some(p => (p.division ?? '').trim().toLowerCase() === division.toLowerCase()) ?? false) : false
          
          if (!hasUser && !hasDivision) {
            void navigate('/documents')
            return
          }

          // Check edit permissions from API
          const hasUserEdit = perms?.user_permissions?.some(p => 
            ((p.user_id ?? '').trim() === userId || (p.user_email ?? '').trim().toLowerCase() === userEmail) &&
            p.permission === 'editor'
          ) || false

          const hasDivisionEdit = division ? (perms?.division_permissions?.some(p => 
            (p.division ?? '').trim().toLowerCase() === division.toLowerCase() &&
            p.permission === 'editor'
          ) || false) : false

          setCanEdit(hasUserEdit || hasDivisionEdit)
        }
      }

      setDocument(doc)
      setFileName(doc.name)
      setDocumentCategory(doc.category ?? '')

      // Load document content - use actual content from API or fallback to mock
      if (doc.content && doc.content.length > 0) {
        setBlocks(doc.content)
      } else {
        // Fallback to mock content for existing documents without structured content
        const mockContent = getMockDocumentContent(doc.id, doc)
        setBlocks(mockContent)
      }
    }
    void loadDocument()
  }, [fileId, getCurrentSession, getMockDocumentContent, navigate])


  const handleSave = async (newBlocks: DocumentBlock[]): Promise<void> => {
    setBlocks(newBlocks)

    // Save to API if document exists
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
        // Optionally show user feedback about save failure
      }
    }
  }

  const handleNameChange = async (newName: string): Promise<void> => {
    setFileName(newName)
    if (document) {
      setDocument({ ...document, name: newName })
    }

    // Rename file immediately
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

    // Auto-save category change
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
                        const parentPathIds = await getFolderPathIds(document.parentId ?? null)
                        const parentPath = parentPathIds.join('/')
                        void navigate(`/documents/${parentPath}`)
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
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                canEdit ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
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
