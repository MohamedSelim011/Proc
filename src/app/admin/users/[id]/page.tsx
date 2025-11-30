'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUserData } from '@/lib/jwt'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Loader2,
  ArrowLeft,
  Edit,
  Key,
  UserX,
  UserCheck,
  Mail,
  Phone,
  Building,
  Shield,
  Calendar,
  Activity,
} from 'lucide-react'

interface UserDetails {
  id: string
  email: string
  name: string
  employeeId: string
  department: string
  role: string
  mobile: string | null
  approvalLimit: number | null
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  lastLoginIP: string | null
  failedLoginAttempts: number
  passwordChangedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AuditLog {
  id: string
  action: string
  module: string
  createdAt: string
  ipAddress: string | null
}

interface PasswordHistory {
  id: string
  createdAt: string
}

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [currentUser, setCurrentUser] = useState<{ id?: string; role?: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserDetails | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [passwordHistory, setPasswordHistory] = useState<PasswordHistory[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    const userData = getUserData()
    if (!userData || !userData.id) {
      router.push('/login')
      return
    }
    if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
      router.push('/')
      return
    }
    setCurrentUser(userData)
    fetchUserDetails()
  }, [status, session, router, userId])

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setAuditLogs(data.auditLogs || [])
        setPasswordHistory(data.passwordHistory || [])
      } else {
        setError(data.error || 'Failed to fetch user details')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Password reset successfully')
        setShowResetModal(false)
        setNewPassword('')
        fetchUserDetails()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })

      if (response.ok) {
        setSuccess(
          `User ${!user.isActive ? 'activated' : 'deactivated'} successfully`
        )
        fetchUserDetails()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update user status')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      FINANCE_MANAGER: 'bg-blue-100 text-blue-800',
      PROCUREMENT_MANAGER: 'bg-green-100 text-green-800',
      BUDGET_CONTROLLER: 'bg-yellow-100 text-yellow-800',
      PROJECT_MANAGER: 'bg-indigo-100 text-indigo-800',
      SITE_ENGINEER: 'bg-teal-100 text-teal-800',
      WAREHOUSE_KEEPER: 'bg-orange-100 text-orange-800',
      PROCUREMENT_OFFICER: 'bg-cyan-100 text-cyan-800',
      APPROVER: 'bg-pink-100 text-pink-800',
      VIEWER: 'bg-gray-100 text-gray-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">User not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/users">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <User className="h-8 w-8 text-blue-600" />
                {user.name}
              </h1>
              <p className="text-gray-600 mt-1">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/users/${userId}/edit`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button
                onClick={() => setShowResetModal(true)}
                variant="outline"
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
              <Button
                onClick={handleToggleStatus}
                variant={user.isActive ? 'destructive' : 'default'}
              >
                {user.isActive ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
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

        {/* User Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Basic Info */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-medium text-gray-900">{user.employeeId}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Mobile:</span>
                <span className="font-medium text-gray-900">{user.mobile || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Department:</span>
                <span className="font-medium text-gray-900">{user.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Role:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                    user.role
                  )}`}
                >
                  {user.role.replace(/_/g, ' ')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Must Change Password:</span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.mustChangePassword
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {user.mustChangePassword ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Failed Login Attempts:</span>
                <span className="font-medium text-gray-900">
                  {user.failedLoginAttempts}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Approval Limit:</span>
                <span className="font-medium text-gray-900">
                  {user.approvalLimit
                    ? `OMR ${user.approvalLimit.toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-600">Last Login:</span>
                <p className="font-medium text-gray-900">
                  {formatDate(user.lastLoginAt)}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Last IP Address:</span>
                <p className="font-medium text-gray-900">
                  {user.lastLoginIP || 'N/A'}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Password Changed:</span>
                <p className="font-medium text-gray-900">
                  {formatDate(user.passwordChangedAt)}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Account Created:</span>
                <p className="font-medium text-gray-900">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs */}
        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Recent Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{log.module}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No activity logs</p>
            )}
          </CardContent>
        </Card>

        {/* Password History */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Password Change History</CardTitle>
          </CardHeader>
          <CardContent>
            {passwordHistory.length > 0 ? (
              <div className="space-y-2">
                {passwordHistory.map((history, index) => (
                  <div
                    key={history.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-900">
                      Password Change #{passwordHistory.length - index}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(history.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">
                No password changes yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Reset User Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-gray-900 bg-white"
                    placeholder="Enter new password"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Min 8 characters, uppercase, lowercase, number, special char
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleResetPassword} className="flex-1">
                    Reset Password
                  </Button>
                  <Button
                    onClick={() => {
                      setShowResetModal(false)
                      setNewPassword('')
                      setError('')
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
