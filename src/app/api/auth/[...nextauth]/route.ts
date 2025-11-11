import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error('Invalid email or password')
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
          )
          throw new Error(
            `Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).`
          )
        }

        // Check if account is active
        if (!user.isActive) {
          throw new Error('Your account has been deactivated. Please contact your administrator.')
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          // Increment failed login attempts
          const failedAttempts = user.failedLoginAttempts + 1
          const lockDuration = failedAttempts >= 5 ? 30 : 0 // Lock for 30 minutes after 5 failed attempts

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: failedAttempts,
              lockedUntil: lockDuration > 0
                ? new Date(Date.now() + lockDuration * 60 * 1000)
                : null,
            },
          })

          if (failedAttempts >= 5) {
            throw new Error(
              'Account locked due to multiple failed login attempts. Please try again in 30 minutes.'
            )
          }

          throw new Error('Invalid email or password')
        }

        // Reset failed login attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            lastLoginIP: null, // Will be set by middleware
          },
        })

        // Log successful login
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_LOGIN',
            module: 'authentication',
            resourceType: 'User',
            resourceId: user.id,
            ipAddress: null, // Will be captured by middleware
            userAgent: null,
          },
        })

        // Return user object (will be available in session)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          mustChangePassword: user.mustChangePassword,
          approvalLimit: user.approvalLimit?.toString() || '0',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to JWT token on sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department
        token.employeeId = user.employeeId
        token.mustChangePassword = user.mustChangePassword
        token.approvalLimit = user.approvalLimit
      }
      return token
    },
    async session({ session, token }) {
      // Add user data from JWT to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.department = token.department as string
        session.user.employeeId = token.employeeId as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
        session.user.approvalLimit = token.approvalLimit as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
