const normalizeLogoPath = (value?: string | null): string => {
  const raw = (value || '').trim()
  if (!raw) return '/wujha.jpg'
  if (raw.startsWith('/')) return raw
  return `/${raw}`
}

const normalizeFaviconPath = (value?: string | null): string => {
  const raw = (value || '').trim()
  if (!raw) return '/favicon.ico'
  if (raw.startsWith('/')) return raw
  return `/${raw}`
}

export const COMPANY_NAME =
  process.env.NEXT_PUBLIC_COMPANY_NAME ||
  process.env.COMPANY_NAME ||
  'Company'

export const BRAND_LOGO_URL = normalizeLogoPath(
  process.env.NEXT_PUBLIC_LOGO || process.env.LOGO || '/wujha.jpg'
)

export const BRAND_FAVICON_URL = normalizeFaviconPath(
  process.env.NEXT_PUBLIC_FAVICON || process.env.FAVICON || '/favicon.ico'
)
