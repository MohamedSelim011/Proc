const BASE_URL_ENV_KEYS = [
  'APP_BASE_URL',
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_URL',
  'NEXTAUTH_URL',
] as const;

/**
 * Resolve the application base URL for links sent via email.
 * Must be configured in environment variables to ensure links work
 * across local and deployed environments.
 */
export function getAppBaseUrl(): string {
  for (const key of BASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return value.replace(/\/$/, '');
    }
  }

  throw new Error(
    `Base URL is not configured. Set one of: ${BASE_URL_ENV_KEYS.join(', ')}`
  );
}

