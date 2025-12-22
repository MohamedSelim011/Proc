'use client';

import { useEffect } from 'react';
import { initFetchInterceptor } from '@/lib/fetchInterceptor';

/**
 * Client component that initializes the global fetch interceptor
 * This ensures all fetch calls check for token expiration
 */
export function TokenExpirationHandler() {
  useEffect(() => {
    // Initialize the fetch interceptor on client side
    initFetchInterceptor();
  }, []);

  return null;
}

