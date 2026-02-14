'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Clock, FileText, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { apiFetch } from '@/lib/apiFetch'

interface Notification {
  id: string
  documentType: string
  documentId: string
  raciType: string
  notificationType: string
  isRead: boolean
  createdAt: string
}

/** URL for opening the document linked to a notification */
function getNotificationUrl(documentType: string, documentId: string): string | null {
  const type = (documentType || '').toUpperCase().replace(/-/g, '_')
  switch (type) {
    case 'SERVICE_CONTRACT':
      return `/procurement/services/contracts/${documentId}`
    case 'PR':
    case 'PURCHASE_REQUISITION':
      return `/procurement/requisitions/${documentId}`
    case 'PO':
    case 'PURCHASE_ORDER':
      return `/procurement/purchase-orders/${documentId}`
    default:
      return `/procurement/services/contracts/${documentId}` // fallback for unknown types that might be contracts
  }
}

/** Human-friendly label for document type */
function getDocumentTypeLabel(documentType: string): string {
  const type = (documentType || '').toUpperCase().replace(/-/g, '_')
  const labels: Record<string, string> = {
    SERVICE_CONTRACT: 'Service contract',
    PR: 'Purchase requisition',
    PURCHASE_REQUISITION: 'Purchase requisition',
    PO: 'Purchase order',
    PURCHASE_ORDER: 'Purchase order',
  }
  return labels[type] || documentType || 'Document'
}

interface NotificationDropdownProps {
  onClose: () => void
  onNotificationRead: () => void
}

export function NotificationDropdown({
  onClose,
  onNotificationRead,
}: NotificationDropdownProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/api/notifications?limit=20')
      if (response.ok) {
        const data = await response.json()
        setNotifications(Array.isArray(data) ? data : (data.notifications || []))
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await apiFetch(
        `/api/notifications/${notificationId}/mark-read`,
        { method: 'PATCH' }
      )

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        onNotificationRead()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        )
        onNotificationRead()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (documentType: string) => {
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  const getNotificationMessage = (notification: Notification) => {
    const label = getDocumentTypeLabel(notification.documentType)
    const shortId = notification.documentId.slice(0, 8)
    if ((notification.raciType || '').toUpperCase() === 'ACCOUNTABLE') {
      return `Approval required: ${label} #${shortId}`
    }
    return `Update on ${label} #${shortId}`
  }

  const handleNotificationClick = async (notification: Notification) => {
    const url = getNotificationUrl(notification.documentType, notification.documentId)
    if (url) {
      onClose()
      router.push(url)
    }
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
  }

  return (
    <div className="w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-center">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNotificationClick(notification)
                  }
                }}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.documentType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.isRead
                          ? 'font-semibold text-gray-900'
                          : 'text-gray-700'
                      }`}
                    >
                      {getNotificationMessage(notification)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 bg-blue-600 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
