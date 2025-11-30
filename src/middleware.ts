import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth/signin',
    '/api/auth/signout',
    '/_next',
    '/favicon.ico',
  ]

  // Check if the route is public
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // For root path, redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For all other protected routes, allow through
  // Client-side pages will handle authentication checks using localStorage
  return NextResponse.next()
}

// Configure which routes use the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (NextAuth routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
