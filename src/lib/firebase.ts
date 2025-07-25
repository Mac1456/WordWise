import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import firebaseConfig from '../firebase-config'

// Check if we have a valid Firebase configuration
const isDevelopment = !firebaseConfig.apiKey || 
                      firebaseConfig.apiKey.includes('PASTE_YOUR_API_KEY_HERE') ||
                      firebaseConfig.apiKey.includes('demo') ||
                      firebaseConfig.projectId === 'wordwise-ai-demo' ||
                      firebaseConfig.apiKey === 'your-api-key-here'

if (isDevelopment) {
  console.warn('⚠️ Running in development mode without Firebase configuration. Using local storage fallback.')
  console.log('To set up Firebase:')
  console.log('1. Create a Firebase project at https://console.firebase.google.com')
  console.log('2. Add your config to src/firebase-config.ts file')
} else {
  console.log('✅ Firebase configured successfully! Connected to project:', firebaseConfig.projectId)
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

// Temporarily disable emulator connection to fix website access
// Connect to emulators for local development and testing
const isEmulator = false // Disabled for now - use production Firebase
if (isEmulator) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
    connectFunctionsEmulator(functions, 'localhost', 5001)
    console.log('✅ Connected to Firebase emulators for testing')
  } catch (error) {
    console.log('Firebase emulators not available or already connected')
  }
}

export { isDevelopment }
export default app 