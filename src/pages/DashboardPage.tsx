import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFirebaseAuthStore } from '../stores/firebaseAuthStore'
import { useDocumentStore, Document } from '../stores/documentStore'
import { Plus, FileText, Calendar, BarChart3, Trash2, Edit, ChevronRight, BookOpen, User, Settings } from 'lucide-react'
import { isDevelopment } from '../lib/firebase'

// Simple date formatting function to replace date-fns
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useFirebaseAuthStore()
  const { documents, createDocument, deleteDocument, loading } = useDocumentStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState('')

  const handleCreateDocument = async () => {
    if (!user || !newDocTitle.trim()) return

    setIsCreating(true)
    try {
      const docId = await createDocument(newDocTitle.trim(), 'personal-statement')
      navigate(`/editor/${docId}`)
    } catch (error) {
      console.error('Failed to create document:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteDocument = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent navigation when clicking delete
    if (window.confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id)
    }
  }

  const getProgressColor = (wordCount: number) => {
    const progress = (wordCount / 650) * 100
    if (progress < 33) return 'bg-red-500'
    if (progress < 66) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Welcome, {user?.displayName || user?.email?.split('@')[0]}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Your personal statement command center.
            </p>
          </div>
          <Link to="/account" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <img 
              src={user?.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user?.email}`} 
              alt="Account"
              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" 
            />
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isDevelopment && (
          <div className="mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Development Mode</p>
            <p>You are currently in development mode. Data is stored locally.</p>
          </div>
        )}

        {/* Create New Document Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Start a New Masterpiece</h2>
              <p className="mt-2 text-blue-100 opacity-90 max-w-2xl">
                Give your new document a title to begin. A great title can be your first step towards a great personal statement.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g., 'Common App Essay Draft'"
                  className="flex-grow px-4 py-3 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-white/80 bg-white/20 text-white placeholder-blue-200"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateDocument()}
                />
                <button
                  onClick={handleCreateDocument}
                  disabled={isCreating || !newDocTitle.trim()}
                  className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 shadow-md transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>{isCreating ? 'Creating...' : 'Create'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 px-1">Your Documents</h2>
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center bg-white rounded-lg p-12 border border-dashed border-gray-300">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Your workspace is empty</h3>
              <p className="text-gray-500 mb-6">Create your first document above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc: Document) => (
                <div 
                  key={doc.id} 
                  className="bg-white rounded-xl shadow-md border border-gray-200/80 hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer group"
                  onClick={() => navigate(`/editor/${doc.id}`)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">{doc.title}</h3>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          <span>Updated {formatDate(new Date(doc.updatedAt))}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{doc.wordCount} / 650 words</span>
                        </div>
                        <span className="font-semibold">{Math.round((doc.wordCount / 650) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(doc.wordCount)}`}
                          style={{ width: `${Math.min((doc.wordCount / 650) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50/70 px-6 py-3 rounded-b-xl border-t border-gray-200/80 flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-600">Open Editor</span>
                    <ChevronRight className="h-5 w-5 text-blue-500 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 