// Test Supabase Connection
import dotenv from 'dotenv'
dotenv.config()

console.log('🧪 Testing Supabase Connection...')
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'NOT SET')
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET ✅' : 'NOT SET ❌')

// Check if URL looks valid
const url = process.env.VITE_SUPABASE_URL
if (url && url.includes('.supabase.co') && !url.includes('placeholder')) {
  console.log('✅ Supabase URL looks valid!')
} else {
  console.log('❌ Supabase URL invalid or missing')
}

// Check development mode detection
const isDevelopment = !process.env.VITE_SUPABASE_URL || 
                      process.env.VITE_SUPABASE_URL.includes('placeholder') ||
                      process.env.VITE_SUPABASE_URL.includes('your-project-id')

console.log('Development mode detected:', isDevelopment ? '❌ YES (should be NO)' : '✅ NO (production mode)') 