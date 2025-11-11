'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Shield,
  Clock,
  MessageSquare,
  BarChart3,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { usePermissions } from '@/hooks/usePermissions'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string // Permission required to see this item
  permissions?: string[] // Multiple permissions (any of them)
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Approvals',
    href: '/approvals',
    icon: Clock,
    permissions: ['pr.approve', 'po.approve', 'invoice.approve', 'payment.approve'],
  },
  {
    name: 'Consultations',
    href: '/consultations',
    icon: MessageSquare,
  },
  {
    name: 'Purchase Requisitions',
    href: '/purchase-requisitions',
    icon: FileText,
    permission: 'pr.read',
  },
  {
    name: 'Purchase Orders',
    href: '/purchase-orders',
    icon: ShoppingCart,
    permission: 'po.read',
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: DollarSign,
    permission: 'invoice.read',
  },
  {
    name: 'Goods Receipt',
    href: '/goods-receipt',
    icon: Package,
    permission: 'gr.read',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports.view',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'users.read',
  },
  {
    name: 'Permissions',
    href: '/admin/permissions',
    icon: Shield,
    permission: 'users.read', // Only admins can see this
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings.view',
  },
]

export function AppHeader() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  // Filter navigation items based on permissions
  const visibleNavItems = navigationItems.filter((item) => {
    // No permission required - show to everyone
    if (!item.permission && !item.permissions) {
      return true
    }

    // Single permission required
    if (item.permission) {
      return hasPermission(item.permission)
    }

    // Multiple permissions (any of them)
    if (item.permissions) {
      return hasAnyPermission(item.permissions)
    }

    return false
  })

  if (!session) {
    return null
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">Wujha</span>
              <span className="ml-2 text-sm text-gray-600">Procurement</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {!isLoading &&
              visibleNavItems.slice(0, 6).map((item) => {
                const isActive = pathname?.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
          </nav>

          {/* Right side - Notifications & User */}
          <div className="flex items-center gap-4">
            <NotificationBell />

            {/* User dropdown */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500">{session.user?.role}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation (optional - below header) */}
      <div className="md:hidden border-t border-gray-200 bg-gray-50 px-4 py-3 overflow-x-auto">
        <div className="flex space-x-2">
          {!isLoading &&
            visibleNavItems.map((item) => {
              const isActive = pathname?.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
        </div>
      </div>
    </header>
  )
}
