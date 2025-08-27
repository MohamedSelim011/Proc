'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  CreditCard,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to procurement dashboard after a brief loading screen
    const timer = setTimeout(() => {
      router.push('/procurement/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto text-center">
        {/* Wujha Logo/Brand - Matching the orange theme */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mx-auto mb-4 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">WUJHA</h1>
          <p className="text-sm text-gray-600 uppercase tracking-wide">PROCUREMENT</p>
        </div>

        {/* Loading Animation - Orange theme */}
        <div className="mb-8">
          <div className="flex justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-gray-600 text-sm">Loading your dashboard...</p>
        </div>

        {/* Feature Icons - Wujha style */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <ShoppingCart className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-700 font-medium">Purchase Orders</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <FileText className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-700 font-medium">Requisitions</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <Package className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-700 font-medium">Goods Receipt</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <CreditCard className="h-5 w-5 text-orange-500 mx-auto mb-2" />
            <p className="text-xs text-gray-700 font-medium">Payments</p>
          </div>
        </div>

        {/* System Info - Wujha style */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="font-medium">Enterprise Solution</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Wujha System v1.0
          </div>
        </div>

        {/* Manual Navigation Link - Orange theme */}
        <div className="mt-6">
          <button
            onClick={() => router.push('/procurement/dashboard')}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            Continue to Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
