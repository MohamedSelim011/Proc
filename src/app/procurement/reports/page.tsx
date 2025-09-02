'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar,
  Filter,
  FileText,
  DollarSign,
  Package,
  Users,
  Database
} from 'lucide-react';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Procurement performance metrics and detailed reports
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-2">
          <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </button>
          <a
            href="/procurement/reports/advanced"
            className="inline-flex items-center justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500"
          >
            <Database className="h-4 w-4 mr-2" />
            Advanced Reports
          </a>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total PRs</dt>
                  <dd className="text-lg font-medium text-gray-900">156</dd>
                  <dd className="text-xs text-green-600">+12% from last month</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd className="text-lg font-medium text-gray-900">89</dd>
                  <dd className="text-xs text-green-600">+8% from last month</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Spend</dt>
                  <dd className="text-lg font-medium text-gray-900">OMR 2.4M</dd>
                  <dd className="text-xs text-red-600">-3% from last month</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Vendors</dt>
                  <dd className="text-lg font-medium text-gray-900">45</dd>
                  <dd className="text-xs text-green-600">+5 new vendors</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Procurement Reports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Procurement Reports
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Purchase Requisition Analysis</h4>
                <p className="text-sm text-gray-500">Detailed PR metrics and trends</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Purchase Order Summary</h4>
                <p className="text-sm text-gray-500">PO status and delivery performance</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Spend Analysis</h4>
                <p className="text-sm text-gray-500">Category-wise spending breakdown</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Vendor Reports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Vendor Reports
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Vendor Performance</h4>
                <p className="text-sm text-gray-500">Delivery and quality metrics</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Vendor Spend Analysis</h4>
                <p className="text-sm text-gray-500">Top vendors by spend volume</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Vendor Compliance</h4>
                <p className="text-sm text-gray-500">Contract and regulatory compliance</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Reports */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Financial Reports
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Invoice Processing</h4>
                <p className="text-sm text-gray-500">Invoice status and aging</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Payment Analysis</h4>
                <p className="text-sm text-gray-500">Payment trends and methods</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Budget vs Actual</h4>
                <p className="text-sm text-gray-500">Budget performance tracking</p>
              </div>
              <Download className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">Advanced Analytics Coming Soon</h3>
            <p className="text-sm text-blue-700 mt-1">
              Interactive dashboards, predictive analytics, and custom report builder will be available in the next release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
