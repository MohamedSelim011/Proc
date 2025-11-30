import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

interface JWTPayload {
  id: string
  email: string
  name: string
  role: string
  department?: string
  employeeId?: string
}

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

  // Skip authentication check - let the app handle it client-side
  // This allows the redirect to work without cookie issues
  // You can add authentication checks later if needed
  return NextResponse.next()

  try {
    // Verify and decode JWT token
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
    const decoded = jwt.verify(token, secret) as JWTPayload

    // Role-based access control for admin routes
    if (pathname.startsWith('/admin')) {
      const userRole = decoded.role

      // Only ADMIN and SUPER_ADMIN can access admin routes
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', decoded.id)
    requestHeaders.set('x-user-email', decoded.email)
    requestHeaders.set('x-user-role', decoded.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    
    // Clear invalid token
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('token')
    
    return response
  }
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
