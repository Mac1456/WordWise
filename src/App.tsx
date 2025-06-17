import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useFirebaseAuthStore } from './stores/firebaseAuthStore'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import EditorPage from './pages/EditorPage'


function App() {
  const { initialize } = useFirebaseAuthStore()

  useEffect(() => {
    // Initialize Firebase authentication system
    const unsubscribe = initialize()
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [initialize])

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/editor/:documentId" element={<EditorPage />} />
        </Routes>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </>
  )
}

export default App 