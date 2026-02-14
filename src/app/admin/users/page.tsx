'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserData } from '@/lib/jwt'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  UserX,
  UserCheck,
  Key,
  Loader2,
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  employeeId: string
  department: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  approvalLimit: number | null
  mustChangePassword: boolean
}

export default function UsersManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id?: string; role?: string } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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
    setUser(userData)
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        console.log('data.users',  data)
        setUsers(data || [])
        setFilteredUsers(data.users || [])
      } else {
        console.log('data.error',  data.error)
        setError(data.error || 'Failed to fetch users')
      }
    } catch (err) {
      console.log('err',  err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    if (departmentFilter) {
      filtered = filtered.filter((user) => user.department === departmentFilter)
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((user) => user.isActive)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((user) => !user.isActive)
    }

    setFilteredUsers(filtered)
  }, [searchTerm, roleFilter, departmentFilter, statusFilter, users])

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (response.ok) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        fetchUsers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update user status')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }
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

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (!user || loading) {
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
                <Users className="h-8 w-8 text-blue-600" />
                User Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage system users, roles, and permissions
              </p>
            </div>
            <Link href="/admin/users/new">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </Link>
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

        {/* Filters */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 shadow-sm text-gray-900 bg-white"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-11 rounded-md border border-gray-300 px-3 shadow-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="FINANCE_MANAGER">Finance Manager</option>
                <option value="PROCUREMENT_MANAGER">Procurement Manager</option>
                <option value="BUDGET_CONTROLLER">Budget Controller</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
                <option value="SITE_ENGINEER">Site Engineer</option>
                <option value="WAREHOUSE_KEEPER">Warehouse Keeper</option>
                <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                <option value="APPROVER">Approver</option>
                <option value="VIEWER">Viewer</option>
              </select>

              {/* Department Filter */}
              <Input
                placeholder="Filter by department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="shadow-sm text-gray-900 bg-white"
              />

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-md border border-gray-300 px-3 shadow-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.employeeId}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.department}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/users/${user.id}`}>
                            <button
                              className="p-1 hover:bg-blue-50 rounded text-blue-600"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <button
                              className="p-1 hover:bg-green-50 rounded text-green-600"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() =>
                              handleToggleStatus(user.id, user.isActive)
                            }
                            className={`p-1 hover:bg-${
                              user.isActive ? 'red' : 'green'
                            }-50 rounded ${
                              user.isActive ? 'text-red-600' : 'text-green-600'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
