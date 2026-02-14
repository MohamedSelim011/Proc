'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUserData } from '@/lib/jwt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Edit, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [currentUser, setCurrentUser] = useState<{ id?: string; role?: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    employeeId: '',
    department: '',
    role: '',
    mobile: '',
    approvalLimit: '',
    isActive: true,
    mustChangePassword: false,
  })

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
    fetchUser()
  }, [router, userId])

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        const user = data
        setFormData({
          email: user.email,
          name: user.name,
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          mobile: user.mobile || '',
          approvalLimit: user.approvalLimit ? user.approvalLimit.toString() : '',
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword,
        })
      } else {
        setError(data.error || 'Failed to fetch user')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('User updated successfully')
        setTimeout(() => {
          router.push('/admin/users')
        }, 1500)
      } else {
        setError(data.error || 'Failed to update user')
        setSubmitting(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/users">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Edit className="h-8 w-8 text-blue-600" />
            Edit User
          </h1>
          <p className="text-gray-600 mt-1">Update user information</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 bg-green-50">
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Read-only)</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    className="text-gray-900 bg-gray-100"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="text-gray-900 bg-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="text-gray-900 bg-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="text-gray-900 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="text-gray-900 bg-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="h-11 w-full rounded-md border border-gray-300 px-3 text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="PROCUREMENT_MANAGER">
                      Procurement Manager
                    </option>
                    <option value="BUDGET_CONTROLLER">Budget Controller</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="WAREHOUSE_KEEPER">Warehouse Keeper</option>
                    <option value="PROCUREMENT_OFFICER">
                      Procurement Officer
                    </option>
                    <option value="APPROVER">Approver</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approvalLimit">Approval Limit</Label>
                  <Input
                    id="approvalLimit"
                    name="approvalLimit"
                    type="number"
                    value={formData.approvalLimit}
                    onChange={handleChange}
                    className="text-gray-900 bg-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold mb-4">Account Status</h3>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    Account is Active
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mustChangePassword"
                    name="mustChangePassword"
                    checked={formData.mustChangePassword}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="mustChangePassword" className="text-sm">
                    Require password change on next login
                  </Label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating User...
                    </>
                  ) : (
                    'Update User'
                  )}
                </Button>
                <Link href="/admin/users">
                  <Button type="button" variant="outline" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
