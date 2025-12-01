/**
 * API Fetch utility wrapper
 * Provides consistent error handling and request configuration
 * Automatically includes JWT token from localStorage in Authorization header
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include',
    ...options,
  };

  return fetch(url, defaultOptions);
}

