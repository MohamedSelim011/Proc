/**
 * API Fetch utility wrapper
 * Provides consistent error handling and request configuration
 * Automatically includes JWT token from localStorage in Authorization header
 * Handles token expiration and redirects to login page
 */

import { isTokenExpired } from './jwt';

/**
 * Redirect to login page when token is expired
 */
function redirectToSignin() {
  if (typeof window === 'undefined') return;
  
  // Don't redirect if we're already on the login page
  if (window.location.pathname === '/login' || window.location.pathname === '/signin') {
    return;
  }
  
  // Clear expired token and user data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  
  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Check if the URL should skip token validation
 */
function shouldSkipTokenCheck(url: string): boolean {
  if (typeof window === 'undefined') return false;
  
  // Skip token check for login/signin routes
  if (url.includes('/api/auth/signin') || 
      url.includes('/api/auth/login') ||
      url.includes('/login') ||
      url.includes('/signin')) {
    return true;
  }
  
  // Skip token check if we're already on the login page
  if (window.location.pathname === '/login' || window.location.pathname === '/signin') {
    return true;
  }
  
  return false;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Skip token check for login/signin routes
  const skipTokenCheck = shouldSkipTokenCheck(url);
  
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Check if token is expired before making the request (skip for login routes)
  if (!skipTokenCheck && token && typeof window !== 'undefined') {
    if (isTokenExpired(token)) {
      redirectToSignin();
      // Return a rejected promise to prevent further execution
      return Promise.reject(new Error('Token expired'));
    }
  }
  
  const headers = new Headers(options.headers);
  const body = options.body;
  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;
  const isUrlEncodedBody =
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;
  const shouldSetJsonContentType = !isFormDataBody && !isUrlEncodedBody && !headers.has('Content-Type');

  if (shouldSetJsonContentType) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include',
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  
  // Check for 401 Unauthorized response (token expired on server side)
  // Skip this check for login routes
  if (!skipTokenCheck && response.status === 401) {
    const data = await response.json().catch(() => ({}));
    
    // Check if error message explicitly indicates an expired session/token
    if (data.error && (
      data.error.includes('session has expired') || 
      data.error.includes('expired') ||
      data.error.includes('TokenExpiredError')
    )) {
      redirectToSignin();
      return Promise.reject(new Error('Token expired'));
    }
  }
  
  return response;
}

