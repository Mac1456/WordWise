import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDocumentStore } from '../stores/documentStore'
import WritingEditor from '../components/WritingEditor'

export default function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { createDocument, currentDocument } = useDocumentStore()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // If no document ID, create a new document
    if (!documentId) {
      const createNewDocument = async () => {
        try {
          const newDocId = await createDocument('Untitled Document')
          navigate(`/editor/${newDocId}`, { replace: true })
        } catch (error) {
          console.error('Failed to create document:', error)
          navigate('/dashboard')
        }
      }
      createNewDocument()
    }
  }, [user, documentId, navigate, createDocument])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to access the editor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {currentDocument?.title || 'Loading...'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Clean, distraction-free writing environment for your personal statement
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="ml-4 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
      
      {/* Editor Container - Takes remaining height */}
      <div className="flex-1 min-h-0">
        <WritingEditor documentId={documentId} />
      </div>
    </div>
  )
} 