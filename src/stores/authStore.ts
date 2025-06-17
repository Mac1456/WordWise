import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types/supabase'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  initialize: () => void
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  login: async (email: string, password: string) => {
    try {
      // Development mode - always use mock data
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
      
      if (isDevelopment) {
        console.log('Development mode: Simulating login for', email)
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const mockUser = {
          id: 'dev-user-123',
          email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const mockProfile = {
          id: mockUser.id,
          email: mockUser.email,
          fullName: 'Development User',
          preferences: {
            theme: 'light' as const,
            notifications: true,
            autoSave: true,
            suggestionFrequency: 'medium' as const
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

        set({ user: mockUser as any, profile: mockProfile })
        toast.success('✨ Logged in (Development Mode)')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data.user) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError)
        }

        set({ 
          user: data.user,
          profile: profileData ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name || undefined,
            avatarUrl: profileData.avatar_url || undefined,
            preferences: (profileData.preferences as any) || {
              theme: 'light',
              notifications: true,
              autoSave: true,
              suggestionFrequency: 'medium'
            },
            writingGoals: profileData.writing_goals || ['personal-statement'],
            improvementTracking: (profileData.improvement_tracking as any) || {
              grammarScore: 0,
              styleScore: 0,
              vocabularyScore: 0,
              overallProgress: 0,
              weeklyGoals: [],
              achievements: []
            },
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at
          } : null
        })

        toast.success('Welcome back!')
      }
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  },

  register: async (email: string, password: string, fullName?: string) => {
    try {
      // Development mode - always use mock data
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Simulating registration for', email)
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mockUser = {
          id: 'dev-user-' + Date.now(),
          email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { full_name: fullName },
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const mockProfile = {
          id: mockUser.id,
          email: mockUser.email,
          fullName: fullName || 'New User',
          preferences: {
            theme: 'light' as const,
            notifications: true,
            autoSave: true,
            suggestionFrequency: 'medium' as const
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

        set({ user: mockUser as any, profile: mockProfile })
        toast.success('🎉 Account created (Development Mode)')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Create user profile
                 const defaultPreferences = {
           theme: 'light' as 'light' | 'dark',
           notifications: true,
           autoSave: true,
           suggestionFrequency: 'medium' as 'high' | 'medium' | 'low'
         }

        const defaultTracking = {
          grammarScore: 0,
          styleScore: 0,
          vocabularyScore: 0,
          overallProgress: 0,
          weeklyGoals: [],
          achievements: []
        }

        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName || null,
            preferences: defaultPreferences,
            writing_goals: ['personal-statement'],
            improvement_tracking: defaultTracking
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
        }

        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email!,
          fullName,
          preferences: defaultPreferences,
          writingGoals: ['personal-statement'],
          improvementTracking: defaultTracking,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set({ 
          user: data.user,
          profile
        })

        toast.success('Account created successfully! Please check your email to verify your account.')
      }
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  },

  logout: async () => {
    try {
      // Development mode - just clear state
      const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                           import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                           import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')
      
      if (isDevelopment) {
        console.log('Development mode: Simulating logout')
        set({ user: null, profile: null })
        toast.success('👋 Logged out (Development Mode)')
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      set({ user: null, profile: null })
      toast.success('Logged out successfully')
    } catch (error: any) {
      toast.error('Failed to logout')
      throw error
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    try {
      const { user, profile } = get()
      if (!user || !profile) throw new Error('No user logged in')

      const { error } = await supabase
        .from('users')
        .update({
          full_name: updates.fullName,
          preferences: updates.preferences,
          writing_goals: updates.writingGoals,
          improvement_tracking: updates.improvementTracking,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      set({
        profile: {
          ...profile,
          ...updates,
          updatedAt: new Date().toISOString()
        }
      })

      toast.success('Profile updated successfully')
    } catch (error: any) {
      toast.error('Failed to update profile')
      throw error
    }
  },

  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      toast.success('Password reset email sent')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  },

  initialize: () => {
    // Development mode - skip Supabase initialization
    const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                         import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
    
    if (isDevelopment) {
      console.log('Development mode: Skipping Supabase auth initialization')
      set({ loading: false })
      return
    }

    // Listen to auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user profile
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error)
        }

        set({ 
          user: session.user,
          profile: profileData ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name || undefined,
            avatarUrl: profileData.avatar_url || undefined,
            preferences: (profileData.preferences as any) || {
              theme: 'light',
              notifications: true,
              autoSave: true,
              suggestionFrequency: 'medium'
            },
            writingGoals: profileData.writing_goals || ['personal-statement'],
            improvementTracking: (profileData.improvement_tracking as any) || {
              grammarScore: 0,
              styleScore: 0,
              vocabularyScore: 0,
              overallProgress: 0,
              weeklyGoals: [],
              achievements: []
            },
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at
          } : null,
          loading: false
        })
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, loading: false })
      } else {
        set({ loading: false })
      }
    })

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // This will trigger the onAuthStateChange above
      } else {
        set({ loading: false })
      }
    })
  }
})) 