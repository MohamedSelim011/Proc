import { useState, useEffect } from 'react'
import { getUserData } from '@/lib/jwt'

/**
 * Client-side hook to check user permissions
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getUserData()
    if (user?.role) {
      fetchPermissions()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/auth/permissions')
      if (response.ok) {
        const data = await response.json()
        // data.permissions is array of objects with 'code' property
        const permCodes = data.permissions.map((p: any) => p.code)
        setPermissions(new Set(permCodes))
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = (permission: string): boolean => {
    return permissions.has(permission)
  }

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((p) => permissions.has(p))
  }

  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((p) => permissions.has(p))
  }

  return {
    permissions: Array.from(permissions),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  }
}
