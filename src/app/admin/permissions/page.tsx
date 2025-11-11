'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ShieldCheck,
  Loader2,
  Save,
  RefreshCcw,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface Permission {
  id: string
  code: string
  name: string
  description: string | null
  module: string
  action: string
  isActive: boolean
}

interface RolePermission {
  id: string
  role: string
  permissionId: string
  permission: Permission
  isActive: boolean
}

interface RolePermissions {
  [key: string]: Set<string>
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'PROCUREMENT_MANAGER', label: 'Procurement Manager', color: 'bg-green-100 text-green-800' },
  { value: 'BUDGET_CONTROLLER', label: 'Budget Controller', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'SITE_ENGINEER', label: 'Site Engineer', color: 'bg-teal-100 text-teal-800' },
  { value: 'WAREHOUSE_KEEPER', label: 'Warehouse Keeper', color: 'bg-orange-100 text-orange-800' },
  { value: 'PROCUREMENT_OFFICER', label: 'Procurement Officer', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'APPROVER', label: 'Approver', color: 'bg-pink-100 text-pink-800' },
  { value: 'VIEWER', label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
]

const MODULE_NAMES: { [key: string]: string } = {
  user_management: 'User Management',
  purchase_requisition: 'Purchase Requisitions',
  purchase_order: 'Purchase Orders',
  rfq: 'Request for Quotations',
  invoice: 'Invoices',
  payment: 'Payments',
  goods_receipt: 'Goods Receipts',
  vendor_management: 'Vendor Management',
  reports: 'Reports & Analytics',
  settings: 'System Settings',
  audit: 'Audit Logs',
}

