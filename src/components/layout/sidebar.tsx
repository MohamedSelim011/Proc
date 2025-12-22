'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUserData } from '@/lib/jwt';
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
  X,
  ShieldCheck,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Briefcase,
  ClipboardList,
  Send,
  TrendingUp
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  subItems?: Array<{ 
    name: string; 
    href: string; 
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  requiredRoles?: string[];
  expandable?: boolean; // If true, clicking parent only expands, doesn't navigate
}

const navigation: NavigationItem[] = [
    {
        name: 'Analytics',
        href: '#', // Make it non-navigable - only expandable
        icon: Settings,
        description: 'Procurement Management Analytics',
        subItems: [
          { name: 'Dashboard', href: '/procurement/dashboard', icon: LayoutDashboard },
          { name: 'Dynamic Dashboard', href: '/procurement/dynamic-dashboard', icon: BarChart3 },
          { name: 'Reports', href: '/procurement/reports', icon: BarChart3 },
          { name: 'Dynamic Reports', href: '/procurement/dynamic-reports', icon: BarChart3 },
        ],
        expandable: true // Mark as expandable
      },

  {
    name: 'Vendors',
    href: '/procurement/services/vendors',
    icon: Users,
    description: 'Vendor/Suppliers Management'
  },
//   {
//     name: 'Approvals',
//     href: '/approvals',
//     icon: Clock,
//     description: 'Pending approvals'
//   },
//   {
//     name: 'Consultations',
//     href: '/consultations',
//     icon: MessageSquare,
//     description: 'Consultation requests'
//   },
  {
    name: 'Requisitions',
    href: '/procurement/requisitions',
    icon: FileText,
    description: 'Purchase requisitions'
  },
  {
    name: 'RFQ',
    href: '/procurement/rfq',
    icon: FileText,
    description: 'Request for quotation'
  },
  {
    name: 'Purchase Orders',
    href: '/procurement/purchase-orders',
    icon: ShoppingCart,
    description: 'Purchase order management'
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
    href: '#', // Make it non-navigable - only expandable
    icon: Briefcase,
    description: 'Service procurement',
    subItems: [
      { name: 'Service Requests', href: '/procurement/services/dashboard', icon: ClipboardList },
      { name: 'Requisitions', href: '/procurement/services/requisitions', icon: FileText },
      { name: 'RFPs', href: '/procurement/services/rfp', icon: Send },
      { name: 'Contracts', href: '/procurement/services/contracts', icon: CreditCard },
      { name: 'Receipts', href: '/procurement/services/receipts', icon: Receipt },
      { name: 'Performance', href: '/procurement/services/performance', icon: TrendingUp },
    //   { name: 'Delivery', href: '/procurement/services/delivery', icon: Truck },
    //   { name: 'Performance', href: '/procurement/services/performance', icon: BarChart3 },
    //   { name: 'Invoices', href: '/procurement/services/invoices', icon: Receipt },
    //   { name: 'Payments', href: '/procurement/services/payments', icon: CreditCard },
    //   { name: 'Analytics', href: '/procurement/services/analytics', icon: BarChart3 }
    ],
    expandable: true // Mark as expandable
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

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, []);

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (item.requiredRoles) {
      return item.requiredRoles.includes(user?.role || '');
    }
    return true;
  });

  // Initialize expanded state - expand Services if any subItem is active
  const shouldBeExpanded = (item: NavigationItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => 
      pathname === subItem.href || pathname.startsWith(subItem.href + '/')
    );
  };

  // Toggle expansion for an item
  const toggleExpansion = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Check if an item is expanded
  const isExpanded = (item: NavigationItem) => {
    if (shouldBeExpanded(item)) {
      // Auto-expand if a subItem is active
      return true;
    }
    return expandedItems.has(item.name);
  };

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white h-full">
          <div className="flex items-center justify-between px-6 py-6 bg-wujha-primary flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded mr-3 flex items-center justify-center">
                <span className="text-wujha-primary font-bold text-sm">W</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">WUJHA</h1>
                <p className="text-xs text-white/80">Procurement</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white/80 hover:text-white"
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
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const itemExpanded = isExpanded(item);
                const isSubItemActive = hasSubItems && item.subItems!.some(subItem => 
                  pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                );
                const isActive = !item.expandable && (pathname === item.href || pathname.startsWith(item.href + '/'));

                return (
                  <div key={item.name}>
                    {item.expandable && hasSubItems ? (
                      // Expandable item - click toggles expansion
                      <button
                        onClick={() => {
                          toggleExpansion(item.name);
                          setSidebarOpen(false);
                        }}
                        className={`group w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                          isSubItemActive
                            ? 'bg-wujha-primary/10 text-wujha-primary'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          <item.icon className={`mr-3 h-4 w-4 ${isSubItemActive ? 'text-wujha-primary' : 'text-gray-500'}`} />
                          <div className="font-medium">{item.name}</div>
                        </div>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 ${itemExpanded ? 'rotate-180' : ''} ${isSubItemActive ? 'text-wujha-primary' : 'text-gray-400'}`}
                        />
                      </button>
                    ) : (
                      // Regular navigable item
                      <Link
                        href={item.href}
                        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                          isActive
                            ? 'bg-wujha-primary text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                        </div>
                      </Link>
                    )}

                    {/* Render submenu items if they exist and parent is expanded */}
                    {hasSubItems && itemExpanded && (
                      <div className="ml-6 mt-1 space-y-1 mb-2">
                        {item.subItems!.map((subItem) => {
                          const subIsActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                          const SubItemIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                subIsActive
                                  ? 'bg-wujha-primary/10 text-wujha-primary font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              {SubItemIcon && (
                                <SubItemIcon className={`mr-2 h-4 w-4 ${subIsActive ? 'text-wujha-primary' : 'text-gray-500'}`} />
                              )}
                              <span>{subItem.name}</span>
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

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:h-full">
        <div className="flex flex-col flex-grow bg-white shadow-lg border-r border-gray-200 h-full">
          {/* Wujha Header */}
          <div className="flex items-center px-6 py-6 bg-wujha-primary flex-shrink-0">
            <div className="w-8 h-8 bg-white rounded mr-3 flex items-center justify-center">
              <span className="text-wujha-primary font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">WUJHA</h1>
              <p className="text-xs text-white/80 uppercase tracking-wide">Procurement</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h2>
          </div>
          
          <nav className="sidebar-nav flex-1 overflow-y-auto px-4 py-2 min-h-0">
            <div className="space-y-1 pb-4">
              {filteredNavigation.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const itemExpanded = isExpanded(item);
                const isSubItemActive = hasSubItems && item.subItems!.some(subItem => 
                  pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                );
                const isActive = !item.expandable && (pathname === item.href || pathname.startsWith(item.href + '/'));

                return (
                  <div key={item.name}>
                    {item.expandable && hasSubItems ? (
                      // Expandable item - click toggles expansion
                      <button
                        onClick={() => toggleExpansion(item.name)}
                        className={`group w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                          isSubItemActive
                            ? 'bg-wujha-primary/10 text-wujha-primary'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center flex-1">
                          <item.icon className={`mr-3 h-4 w-4 ${isSubItemActive ? 'text-wujha-primary' : 'text-gray-500'}`} />
                          <div className="font-medium">{item.name}</div>
                        </div>
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 ${itemExpanded ? 'rotate-180' : ''} ${isSubItemActive ? 'text-wujha-primary' : 'text-gray-400'}`}
                        />
                      </button>
                    ) : (
                      // Regular navigable item
                      <Link
                        href={item.href}
                        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                          isActive
                            ? 'bg-wujha-primary text-white'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <item.icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                        </div>
                      </Link>
                    )}

                    {/* Render submenu items if they exist and parent is expanded */}
                    {hasSubItems && itemExpanded && (
                      <div className="ml-6 mt-1 space-y-1 mb-2">
                        {item.subItems!.map((subItem) => {
                          const subIsActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                          const SubItemIcon = subItem.icon;
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                                subIsActive
                                  ? 'bg-wujha-primary/10 text-wujha-primary font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {SubItemIcon && (
                                <SubItemIcon className={`mr-2 h-4 w-4 ${subIsActive ? 'text-wujha-primary' : 'text-gray-500'}`} />
                              )}
                              <span>{subItem.name}</span>
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
                WUJHA Procurement System v1.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { navigation };

