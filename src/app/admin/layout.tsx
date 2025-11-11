'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Users, ShieldCheck } from 'lucide-react'

const adminNavigation = [
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Manage users and accounts',
  },
  {
    name: 'Permissions',
    href: '/admin/permissions',
    icon: ShieldCheck,
    description: 'Configure role permissions',
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Top Navigation Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex space-x-2">
            {adminNavigation.map((item) => {
              const isActive = pathname?.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
