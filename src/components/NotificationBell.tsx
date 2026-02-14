'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { NotificationDropdown } from './NotificationDropdown'
import { apiFetch } from '@/lib/apiFetch'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch unread notification count (use apiFetch so JWT is sent)
  const fetchUnreadCount = async () => {
    try {
      const response = await apiFetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count ?? 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadCount()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleNotificationRead = () => {
    // Refresh count when notification is read
    fetchUnreadCount()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center h-5 min-w-[20px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 z-20">
            <NotificationDropdown
              onClose={() => setIsOpen(false)}
              onNotificationRead={handleNotificationRead}
            />
          </div>
        </>
      )}
    </div>
  )
}
