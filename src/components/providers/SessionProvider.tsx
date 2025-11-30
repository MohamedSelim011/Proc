'use client'

import { ReactNode } from 'react'

// Simple provider wrapper - no longer using NextAuth
// Authentication is handled via JWT tokens in cookies and localStorage
export function SessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
