/**
 * API Fetch utility wrapper
 * Provides consistent error handling and request configuration
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  return fetch(url, defaultOptions);
}

