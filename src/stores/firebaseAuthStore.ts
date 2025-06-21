import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth'
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { auth, db, isDevelopment } from '../lib/firebase'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  fullName?: string
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
    autoSave: boolean
    suggestionFrequency: 'high' | 'medium' | 'low'
  }
  writingGoals: string[]
  improvementTracking: {
    grammarScore: number
    styleScore: number
    vocabularyScore: number
    overallProgress: number
    weeklyGoals: any[]
    achievements: any[]
  }
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  initialize: () => (() => void)
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const useFirebaseAuthStore = create(
  subscribeWithSelector<AuthState>(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,

      login: async (email: string, password: string) => {
        try {
          console.log('🔐 Attempting Firebase login for:', email)
          
          // Development mode - use mock authentication
          if (isDevelopment) {
            console.log('Development mode: Simulating Firebase login')
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500))
            
            const mockUser = {
              uid: 'dev-user-firebase-123',
              email,
              emailVerified: true,
              displayName: 'Development User',
              photoURL: null,
              phoneNumber: null,
              providerId: 'firebase',
              metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString()
              }
            } as FirebaseUser
            
            const mockProfile: UserProfile = {
              id: mockUser.uid,
              email: mockUser.email!,
              fullName: 'Development User',
              preferences: {
                theme: 'light',
                notifications: true,
                autoSave: true,
                suggestionFrequency: 'medium'
              },
              writingGoals: ['personal-statement'],
              improvementTracking: {
                grammarScore: 75,
                styleScore: 80,
                vocabularyScore: 70,
                overallProgress: 75,
                weeklyGoals: [],
                achievements: []
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

            set({ user: mockUser, profile: mockProfile, loading: false })
            toast.success('✨ Logged in (Firebase Development Mode)')
            return
          }

          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          console.log('✅ Firebase login successful:', userCredential.user.email)
          
          // Fetch user profile from Firestore
          const profileDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
          let profile: UserProfile | null = null
          
          if (profileDoc.exists()) {
            const data = profileDoc.data()
            profile = {
              id: data.id,
              email: data.email,
              fullName: data.fullName,
              preferences: data.preferences || {
                theme: 'light',
                notifications: true,
                autoSave: true,
                suggestionFrequency: 'medium'
              },
              writingGoals: data.writingGoals || ['personal-statement'],
              improvementTracking: data.improvementTracking || {
                grammarScore: 0,
                styleScore: 0,
                vocabularyScore: 0,
                overallProgress: 0,
                weeklyGoals: [],
                achievements: []
              },
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            }
          } else {
            // Create profile for existing user who doesn't have one
            console.log('Creating basic profile for existing user:', userCredential.user.email)
            profile = {
              id: userCredential.user.uid,
              email: userCredential.user.email!,
              fullName: userCredential.user.displayName || 'User',
              preferences: {
                theme: 'light',
                notifications: true,
                autoSave: true,
                suggestionFrequency: 'medium'
              },
              writingGoals: ['personal-statement'],
              improvementTracking: {
                grammarScore: 0,
                styleScore: 0,
                vocabularyScore: 0,
                overallProgress: 0,
                weeklyGoals: [],
                achievements: []
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

            // Save the new profile to Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              ...profile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            
            console.log('Basic profile created successfully for existing user')
          }

          set({ user: userCredential.user, profile, loading: false })
          toast.success('Welcome back!')
          
        } catch (error: any) {
          console.error('❌ Firebase login failed:', error)
          let errorMessage = 'Login failed'
          
          if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email'
          } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password'
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address'
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later'
          }
          
          toast.error(errorMessage)
          throw new Error(errorMessage)
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        try {
          console.log('📝 Attempting Firebase registration for:', email)
          
          // Development mode
          if (isDevelopment) {
            console.log('Development mode: Simulating Firebase registration')
            await new Promise(resolve => setTimeout(resolve, 500))
            
            const mockUser = {
              uid: 'dev-user-firebase-new-123',
              email,
              emailVerified: false,
              displayName: fullName || 'New User',
              photoURL: null,
              phoneNumber: null,
              providerId: 'firebase'
            } as FirebaseUser

            const profile: UserProfile = {
              id: mockUser.uid,
              email: mockUser.email!,
              fullName,
              preferences: {
                theme: 'light',
                notifications: true,
                autoSave: true,
                suggestionFrequency: 'medium'
              },
              writingGoals: ['personal-statement'],
              improvementTracking: {
                grammarScore: 0,
                styleScore: 0,
                vocabularyScore: 0,
                overallProgress: 0,
                weeklyGoals: [],
                achievements: []
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }

            set({ user: mockUser, profile })
            toast.success('✨ Account created (Firebase Development Mode)')
            return
          }

          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          console.log('✅ Firebase registration successful:', userCredential.user.email)
          
          // Update display name
          if (fullName) {
            await updateProfile(userCredential.user, { displayName: fullName })
          }
          
          // Create user profile in Firestore automatically
          const profile: UserProfile = {
            id: userCredential.user.uid,
            email: userCredential.user.email!,
            fullName,
            preferences: {
              theme: 'light',
              notifications: true,
              autoSave: true,
              suggestionFrequency: 'medium'
            },
            writingGoals: ['personal-statement'],
            improvementTracking: {
              grammarScore: 0,
              styleScore: 0,
              vocabularyScore: 0,
              overallProgress: 0,
              weeklyGoals: [],
              achievements: []
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await setDoc(doc(db, 'users', userCredential.user.uid), {
            ...profile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          set({ user: userCredential.user, profile })
          toast.success('Account created successfully!')
          
        } catch (error: any) {
          console.error('❌ Firebase registration failed:', error)
          let errorMessage = 'Registration failed'
          
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists'
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters'
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address'
          }
          
          toast.error(errorMessage)
          throw new Error(errorMessage)
        }
      },

      logout: async () => {
        try {
          if (isDevelopment) {
            console.log('Development mode: Simulating Firebase logout')
            set({ user: null, profile: null })
            toast.success('👋 Logged out (Development Mode)')
            return
          }

          await signOut(auth)
          set({ user: null, profile: null })
          toast.success('Logged out successfully')
        } catch (error: any) {
          console.error('❌ Firebase logout failed:', error)
          toast.error('Failed to logout')
          throw error
        }
      },

      updateProfile: async (updates: Partial<UserProfile>) => {
        try {
          const { user, profile } = get()
          if (!user || !profile) throw new Error('No user logged in')

          if (isDevelopment) {
            const updatedProfile = { ...profile, ...updates, updatedAt: new Date().toISOString() }
            set({ profile: updatedProfile })
            toast.success('Profile updated (Development Mode)')
            return
          }

          const updatedProfile = { ...profile, ...updates, updatedAt: new Date().toISOString() }
          
          await updateDoc(doc(db, 'users', user.uid), {
            ...updates,
            updatedAt: serverTimestamp()
          })

          set({ profile: updatedProfile })
          toast.success('Profile updated successfully')
        } catch (error: any) {
          console.error('❌ Profile update failed:', error)
          toast.error('Failed to update profile')
          throw error
        }
      },



      resetPassword: async (email: string) => {
        try {
          if (isDevelopment) {
            toast.success('Password reset email sent (Development Mode)')
            return
          }

          await sendPasswordResetEmail(auth, email)
          toast.success('Password reset email sent')
        } catch (error: any) {
          console.error('❌ Password reset failed:', error)
          toast.error(error.message)
          throw error
        }
      },

      initialize: () => {
        if (isDevelopment) {
          console.log('Firebase development mode: Skipping auth listener')
          set({ loading: false })
          return () => {} // Return empty cleanup function
        }

        console.log('🔄 Initializing Firebase auth state listener')
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log('🔔 Firebase auth state changed:', user?.email || 'No user')
          
          if (user) {
            // Fetch user profile
            const profileDoc = await getDoc(doc(db, 'users', user.uid))
            let profile: UserProfile | null = null
            
            if (profileDoc.exists()) {
              const data = profileDoc.data()
              profile = {
                id: data.id,
                email: data.email,
                fullName: data.fullName,
                preferences: data.preferences || {
                  theme: 'light',
                  notifications: true,
                  autoSave: true,  
                  suggestionFrequency: 'medium'
                },
                writingGoals: data.writingGoals || ['personal-statement'],
                improvementTracking: data.improvementTracking || {
                  grammarScore: 0,
                  styleScore: 0,
                  vocabularyScore: 0,
                  overallProgress: 0,
                  weeklyGoals: [],
                  achievements: []
                },
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString()
              }
            } else {
              // Create profile for existing user who doesn't have one
              console.log('Creating basic profile for existing user in auth state listener:', user.email)
              profile = {
                id: user.uid,
                email: user.email!,
                fullName: user.displayName || 'User',
                preferences: {
                  theme: 'light',
                  notifications: true,
                  autoSave: true,
                  suggestionFrequency: 'medium'
                },
                writingGoals: ['personal-statement'],
                improvementTracking: {
                  grammarScore: 0,
                  styleScore: 0,
                  vocabularyScore: 0,
                  overallProgress: 0,
                  weeklyGoals: [],
                  achievements: []
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }

              try {
                // Save the new profile to Firestore
                await setDoc(doc(db, 'users', user.uid), {
                  ...profile,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                })
                
                console.log('Basic profile created successfully for existing user in auth state listener')
              } catch (error) {
                console.error('Failed to create profile for existing user:', error)
              }
            }

            set({ user, profile, loading: false })
          } else {
            set({ user: null, profile: null, loading: false })
          }
        })

        // Return cleanup function
        return unsubscribe
      }
    })
  )
) 