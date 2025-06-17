import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// For development without Supabase setup
const isDevelopment = !import.meta.env.VITE_SUPABASE_URL || 
                      import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
                      import.meta.env.VITE_SUPABASE_URL.includes('your-project-id')

if (isDevelopment) {
  console.warn('⚠️ Running in development mode without Supabase configuration. Some features will be limited.')
  console.log('Current VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
  console.log('Current VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Export types for convenience
export type { Database } from '../types/supabase' 