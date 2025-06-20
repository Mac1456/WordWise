import { create } from 'zustand'
import { useFirebaseAuthStore, AuthState } from './firebaseAuthStore'
import toast from 'react-hot-toast'
import { v4 as uuidv4 } from 'uuid'
import { db, isDevelopment } from '../lib/firebase'
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp
} from 'firebase/firestore'

// Define Document type locally
interface Document {
  id: string
  userId: string
  title: string
  content: string
  writingGoal: 'personal-statement' | 'essay' | 'cover-letter' | 'academic' | 'creative' | 'business'
  wordCount: number
  readabilityScore?: number
  status: 'draft' | 'reviewing' | 'completed'
  metadata?: {
    wordLimit?: number
    targetAudience?: string
    keyRequirements?: string[]
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

interface DocumentState {
  documents: Document[]
  currentDocument: Document | null
  loading: boolean
  error: string | null
  isInitialized: boolean; // Track if store has been initialized with auth state
  // Actions
  init: () => void; // New initializer
  clearDocuments: () => void; // New action to clear state
  loadDocuments: () => Promise<void>
  createDocument: (title: string, writingGoal?: string) => Promise<string>
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  setCurrentDocument: (document: Document | null) => void
  saveDocument: (id: string, content: string) => Promise<void>
}

let authListenerUnsubscribe: (() => void) | null = null;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  loading: false,
  error: null,
  isInitialized: false,

  init: () => {
    if (get().isInitialized || authListenerUnsubscribe) {
      console.log('Document store already initialized.');
      return;
    }

    console.log('🔄 Initializing document store and subscribing to auth changes...');

    const handleAuthChange = (user: AuthState['user']) => {
      console.log('🔔 Document store received auth state change:', user ? user.uid : 'null');
      if (user) {
        get().loadDocuments();
      } else {
        get().clearDocuments();
      }
    };

    // Subscribe to the auth store
    authListenerUnsubscribe = useFirebaseAuthStore.subscribe(
      (state) => state.user,
      handleAuthChange
    );

    // Initial check
    const initialUser = useFirebaseAuthStore.getState().user;
    if (initialUser) {
      handleAuthChange(initialUser);
    }

    set({ isInitialized: true });
  },

  clearDocuments: () => {
    console.log('🧹 Clearing all documents and current document.');
    set({
      documents: [],
      currentDocument: null,
      loading: false,
      error: null
    });
  },

  loadDocuments: async () => {
    const user = useFirebaseAuthStore.getState().user;
    if (!user) {
      console.log('loadDocuments skipped: no authenticated user.');
      // Don't throw an error, just return. The store will be cleared by `clearDocuments`.
      return;
    }
    
    set({ loading: true, error: null });

    try {
      if (isDevelopment) {
        // Development mode: use localStorage
        console.log('Development mode: Loading documents from localStorage')
        const storageKey = `wordwise_documents_${user.uid}`
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
              userId: user.uid,
              title: 'My Personal Statement Draft',
              content: 'This is a sample personal statement for college applications. I am passionate about learning and contributing to my community...',
              writingGoal: 'personal-statement',
              wordCount: 150,
              readabilityScore: 8.5,
              status: 'draft',
              metadata: { wordLimit: 650 },
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'doc-2',
              userId: user.uid,
              title: 'Essay on Leadership',
              content: 'Leadership is not just about giving orders, but about inspiring others to achieve their best...',
              writingGoal: 'essay',
              wordCount: 200,
              readabilityScore: 9.2,
              status: 'reviewing',
              metadata: { wordLimit: 750 },
              createdAt: new Date(Date.now() - 172800000).toISOString(),
              updatedAt: new Date(Date.now() - 7200000).toISOString()
            }
          ]
          localStorage.setItem(storageKey, JSON.stringify(documents))
          console.log('Created and saved sample documents to localStorage')
        }
        
        set({ documents, loading: false })
      } else {
        // Production mode: use Firebase Firestore
        console.log('Loading documents from Firebase Firestore')
        
        // Simple query without orderBy to avoid index requirement
        const q = query(
          collection(db, 'documents'),
          where('userId', '==', user.uid)
        )
        
        const querySnapshot = await getDocs(q)
        const documents: Document[] = []
        
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() } as Document)
        })

        // Sort documents client-side by updatedAt (newest first)
        documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        console.log('Loaded documents from Firestore:', documents)
        set({ documents, loading: false })
      }
    } catch (error: any) {
      console.error('Failed to load documents:', error)
      set({ error: error.message, loading: false })
      // toast.error('Failed to load documents'); // Let's not toast on initial load failure, it can be aggressive.
    }
  },

  createDocument: async (title: string, writingGoal = 'personal-statement') => {
    const user = useFirebaseAuthStore.getState().user;
    if (!user) {
      toast.error('You must be logged in to create a document.');
      throw new Error('User not authenticated');
    }
    
    try {
      console.log('Creating document with Firebase config. isDevelopment:', isDevelopment)

      if (isDevelopment) {
        // Development mode: use localStorage
        console.log('Development mode: Creating and saving document to localStorage')
        const newDocument: Document = {
          id: uuidv4(),
          userId: user.uid,
          title,
          content: '',
          writingGoal: writingGoal as any,
          wordCount: 0,
          readabilityScore: 0,
          status: 'draft',
          metadata: { wordLimit: writingGoal === 'personal-statement' ? 650 : 1000 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const newDocuments = [newDocument, ...get().documents]
        set({
          documents: newDocuments,
          currentDocument: newDocument
        })

        const storageKey = `wordwise_documents_${user.uid}`
        localStorage.setItem(storageKey, JSON.stringify(newDocuments))
        console.log('Document saved to localStorage:', newDocument)

        toast.success('📄 Document created successfully!')
        return newDocument.id
      } else {
        // Production mode: use Firebase Firestore
        console.log('Creating document in Firebase Firestore for user:', user.uid)
        
        const newDocumentData = {
          userId: user.uid,
          title,
          content: '',
          writingGoal: writingGoal as Document['writingGoal'],
          wordCount: 0,
          readabilityScore: 0,
          status: 'draft' as Document['status'],
          metadata: { wordLimit: writingGoal === 'personal-statement' ? 650 : 1000 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('Document data to be saved:', newDocumentData)
        
        const docRef = await addDoc(collection(db, 'documents'), newDocumentData)
        const createdDoc: Document = { id: docRef.id, ...newDocumentData }

        set({
          documents: [createdDoc, ...get().documents],
          currentDocument: createdDoc
        })

        console.log('Document created successfully in Firestore with ID:', docRef.id)
        toast.success('📄 Document created successfully!')
        return docRef.id
      }
    } catch (error: any) {
      console.error('Failed to create document:', error)
      console.error('Error details:', error.message)
      console.error('Error code:', error.code)
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore security rules.')
      } else if (error.code === 'unavailable') {
        toast.error('Firestore is currently unavailable. Please try again.')
      } else {
        toast.error(`Failed to create document: ${error.message}`)
      }
      throw error
    }
  },

  updateDocument: async (id: string, updates: Partial<Document>) => {
    const user = useFirebaseAuthStore.getState().user;
    if (!user) {
      toast.error('You must be logged in to update a document.');
      throw new Error('User not authenticated');
    }

    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (isDevelopment) {
        // Development mode: use localStorage
        const documents = get().documents
        const docIndex = documents.findIndex(doc => doc.id === id)
        
        if (docIndex === -1) {
          throw new Error('Document not found')
        }

        const updatedDoc = { ...documents[docIndex], ...updatedData }
        const newDocuments = [...documents]
        newDocuments[docIndex] = updatedDoc

        set({ documents: newDocuments })

        if (get().currentDocument?.id === id) {
          set({ currentDocument: updatedDoc })
        }

        const storageKey = `wordwise_documents_${user.uid}`
        localStorage.setItem(storageKey, JSON.stringify(newDocuments))
        console.log('Document updated in localStorage:', updatedDoc)
      } else {
        // Production mode: use Firebase Firestore
        const docRef = doc(db, 'documents', id);
        
        // Ensure the document belongs to the current user before updating
        // Note: This is client-side validation. Use Firestore rules for security.
        const currentDoc = get().documents.find(d => d.id === id);
        if (currentDoc && currentDoc.userId !== user.uid) {
          throw new Error("Permission denied: You don't own this document.");
        }
        
        await updateDoc(docRef, updatedData);
        console.log('Document updated in Firestore:', id);
      }
    } catch (error: any) {
      console.error('Failed to update document:', error)
      toast.error('Failed to update document')
      throw error
    }
  },

  deleteDocument: async (id: string) => {
    const user = useFirebaseAuthStore.getState().user;
    if (!user) {
      toast.error('You must be logged in to delete a document.');
      throw new Error('User not authenticated');
    }
    
    try {
      if (isDevelopment) {
        // Development mode: use localStorage
        const documents = get().documents
        const newDocuments = documents.filter(doc => doc.id !== id)

        set({ documents: newDocuments })

        if (get().currentDocument?.id === id) {
          set({ currentDocument: null })
        }

        const storageKey = `wordwise_documents_${user.uid}`
        localStorage.setItem(storageKey, JSON.stringify(newDocuments))
        console.log('Document deleted from localStorage')
      } else {
        // Production mode: use Firebase Firestore
        const docRef = doc(db, 'documents', id);

        const currentDoc = get().documents.find(d => d.id === id);
        if (currentDoc && currentDoc.userId !== user.uid) {
          throw new Error("Permission denied: You don't own this document.");
        }

        await deleteDoc(docRef);
        console.log('Document deleted from Firestore:', id);
      }

      // If the deleted document was the current one, clear it
      if (get().currentDocument?.id === id) {
        set({ currentDocument: null });
      }

      toast.success('🗑️ Document deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete document:', error)
      toast.error(`Failed to delete document: ${error.message}`)
    }
  },

  setCurrentDocument: (document: Document | null) => {
    set({ currentDocument: document })
  },

  saveDocument: async (id: string, content: string) => {
    try {
      const currentDoc = get().documents.find(doc => doc.id === id);
      if (!currentDoc) {
        throw new Error('Document not found');
      }

      // Avoid saving if content is unchanged
      if (currentDoc.content === content) {
        return;
      }
      
      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

      await get().updateDocument(id, { content, wordCount });

      // No toast needed for auto-save to avoid being noisy
      console.log(`📝 Document ${id} auto-saved.`);

    } catch (error: any) {
      console.error('Failed to save document:', error)
      toast.error(`Failed to save document: ${error.message}`)
    }
  }
}))

export type { Document } 