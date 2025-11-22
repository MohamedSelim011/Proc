'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { ToastProvider } from '@/components/ui/toast';
import Sidebar from '@/components/layout/sidebar';

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            
            {/* User Profile */}
            <div className="flex items-center gap-x-3">
              <div className="h-8 w-8 rounded-full bg-wujha-primary flex items-center justify-center">
                <span className="text-sm font-medium text-white">AU</span>
              </div>
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
