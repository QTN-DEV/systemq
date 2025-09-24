import { 
  Tag
} from 'lucide-react'
import { useState, useEffect, useCallback, type ReactElement } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { logger } from '@/lib/logger'

import DocumentEditor from '../components/DocumentEditor'
import SearchableDropdown from '../components/SearchableDropdown'
import { getDocumentById, getFolderPathIds, getDocumentCategories, updateDocumentContent } from '../services/DocumentService'
import type { DocumentItem, DocumentBlock } from '../types/documents'

function DocumentEditorPage(): ReactElement {
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  
  const [document, setDocument] = useState<DocumentItem | null>(null)
  const [blocks, setBlocks] = useState<DocumentBlock[]>([])
  const [documentTitle, setDocumentTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [documentCategory, setDocumentCategory] = useState<string>('')

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
            content: doc?.title ?? doc?.name ?? 'Untitled Document',
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
    if (fileId) {
      const loadDocument = async (): Promise<void> => {
        const doc = await getDocumentById(fileId, null)
        if (doc && doc.type === 'file') {
          setDocument(doc)
          setFileName(doc.name) // This is the file name
          setDocumentTitle(doc.title ?? doc.name) // This is the document title, fallback to file name
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
      }
      void loadDocument()
    }
  }, [fileId, getMockDocumentContent])


  const handleSave = async (newBlocks: DocumentBlock[]): Promise<void> => {
    setBlocks(newBlocks)

    // Save to API if document exists
    if (fileId && document) {
      try {
        const updatedDoc = await updateDocumentContent(fileId, {
          title: documentTitle,
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

  const handleTitleChange = async (newTitle: string): Promise<void> => {
    setDocumentTitle(newTitle)
    if (document) {
      setDocument({ ...document, title: newTitle })
    }

    // Auto-save title change
    if (fileId && document) {
      try {
        await updateDocumentContent(fileId, {
          title: newTitle,
          category: documentCategory,
          content: blocks
        })
      } catch (error) {
        logger.error('Failed to save title:', error)
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
          title: documentTitle,
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
      </div>

      {/* Main Content */}
      <div className="bg-white">
        <div className="px-20 py-8">
          {/* Document Title */}
          <div className="mb-6">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => { void handleTitleChange(e.target.value) }}
            className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-400 mb-4"
            placeholder="Untitled Document"
          />
          
          {/* Category Searchable Dropdown */}
          <div className="flex items-center space-x-3 mb-6">
            <SearchableDropdown
              value={documentCategory}
              placeholder="Add Category"
              icon={Tag}
              onSelect={(category) => { void handleCategoryChange(category) }}
              fetchOptions={getDocumentCategories}
            />
          </div>
          
          {/* HR Line */}
          <hr className="border-gray-200 mb-6" />
          
          {/* Document Editor */}
          <DocumentEditor
            initialBlocks={blocks}
            onSave={(newBlocks): void => { void handleSave(newBlocks) }}
            readOnly={false}
          />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentEditorPage
