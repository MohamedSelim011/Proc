/**
 * Global fetch interceptor
 * Intercepts all fetch calls to check for token expiration and 401 errors
 * Automatically redirects to login page when token is expired
 */
 
import { isTokenExpired } from './jwt';
 
let isRedirecting = false;
 
/**
 * Redirect to login page when token is expired
 */
function redirectToSignin() {
  if (isRedirecting || typeof window === 'undefined') return;
  
  // Don't redirect if we're already on the login page
  if (window.location.pathname === '/login' || window.location.pathname === '/signin') {
    return;
  }
  
  isRedirecting = true;
  
  // Clear expired token and user data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  
  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Check if response indicates token expiration
 */
async function checkTokenExpiration(response: Response): Promise<boolean> {
  if (response.status === 401) {
    try {
      const data = await response.clone().json().catch(() => ({}));
      
      // Check if error message explicitly indicates an expired session/token
      if (data.error && (
        data.error.includes('session has expired') || 
        data.error.includes('expired') ||
        data.error.includes('TokenExpiredError')
      )) {
        return true;
      }
    } catch {
      // If we can't parse the response, assume it's an auth error
      return true;
    }
  }
  return false;
}

/**
 * Store original fetch function
 */
let originalFetch: typeof fetch | null = null;

/**
 * Check if the current route should skip token validation
 */
function shouldSkipTokenCheck(url: string | URL): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlString = typeof url === 'string' ? url : url.toString();
  const currentPath = window.location.pathname;
  const isPublicRfpSubmitPage = currentPath.startsWith('/rfp/submit/');
  const isPublicRfpSubmitApi = urlString.includes('/api/services/rfp/submit/');
  
  // Skip token check for login/signin routes
  if (urlString.includes('/api/auth/signin') || 
      urlString.includes('/api/auth/login') ||
      urlString.includes('/login') ||
      urlString.includes('/signin')) {
    return true;
  }

  // Vendor submission links are token-based public flows and must not enforce app login tokens.
  if (isPublicRfpSubmitPage || isPublicRfpSubmitApi) {
    return true;
  }
  
  // Skip token check if we're already on the login page
  if (currentPath === '/login' || currentPath === '/signin') {
    return true;
  }
  
  return false;
}

function normalizeRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;

  const maybeUrl = (input as { url?: unknown } | null)?.url;
  return typeof maybeUrl === 'string' ? maybeUrl : '';
}

function isInternalApiRequest(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  if (url.startsWith('/api/')) return true;

  if (typeof window === 'undefined') return false;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/**
 * Initialize global fetch interceptor
 * This should be called once in the app root
 */
export function initFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  // Store original fetch if not already stored
  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }
  
  // Override global fetch
  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = normalizeRequestUrl(input);
    const isInternalApi = isInternalApiRequest(url);
    
    // Skip token check for login/signin routes
    if (shouldSkipTokenCheck(url)) {
      return originalFetch!(input, init);
    }
    
    // Check token expiration before making request
    if (typeof window !== 'undefined' && isInternalApi) {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        redirectToSignin();
        return Promise.reject(new Error('Token expired'));
      }
    }

    let requestInit = init;
    if (isInternalApi && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        const headers = new Headers(init?.headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        requestInit = { ...init, headers };
      }
    }

    // Make the fetch request using original fetch
    const response = await originalFetch!(input, requestInit);

    // Check for 401 response after the request (but skip for login routes)
    if (isInternalApi && !shouldSkipTokenCheck(url) && await checkTokenExpiration(response)) {
      redirectToSignin();
      return Promise.reject(new Error('Token expired'));
    }

    return response;
  };
}

