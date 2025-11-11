import { UserRole } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      department: string
      employeeId: string
      mustChangePassword: boolean
      approvalLimit: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    department: string
    employeeId: string
    mustChangePassword: boolean
    approvalLimit: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    department: string
    employeeId: string
    mustChangePassword: boolean
    approvalLimit: string
  }
}