export default function PermissionsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({})
  const [originalRolePermissions, setOriginalRolePermissions] = useState<RolePermissions>({})
  const [selectedRole, setSelectedRole] = useState<string>('SUPER_ADMIN')
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        router.push('/')
      } else {
        fetchData()
      }
    }
  }, [status, session, router])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch all permissions
      const permResponse = await fetch('/api/admin/permissions')
      const permData = await permResponse.json()

      if (permResponse.ok) {
        setPermissions(permData.permissions || [])

        // Expand all modules by default
        const modules = new Set(permData.permissions.map((p: Permission) => p.module))
        setExpandedModules(modules)
      } else {
        setError(permData.error || 'Failed to fetch permissions')
      }

      // Fetch role permissions for all roles
      const rolePermsMap: RolePermissions = {}
      for (const role of ROLES) {
        const response = await fetch(`/api/admin/roles/${role.value}/permissions`)
        const data = await response.json()

        if (response.ok) {
          const permCodes = new Set(
            data.permissions.map((p: any) => p.code)
          )
          rolePermsMap[role.value] = permCodes
        }
      }

      setRolePermissions(rolePermsMap)
      // Create a deep copy of the role permissions for reset functionality
      const originalCopy: RolePermissions = {}
      Object.entries(rolePermsMap).forEach(([key, value]) => {
        originalCopy[key] = new Set(value)
      })
      setOriginalRolePermissions(originalCopy)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (role: string, permissionCode: string) => {
    if (session?.user?.role !== 'SUPER_ADMIN') {
      setError('Only Super Admins can modify permissions')
      return
    }

    setRolePermissions((prev) => {
      const newPerms = { ...prev }
      const rolePerms = new Set(newPerms[role] || [])

      if (rolePerms.has(permissionCode)) {
        rolePerms.delete(permissionCode)
      } else {
        rolePerms.add(permissionCode)
      }

      newPerms[role] = rolePerms

      // Check for changes
      const hasAnyChanges = ROLES.some((r) => {
        const current = newPerms[r.value] || new Set()
        const original = originalRolePermissions[r.value] || new Set()
        return current.size !== original.size ||
               ![...current].every((p) => original.has(p))
      })
      setHasChanges(hasAnyChanges)

      return newPerms
    })
  }

  const saveChanges = async () => {
    if (session?.user?.role !== 'SUPER_ADMIN') {
      setError('Only Super Admins can save permission changes')
      return
    }

    try {
      setSaving(true)
      setError('')

      // Save changes for each role that was modified
      for (const role of ROLES) {
        const currentPerms = rolePermissions[role.value] || new Set()
        const originalPerms = originalRolePermissions[role.value] || new Set()

        // Check if this role was modified
        if (currentPerms.size !== originalPerms.size ||
            ![...currentPerms].every((p) => originalPerms.has(p))) {

          // Get permission IDs for the current permissions
          const permissionIds = permissions
            .filter((p) => currentPerms.has(p.code))
            .map((p) => p.id)

          const response = await fetch(`/api/admin/roles/${role.value}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissionIds }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || `Failed to update ${role.label} permissions`)
          }
        }
      }

      setSuccess('Permissions saved successfully')
      setHasChanges(false)

      // Refresh data to get latest state
      await fetchData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    // Create a deep copy of original permissions
    const resetCopy: RolePermissions = {}
    Object.entries(originalRolePermissions).forEach(([key, value]) => {
      resetCopy[key] = new Set(value)
    })
    setRolePermissions(resetCopy)
    setHasChanges(false)
  }

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(module)) {
        newExpanded.delete(module)
      } else {
        newExpanded.add(module)
      }
      return newExpanded
    })
  }

  const toggleAllModules = () => {
    if (expandedModules.size === Object.keys(MODULE_NAMES).length) {
      setExpandedModules(new Set())
    } else {
      setExpandedModules(new Set(Object.keys(MODULE_NAMES)))
    }
  }

  const groupedPermissions = Array.isArray(permissions)
    ? permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = []
        }
        acc[perm.module].push(perm)
        return acc
      }, {} as { [key: string]: Permission[] })
    : {}

  const isReadOnly = session?.user?.role !== 'SUPER_ADMIN'

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-blue-600" />
                Permission Management
              </h1>
              <p className="text-gray-600 mt-1">
                Configure role-based permissions and access control
              </p>
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <>
                  <Button
                    onClick={resetChanges}
                    variant="outline"
                    disabled={saving}
                    className="shadow-lg"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={saveChanges}
                    disabled={saving || isReadOnly}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {isReadOnly && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-50">
            <Lock className="h-4 w-4 text-yellow-600 inline mr-2" />
            <AlertDescription className="text-yellow-800 inline">
              You are viewing permissions in read-only mode. Only Super Admins can modify permissions.
            </AlertDescription>
          </Alert>
        )}

        {/* Role Tabs */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedRole === role.value
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : `${role.color} hover:scale-105`
                  }`}
                >
                  {role.label}
                  <span className="ml-2 text-xs opacity-75">
                    ({rolePermissions[role.value]?.size || 0})
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions by Module */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Permissions for {ROLES.find((r) => r.value === selectedRole)?.label}
              </CardTitle>
              <Button
                onClick={toggleAllModules}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {expandedModules.size === Object.keys(MODULE_NAMES).length
                  ? 'Collapse All'
                  : 'Expand All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedPermissions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([module, perms]) => {
                  const isExpanded = expandedModules.has(module)
                  const modulePerms = rolePermissions[selectedRole] || new Set()
                  const enabledCount = perms.filter((p) => modulePerms.has(p.code)).length
                  const totalCount = perms.length

                  return (
                    <div key={module} className="border rounded-lg overflow-hidden">
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(module)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-600" />
                          )}
                          <span className="font-semibold text-gray-900">
                            {MODULE_NAMES[module] || module}
                          </span>
                          <span className="text-sm text-gray-600">
                            ({enabledCount}/{totalCount} enabled)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {enabledCount === totalCount ? (
                            <Unlock className="h-4 w-4 text-green-600" />
                          ) : enabledCount > 0 ? (
                            <Unlock className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </button>

                      {/* Module Permissions */}
                      {isExpanded && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {perms
                              .sort((a, b) => a.action.localeCompare(b.action))
                              .map((perm) => {
                                const isEnabled = modulePerms.has(perm.code)
                                return (
                                  <button
                                    key={perm.id}
                                    onClick={() => togglePermission(selectedRole, perm.code)}
                                    disabled={isReadOnly}
                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                      isEnabled
                                        ? 'border-green-500 bg-green-50 hover:bg-green-100'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                    } ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900 text-sm">
                                          {perm.name}
                                        </div>
                                        {perm.description && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            {perm.description}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1 font-mono">
                                          {perm.code}
                                        </div>
                                      </div>
                                      <div>
                                        {isEnabled ? (
                                          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center">
                                            <svg
                                              className="w-3 h-3 text-white"
                                              fill="none"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path d="M5 13l4 4L19 7"></path>
                                            </svg>
                                          </div>
                                        ) : (
                                          <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white"></div>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {Object.keys(groupedPermissions).length === 0 && (
              <div className="text-center py-12">
                <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No permissions found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
