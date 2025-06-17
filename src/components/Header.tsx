import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { PenTool, User, LogOut, FileText } from 'lucide-react'

export default function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <PenTool className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">WordWise AI</h1>
              <p className="text-xs text-gray-500">Write with confidence</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>My Documents</span>
                </Link>
                <Link 
                  to="/editor" 
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  New Document
                </Link>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-gray-700">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            {user ? (
              <div className="flex items-center space-x-2">
                <Link 
                  to="/editor" 
                  className="bg-primary-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Write
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 