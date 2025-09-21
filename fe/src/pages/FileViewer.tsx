import { ArrowLeft, Download, Share2, Edit2, Trash2, Clock, User, Calendar } from 'lucide-react'
import type { ReactElement } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { getDocumentById, getFolderPathIds } from '../data/mockDocuments'

function FileViewer(): ReactElement {
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  
  const file = fileId ? getDocumentById(fileId) : null

  if (!file || file.type !== 'file') {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">File Not Found</h1>
          <p className="text-gray-600 mb-6">The file you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <button
            onClick={() => { navigate('/documents') }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Documents
          </button>
        </div>
      </div>
    )
  }

  const handleGoBack = (): void => {
    if (file.parentId) {
      // Navigate back to the parent folder using folder IDs
      const parentPathIds = getFolderPathIds(file.parentId)
      const parentPath = parentPathIds.join('/')
      navigate(`/documents/${parentPath}`)
    } else {
      // Navigate to root documents
      navigate('/documents')
    }
  }

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
    return colors[role as keyof typeof colors] || 'bg-gray-500'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{file.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {file.size} • {file.category ?? 'Uncategorized'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Edit2 className="w-4 h-4" />
                <span>Rename</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="text-center py-16">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Clock className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  File viewing functionality is currently under development. 
                  You can still download, share, and manage this file using the buttons above.
                </p>
                <div className="space-y-3 text-sm text-gray-500">
                  <p>🔍 <strong>Preview:</strong> View documents directly in the browser</p>
                  <p>✏️ <strong>Edit:</strong> Online editing capabilities</p>
                  <p>💬 <strong>Comments:</strong> Collaborate with team members</p>
                  <p>📝 <strong>Version History:</strong> Track changes over time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* File Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">File Details</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Owner</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getRoleColor(file.ownedBy.role)}`}
                      >
                        {file.ownedBy.avatar ?? getInitials(file.ownedBy.name)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{file.ownedBy.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{file.ownedBy.role}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">{file.dateCreated}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Last Modified</p>
                    <p className="text-sm text-gray-600">{file.lastModified}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Size</span>
                    <span className="text-sm text-gray-600">{file.size}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Status</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                    file.status === 'active' ? 'bg-green-100 text-green-800' :
                    file.status === 'shared' ? 'bg-blue-100 text-blue-800' :
                    file.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {file.status}
                  </span>
                </div>

                {file.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Category</span>
                    <span className="text-sm text-gray-600">{file.category}</span>
                  </div>
                )}
              </div>
            </div>

            {/* File Path */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
              <div className="text-sm text-gray-600">
                <p className="font-mono bg-gray-50 p-2 rounded">
                  {file.path.length > 0 
                    ? `Documents/${file.path.join('/')}/${file.name}`
                    : `Documents/${file.name}`
                  }
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Copy link
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Move to folder
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  Create copy
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors">
                  View history
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileViewer
