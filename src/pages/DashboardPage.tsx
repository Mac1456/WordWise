import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDocumentStore } from '../stores/documentStore'
import { Document } from '../types/supabase'
import { PlusCircle, FileText, Calendar, BarChart3, Trash2, Edit } from 'lucide-react'

// Simple date formatting function to replace date-fns
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { documents, loadDocuments, createDocument, deleteDocument, loading } = useDocumentStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')

  // Debug helper
  const checkLocalStorage = () => {
    if (user) {
      const storageKey = `wordwise_documents_${user.id}`
      const docs = localStorage.getItem(storageKey)
      console.log('LocalStorage contents:', docs)
      console.log('Current documents in state:', documents)
    }
  }

  useEffect(() => {
    if (user) {
      loadDocuments()
    }
  }, [user, loadDocuments])

  const handleCreateDocument = async () => {
    if (!user || !newDocTitle.trim()) {
      console.log('Cannot create document:', { user, newDocTitle })
      return
    }
    
    console.log('Creating document:', { title: newDocTitle.trim(), userId: user.id })
    setIsCreating(true)
    try {
      const docId = await createDocument(newDocTitle.trim(), 'personal-statement')
      console.log('Document created successfully:', docId)
      setNewDocTitle('')
      // Force reload documents after creation
      await loadDocuments()
    } catch (error) {
      console.error('Failed to create document:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id)
    }
  }

  const getProgressColor = (wordCount: number) => {
    if (wordCount < 200) return 'bg-red-500'
    if (wordCount < 400) return 'bg-yellow-500'
    if (wordCount < 600) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getProgressLabel = (wordCount: number) => {
    if (wordCount < 200) return 'Getting started'
    if (wordCount < 400) return 'In progress'
    if (wordCount < 600) return 'Strong progress'
    return 'Nearly complete'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="mt-2 text-gray-600">
          Organize and manage your personal statements and essays in one place.
        </p>
        {/* Development Mode Indicator */}
        {(!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">🔧</span>
              <span className="text-blue-800 font-medium">Development Mode</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Running with local storage. Your documents will persist locally in your browser.
            </p>
          </div>
        )}
      </div>

      {/* Create New Document */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Document</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Enter document title (e.g., 'Stanford Personal Statement')"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
          />
          <button
            onClick={handleCreateDocument}
            disabled={isCreating || !newDocTitle.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <PlusCircle className="h-5 w-5" />
            <span>{isCreating ? 'Creating...' : 'Create Document'}</span>
          </button>
        </div>
        

      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Documents</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-6">Create your first personal statement to get started with organized document management.</p>
            <button
              onClick={() => setNewDocTitle('My Personal Statement')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Create Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((doc: Document) => (
              <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {formatDate(new Date(doc.updatedAt))}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>{doc.wordCount} words</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{getProgressLabel(doc.wordCount)}</span>
                        <span>{doc.wordCount}/650 words</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(doc.wordCount)}`}
                          style={{ width: `${Math.min((doc.wordCount / 650) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex items-center space-x-2">
                    <Link
                      to={`/editor/${doc.id}`}
                      className="px-3 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors flex items-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Link>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Writing Tips for Personal Statements</h3>
        <ul className="space-y-2 text-blue-800">
          <li>• Start with a compelling hook that showcases your unique perspective</li>
          <li>• Use specific examples to demonstrate leadership and resilience</li>
          <li>• Keep your tone authentic and sincere throughout</li>
          <li>• Stay within the 650-word limit while telling your complete story</li>
          <li>• Use WordWise to organize and track progress on multiple essays</li>
        </ul>
      </div>
    </div>
  )
} 