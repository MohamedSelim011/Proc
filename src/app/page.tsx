'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserData } from '@/lib/jwt';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const user = getUserData();
    
    if (user && user.id) {
      // User is authenticated, redirect to dashboard
      router.push('/procurement/dashboard');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
