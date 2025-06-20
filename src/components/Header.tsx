import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFirebaseAuthStore } from '../stores/firebaseAuthStore';
import { Book, LogOut, FileText, Settings, Menu, Sun, Moon } from 'lucide-react';

// A simple hook for detecting clicks outside an element
function useOutsideAlerter(ref: React.RefObject<HTMLDivElement>, callback: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback]);
}

export default function Header() {
  const { user, logout } = useFirebaseAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Basic theme toggle state - can be expanded later
  const [isDarkMode, setIsDarkMode] = useState(false);

  useOutsideAlerter(profileMenuRef, () => setIsProfileMenuOpen(false));

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, you'd also change the class on the `<html>` element
    // document.documentElement.classList.toggle('dark');
  };

  const renderUserMenu = () => (
    <div className="relative" ref={profileMenuRef}>
      <button
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <img
          src={user?.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user?.email}`}
          alt="User"
          className="h-9 w-9 rounded-full object-cover border-2 border-transparent hover:border-blue-500 transition-colors"
        />
      </button>

      {isProfileMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200/80 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-200/80">
            <p className="font-semibold text-gray-800 truncate">{user?.displayName || 'User'}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <div className="py-2">
            <Link to="/dashboard" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <FileText className="h-4 w-4 mr-3" /> My Documents
            </Link>
            <Link to="/account" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <Settings className="h-4 w-4 mr-3" /> Account Settings
            </Link>
            <button onClick={toggleTheme} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              {isDarkMode ? <Sun className="h-4 w-4 mr-3" /> : <Moon className="h-4 w-4 mr-3" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
          <div className="py-2 border-t border-gray-200/80">
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <header className="bg-white/80 border-b border-gray-200/80 sticky top-0 z-40 backdrop-filter backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-2 rounded-lg">
              <Book className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">WordWise</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                {renderUserMenu()}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            {user ? renderUserMenu() : (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Menu className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && !user && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg z-50">
          <div className="px-5 pt-2 pb-3 space-y-1">
            <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              Sign In
            </Link>
            <Link to="/signup" className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
} 