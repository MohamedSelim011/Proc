'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { ToastProvider } from '@/components/ui/toast';
import Sidebar from '@/components/layout/sidebar';
import { getUserData } from '@/lib/jwt';

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    department?: string;
    employeeId?: string;
  } | null>(null);

  useEffect(() => {
    // Get user data from localStorage or JWT
    const userData = getUserData();
    setUser(userData);
  }, []);

  const handleLogout = () => {
    // Clear all localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    // Redirect to login
    router.push('/login');
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return 'U';
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation - Wujha style */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page Title */}
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          </div>

          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Dark Mode Toggle */}
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <div className="w-5 h-5 rounded-full border-2 border-current"></div>
            </button>
            
            {/* Notifications */}
            <NotificationBell />
            
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
            
            {/* User Profile with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-x-3 focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-wujha-primary flex items-center justify-center hover:bg-wujha-primary-hover transition-colors">
                  <span className="text-sm font-medium text-white">{getUserInitials()}</span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user?.email || 'user@example.com'}
                        </p>
                        {user?.role && (
                          <p className="text-xs text-wujha-primary font-medium mt-1">
                            {user.role}
                          </p>
                        )}
                      </div>
                      
                      {/* Profile Link */}
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          // Navigate to profile page
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        <User className="mr-3 h-4 w-4 text-gray-400" />
                        Your Profile
                      </button>
                      
                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        role="menuitem"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-red-600" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
