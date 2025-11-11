'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ShieldCheck,
  Clock,
  MessageSquare
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

const navigation = [
  {
    name: 'Dashboard',
    href: '/procurement/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and analytics'
  },
  {
    name: 'Dynamic Dashboard',
    href: '/procurement/dynamic-dashboard',
    icon: BarChart3,
    description: 'Interactive analytics with Metabase'
  },
  {
    name: 'Approvals',
    href: '/approvals',
    icon: Clock,
    description: 'Pending approvals'
  },
  {
    name: 'Consultations',
    href: '/consultations',
    icon: MessageSquare,
    description: 'Consultation requests'
  },
  {
    name: 'Requisitions',
    href: '/procurement/requisitions',
    icon: FileText,
    description: 'Purchase requisitions'
  },

  {
    name: 'Purchase Orders',
    href: '/procurement/purchase-orders',
    icon: ShoppingCart,
    description: 'Purchase order management'
  },
  {
    name: 'RFQ',
    href: '/procurement/rfq',
    icon: FileText,
    description: 'Request for quotation'
  },
  {
    name: 'Goods Receipt',
    href: '/procurement/receipts',
    icon: Truck,
    description: 'Delivery and inspection'
  },
  {
    name: 'Invoices',
    href: '/procurement/invoices',
    icon: Receipt,
    description: 'Invoice processing'
  },
  {
    name: 'Payments',
    href: '/procurement/payments',
    icon: CreditCard,
    description: 'Payment processing'
  },
  {
    name: 'Services',
    href: '/procurement/services/dashboard',
    icon: Settings,
    description: 'Service procurement',
    subItems: [
      { name: 'Dashboard', href: '/procurement/services/dashboard' },
      { name: 'Requisitions', href: '/procurement/services/requisitions' },
      { name: 'Vendors', href: '/procurement/services/vendors' },
      { name: 'Contracts', href: '/procurement/services/contracts' },
      { name: 'Receipts', href: '/procurement/services/receipts' },
      { name: 'Delivery', href: '/procurement/services/delivery' },
      { name: 'Performance', href: '/procurement/services/performance' },
      { name: 'Invoices', href: '/procurement/services/invoices' },
      { name: 'Payments', href: '/procurement/services/payments' },
      { name: 'Analytics', href: '/procurement/services/analytics' }
    ]
  },
          {
          name: 'Reports',
          href: '/procurement/reports',
          icon: BarChart3,
          description: 'Analytics and reports'
        },
        {
          name: 'Automation',
          href: '/procurement/automation',
          icon: Settings,
          description: 'Workflow automation'
        },
        {
          name: 'KPIs',
          href: '/procurement/kpis',
          icon: BarChart3,
          description: 'Key Performance Indicators'
        },
        {
          name: 'Admin',
          href: '/admin/users',
          icon: ShieldCheck,
          description: 'User & System Management',
          requiredRoles: ['ADMIN', 'SUPER_ADMIN']
        }
];

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (item.requiredRoles) {
      return item.requiredRoles.includes(session?.user?.role || '');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar - Wujha white theme with orange accents */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white h-full">
          <div className="flex items-center justify-between px-6 py-6 bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded mr-3 flex items-center justify-center">
                <span className="text-orange-500 font-bold text-sm">W</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">WUJHA HR</h1>
                <p className="text-xs text-orange-100">Procurement</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-orange-100 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h2>
          </div>
          
          <nav className="sidebar-nav flex-1 overflow-y-auto px-4 py-2 min-h-0">
            <div className="space-y-1 pb-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </Link>

                    {/* Render submenu items if they exist and parent is active */}
                    {item.subItems && isActive && (
                      <div className="ml-6 mt-1 space-y-1 mb-2">
                        {item.subItems.map((subItem) => {
                          const subIsActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                subIsActive
                                  ? 'bg-orange-100 text-orange-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar - Wujha white theme with orange accents */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:h-full">
        <div className="flex flex-col flex-grow bg-white shadow-lg border-r border-gray-200 h-full">
          {/* Wujha Header */}
          <div className="flex items-center px-6 py-6 bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0">
            <div className="w-8 h-8 bg-white rounded mr-3 flex items-center justify-center">
              <span className="text-orange-500 font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">WUJHA HR</h1>
              <p className="text-xs text-orange-100 uppercase tracking-wide">Procurement</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h2>
          </div>
          
          <nav className="sidebar-nav flex-1 overflow-y-auto px-4 py-2 min-h-0">
            <div className="space-y-1 pb-4">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                      </div>
                    </Link>

                    {/* Render submenu items if they exist and parent is active */}
                    {item.subItems && isActive && (
                      <div className="ml-6 mt-1 space-y-1 mb-2">
                        {item.subItems.map((subItem) => {
                          const subIsActive = pathname === subItem.href;
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                subIsActive
                                  ? 'bg-orange-100 text-orange-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs font-medium">N</span>
              </div>
              <div className="text-xs text-gray-500">
                WUJHA HR System v1.0
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
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
  );
}
