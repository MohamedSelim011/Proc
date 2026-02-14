'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserData } from '@/lib/jwt'
import { Plus, Settings, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface ApprovalRule {
  id: string
  name: string
  description?: string
  documentType: string
  isActive: boolean
  priority: number
  conditions: any
  _count?: {
    routings: number
  }
}

export default function ApprovalRulesPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const userData = getUserData()
    if (!userData || !userData.id) {
      router.push('/login')
      return
    }
    
    // Check if user is admin
    if (userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
      router.push('/')
      return
    }
    
    fetchRules()
  }, [router])

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/approval-rules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Error fetching approval rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const createContractApprovalRule = async () => {
    try {
      setCreating(true)
      const token = localStorage.getItem('token')
      const user = getUserData()
      
      const response = await fetch('/api/admin/approval-rules/create-contract-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          createdBy: user?.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        showToast('success', 'Contract approval rule created successfully!')
        fetchRules() // Refresh the list
      } else {
        showToast('error', data.error || 'Failed to create approval rule')
      }
    } catch (error) {
      console.error('Error creating approval rule:', error)
      showToast('error', 'Failed to create approval rule')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const contractRuleExists = rules.some(r => r.documentType === 'SERVICE_CONTRACT')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Approval Rules</h1>
        <p className="mt-2 text-gray-600">
          Manage approval workflows for different document types
        </p>
      </div>

      {/* Quick Action: Create Contract Approval Rule */}
      {!contractRuleExists && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900">
                Contract Approval Rule Not Configured
              </h3>
              <p className="mt-2 text-sm text-yellow-800">
                Service contracts require an approval workflow to function properly. 
                Click the button below to create the standard approval rule:
              </p>
              <ul className="mt-2 ml-4 text-sm text-yellow-800 list-disc">
                <li>Level 1: Head of Procurement</li>
                <li>Level 2: Billing Engineer</li>
              </ul>
              <button
                onClick={createContractApprovalRule}
                disabled={creating}
                className="mt-4 inline-flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Contract Approval Rule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Rules List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Configured Approval Rules
            </h2>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No approval rules</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating an approval rule above.
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {rule.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          'Inactive'
                        )}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {rule.documentType}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Priority: {rule.priority}</span>
                      {rule._count && (
                        <span>
                          {rule._count.routings} approval {rule._count.routings === 1 ? 'level' : 'levels'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
