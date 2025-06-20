/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase configuration (using direct config file instead)
  // readonly VITE_FIREBASE_API_KEY: string
  // readonly VITE_FIREBASE_AUTH_DOMAIN: string
  // readonly VITE_FIREBASE_PROJECT_ID: string
  // readonly VITE_FIREBASE_STORAGE_BUCKET: string
  // readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  // readonly VITE_FIREBASE_APP_ID: string
  
  // AI integration now handled securely via Firebase Cloud Functions
  // No API keys needed in frontend environment
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 