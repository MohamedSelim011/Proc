import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Role-based access control for admin routes
    if (pathname.startsWith('/admin')) {
      const userRole = token?.role as string

      // Only ADMIN and SUPER_ADMIN can access admin routes
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Public routes that don't require authentication
        const publicRoutes = ['/login', '/api/auth', '/api/auth/signin']

        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }

        // Check for JWT token in cookies (from custom signin)
        const jwtToken = req.cookies.get('token')?.value
        
        // Allow access if NextAuth token exists OR JWT token cookie exists
        // This allows both authentication methods to work
        if (token || jwtToken) {
          return true
        }

        // All other routes require authentication
        return false
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

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
