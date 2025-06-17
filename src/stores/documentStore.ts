import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Document } from '../types/supabase'
import { useAuthStore } from './authStore'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'

interface DocumentState {
  documents: Document[]
  currentDocument: Document | null
  loading: boolean
  error: string | null
  // Actions
  loadDocuments: () => Promise<void>
  createDocument: (title: string, writingGoal?: string) => Promise<string>
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  setCurrentDocument: (document: Document | null) => void
  saveDocument: (id: string, content: string) => Promise<void>
  // Real-time subscriptions
  subscribeToDocuments: () => () => void
  unsubscribeFromDocuments: () => void
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,

  loadDocuments: async () => {
    try {
      set({ loading: true, error: null })
      
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Development mode - use localStorage with sample data
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Loading documents from localStorage')
        const storageKey = `wordwise_documents_${user.id}`
        const storedDocuments = localStorage.getItem(storageKey)
        
        let documents: Document[] = []
        
        if (storedDocuments) {
          try {
            documents = JSON.parse(storedDocuments)
            console.log('Loaded documents from localStorage:', documents)
          } catch (error) {
            console.error('Failed to parse stored documents:', error)
            documents = []
          }
        }
        
        // If no stored documents, create sample documents
        if (documents.length === 0) {
          documents = [
            {
              id: 'doc-1',
              userId: user.id,
              title: 'My Personal Statement Draft',
              content: 'This is a sample personal statement for college applications. I am passionate about learning and contributing to my community...',
              writingGoal: 'personal-statement',
              wordCount: 150,
              readabilityScore: 8.5,
              status: 'draft',
              metadata: { wordLimit: 650 },
              createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
              updatedAt: new Date(Date.now() - 3600000).toISOString()   // 1 hour ago
            },
            {
              id: 'doc-2',
              userId: user.id,
              title: 'Essay on Leadership',
              content: 'Leadership is not just about giving orders, but about inspiring others to achieve their best...',
              writingGoal: 'essay',
              wordCount: 200,
              readabilityScore: 9.2,
              status: 'reviewing',
              metadata: { wordLimit: 750 },
              createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
              updatedAt: new Date(Date.now() - 7200000).toISOString()    // 2 hours ago
            }
          ]
          // Save sample documents to localStorage
          localStorage.setItem(storageKey, JSON.stringify(documents))
          console.log('Created and saved sample documents to localStorage')
        }
        
        set({ documents, loading: false })
        return
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const documents: Document[] = data.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        title: doc.title,
        content: doc.content,
        writingGoal: doc.writing_goal as any,
        wordCount: doc.word_count,
        readabilityScore: doc.readability_score || undefined,
        status: doc.status as any,
        metadata: doc.metadata ? JSON.parse(JSON.stringify(doc.metadata)) : undefined,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      }))

      set({ documents, loading: false })
    } catch (error: any) {
      console.error('Failed to load documents:', error)
      set({ error: error.message, loading: false })
      toast.error('Failed to load documents')
    }
  },

  createDocument: async (title: string, writingGoal = 'personal-statement') => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Development mode - create and persist document
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Creating and saving document to localStorage')
        const newDocument: Document = {
          id: uuidv4(),
          userId: user.id,
          title,
          content: '',
          writingGoal: writingGoal as any,
          wordCount: 0,
          status: 'draft',
          metadata: { wordLimit: writingGoal === 'personal-statement' ? 650 : 1000 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Update state
        const newDocuments = [newDocument, ...get().documents]
        set({
          documents: newDocuments,
          currentDocument: newDocument
        })

        // Save to localStorage
        const storageKey = `wordwise_documents_${user.id}`
        localStorage.setItem(storageKey, JSON.stringify(newDocuments))
        console.log('Document saved to localStorage:', newDocument)

        toast.success('📄 Document created successfully!')
        return newDocument.id
      }

      const newDoc = {
        id: uuidv4(),
        user_id: user.id,
        title,
        content: '',
        writing_goal: writingGoal,
        word_count: 0,
        status: 'draft',
        metadata: null
      }

      const { data, error } = await supabase
        .from('documents')
        .insert(newDoc)
        .select()
        .single()

      if (error) throw error

      const document: Document = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        content: data.content,
        writingGoal: data.writing_goal as any,
        wordCount: data.word_count,
        readabilityScore: data.readability_score || undefined,
        status: data.status as any,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      set(state => ({
        documents: [document, ...state.documents],
        currentDocument: document
      }))

      toast.success('Document created successfully!')
      return document.id
    } catch (error: any) {
      console.error('Failed to create document:', error)
      toast.error('Failed to create document')
      throw error
    }
  },

  updateDocument: async (id: string, updates: Partial<Document>) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Calculate word count if content is being updated
      let wordCount = updates.content ? updates.content.trim().split(/\s+/).filter(Boolean).length : undefined

      // Development mode - update and persist document
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Updating and saving document to localStorage')
        
        const currentState = get()
        const existingDoc = currentState.documents.find(doc => doc.id === id)
        if (!existingDoc) {
          console.error('Document not found for update:', id)
          return
        }

        const updatedDocument: Document = {
          ...existingDoc,
          ...updates,
          wordCount: wordCount !== undefined ? wordCount : existingDoc.wordCount,
          updatedAt: new Date().toISOString()
        }

        const updatedDocuments = currentState.documents.map(doc => 
          doc.id === id ? updatedDocument : doc
        )

        // Update state
        set({
          documents: updatedDocuments,
          currentDocument: currentState.currentDocument?.id === id ? updatedDocument : currentState.currentDocument
        })

        // Save to localStorage
        const storageKey = `wordwise_documents_${user.id}`
        localStorage.setItem(storageKey, JSON.stringify(updatedDocuments))
        console.log('Document updated and saved to localStorage:', updatedDocument)
        return
      }

      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.content !== undefined) {
        dbUpdates.content = updates.content
        dbUpdates.word_count = wordCount
      }
      if (updates.writingGoal !== undefined) dbUpdates.writing_goal = updates.writingGoal
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata
      if (updates.readabilityScore !== undefined) dbUpdates.readability_score = updates.readabilityScore

      const { data, error } = await supabase
        .from('documents')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      const updatedDocument: Document = {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        content: data.content,
        writingGoal: data.writing_goal as any,
        wordCount: data.word_count,
        readabilityScore: data.readability_score || undefined,
        status: data.status as any,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      set(state => ({
        documents: state.documents.map(doc => 
          doc.id === id ? updatedDocument : doc
        ),
        currentDocument: state.currentDocument?.id === id ? updatedDocument : state.currentDocument
      }))

    } catch (error: any) {
      console.error('Failed to update document:', error)
      toast.error('Failed to update document')
      throw error
    }
  },

  deleteDocument: async (id: string) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Development mode - delete from localStorage
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Deleting document from localStorage')
        const currentState = get()
        const updatedDocuments = currentState.documents.filter(doc => doc.id !== id)
        
        // Update state
        set({
          documents: updatedDocuments,
          currentDocument: currentState.currentDocument?.id === id ? null : currentState.currentDocument
        })

        // Save to localStorage
        const storageKey = `wordwise_documents_${user.id}`
        localStorage.setItem(storageKey, JSON.stringify(updatedDocuments))
        console.log('Document deleted from localStorage:', id)
        
        toast.success('📄 Document deleted successfully!')
        return
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      set(state => ({
        documents: state.documents.filter(doc => doc.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument
      }))

      toast.success('Document deleted successfully!')
    } catch (error: any) {
      console.error('Failed to delete document:', error)
      toast.error('Failed to delete document')
      throw error
    }
  },

  setCurrentDocument: (document: Document | null) => {
    set({ currentDocument: document })
  },

  saveDocument: async (id: string, content: string) => {
    try {
      await get().updateDocument(id, { content })
    } catch (error) {
      // Already handled in updateDocument
    }
  },

  subscribeToDocuments: () => {
    const user = useAuthStore.getState().user
    if (!user) return () => {}

    // Development mode - skip real-time subscriptions
    if (import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')) {
      console.log('Development mode: Skipping real-time subscriptions')
      return () => {}
    }

    const subscription = supabase
      .channel('documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Document change received:', payload)
          
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT' && newRecord) {
            const newDoc: Document = {
              id: newRecord.id,
              userId: newRecord.user_id,
              title: newRecord.title,
              content: newRecord.content,
              writingGoal: newRecord.writing_goal as any,
              wordCount: newRecord.word_count,
              readabilityScore: newRecord.readability_score || undefined,
              status: newRecord.status as any,
              metadata: newRecord.metadata ? JSON.parse(JSON.stringify(newRecord.metadata)) : undefined,
              createdAt: newRecord.created_at,
              updatedAt: newRecord.updated_at
            }

            set(state => ({
              documents: [newDoc, ...state.documents.filter(doc => doc.id !== newDoc.id)]
            }))
          } else if (eventType === 'UPDATE' && newRecord) {
            const updatedDoc: Document = {
              id: newRecord.id,
              userId: newRecord.user_id,
              title: newRecord.title,
              content: newRecord.content,
              writingGoal: newRecord.writing_goal as any,
              wordCount: newRecord.word_count,
              readabilityScore: newRecord.readability_score || undefined,
              status: newRecord.status as any,
              metadata: newRecord.metadata ? JSON.parse(JSON.stringify(newRecord.metadata)) : undefined,
              createdAt: newRecord.created_at,
              updatedAt: newRecord.updated_at
            }

            set(state => ({
              documents: state.documents.map(doc => 
                doc.id === updatedDoc.id ? updatedDoc : doc
              ),
              currentDocument: state.currentDocument?.id === updatedDoc.id ? updatedDoc : state.currentDocument
            }))
          } else if (eventType === 'DELETE' && oldRecord) {
            set(state => ({
              documents: state.documents.filter(doc => doc.id !== oldRecord.id),
              currentDocument: state.currentDocument?.id === oldRecord.id ? null : state.currentDocument
            }))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },

  unsubscribeFromDocuments: () => {
    supabase.removeAllChannels()
  }
})) 