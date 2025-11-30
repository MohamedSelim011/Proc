'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserData } from '@/lib/jwt'
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'

interface PendingApproval {
  id: string
  documentType: string
  documentId: string
  purchaseRequisitionId?: string | null
  purchaseOrderId?: string | null
  invoiceId?: string | null
  level: number
  status: string
  createdAt: string
}

export default function ApprovalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id?: string; role?: string } | null>(null)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null)
  const [comments, setComments] = useState('')

  useEffect(() => {
    const userData = getUserData()
    if (!userData || !userData.id) {
      router.push('/login')
      return
    }
    setUser(userData)
    fetchApprovals()
  }, [router])

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/approvals/pending')
      if (response.ok) {
        const data = await response.json()
        setApprovals(data.approvals || [])
      } else {
        setError('Failed to fetch approvals')
      }
    } catch (err) {
      setError('An error occurred while fetching approvals')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedApproval) return

    setActionLoading(selectedApproval.id)
    setError('')

    try {
      const response = await fetch(
        `/api/approvals/${selectedApproval.id}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        }
      )

      if (response.ok) {
        // Remove from list and refresh
        setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
        setShowApprovalModal(false)
        setComments('')
        setSelectedApproval(null)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to approve')
      }
    } catch (err) {
      setError('An error occurred while approving')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedApproval || !comments) {
      setError('Comments are required when rejecting')
      return
    }

    setActionLoading(selectedApproval.id)
    setError('')

    try {
      const response = await fetch(
        `/api/approvals/${selectedApproval.id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        }
      )

      if (response.ok) {
        // Remove from list and refresh
        setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
        setShowRejectModal(false)
        setComments('')
        setSelectedApproval(null)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to reject')
      }
    } catch (err) {
      setError('An error occurred while rejecting')
    } finally {
      setActionLoading(null)
    }
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-600" />
            Pending Approvals
          </h1>
          <p className="text-gray-600 mt-1">
            You have {approvals.length} document(s) waiting for your approval
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Approvals List */}
        {approvals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All caught up!
              </h3>
              <p className="text-gray-600 text-center">
                You have no pending approvals at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <Card key={approval.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <FileText className="h-10 w-10 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {approval.documentType} Approval
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Document ID: {approval.documentId.slice(0, 8)}...
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Level {approval.level}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(approval.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval)
                          setShowApprovalModal(true)
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={actionLoading === approval.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedApproval(approval)
                          setShowRejectModal(true)
                        }}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={actionLoading === approval.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Are you sure you want to approve this {selectedApproval.documentType}?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any comments..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={actionLoading !== null}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Approval
                </Button>
                <Button
                  onClick={() => {
                    setShowApprovalModal(false)
                    setComments('')
                    setSelectedApproval(null)
                  }}
                  variant="outline"
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-700">Confirm Rejection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Are you sure you want to reject this {selectedApproval.documentType}?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={actionLoading !== null || !comments}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Rejection
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectModal(false)
                    setComments('')
                    setSelectedApproval(null)
                  }}
                  variant="outline"
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
