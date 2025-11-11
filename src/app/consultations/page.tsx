'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Send,
  Clock,
  FileText,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDistanceToNow } from 'date-fns'

interface Consultation {
  id: string
  documentType: string
  documentId: string
  status: string
  createdAt: string
  comments?: string | null
  respondedAt?: string | null
}

export default function ConsultationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Response modal state
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [responseComments, setResponseComments] = useState('')
  const [recommendation, setRecommendation] = useState<'APPROVE' | 'REJECT' | 'NEUTRAL'>('NEUTRAL')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchConsultations()
    }
  }, [status, router])

  const fetchConsultations = async () => {
    try {
      const response = await fetch('/api/consultations/pending')
      if (response.ok) {
        const data = await response.json()
        setConsultations(data.consultations || [])
      } else {
        setError('Failed to fetch consultations')
      }
    } catch (err) {
      setError('An error occurred while fetching consultations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRespond = async () => {
    if (!selectedConsultation || !responseComments) {
      setError('Please provide your consultation response')
      return
    }

    setActionLoading(selectedConsultation.id)
    setError('')

    try {
      const response = await fetch(
        `/api/consultations/${selectedConsultation.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comments: responseComments,
            recommendation,
          }),
        }
      )

      if (response.ok) {
        // Remove from list and refresh
        setConsultations((prev) =>
          prev.filter((c) => c.id !== selectedConsultation.id)
        )
        setShowResponseModal(false)
        setResponseComments('')
        setRecommendation('NEUTRAL')
        setSelectedConsultation(null)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit response')
      }
    } catch (err) {
      setError('An error occurred while submitting response')
    } finally {
      setActionLoading(null)
    }
  }

  if (status === 'loading' || isLoading) {
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
            <MessageSquare className="h-8 w-8 text-blue-600" />
            Consultation Requests
          </h1>
          <p className="text-gray-600 mt-1">
            You have {consultations.length} consultation request(s) requiring your input
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Consultations List */}
        {consultations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                All caught up!
              </h3>
              <p className="text-gray-600 text-center">
                You have no pending consultation requests at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card
                key={consultation.id}
                className="shadow-lg hover:shadow-xl transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <MessageSquare className="h-10 w-10 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {consultation.documentType} Consultation
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Document ID: {consultation.documentId.slice(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          Your input is requested before approval can proceed.
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(
                              new Date(consultation.createdAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="ml-4">
                      <Button
                        onClick={() => {
                          setSelectedConsultation(consultation)
                          setShowResponseModal(true)
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={actionLoading === consultation.id}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Provide Consultation Response</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Please provide your input for this {selectedConsultation.documentType}.
              </p>

              {/* Recommendation */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Recommendation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecommendation('APPROVE')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      recommendation === 'APPROVE'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRecommendation('NEUTRAL')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      recommendation === 'NEUTRAL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Neutral
                  </button>
                  <button
                    onClick={() => setRecommendation('REJECT')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      recommendation === 'REJECT'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Comments *
                </label>
                <textarea
                  value={responseComments}
                  onChange={(e) => setResponseComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Provide your consultation input, concerns, or recommendations..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRespond}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={actionLoading !== null || !responseComments}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Response
                </Button>
                <Button
                  onClick={() => {
                    setShowResponseModal(false)
                    setResponseComments('')
                    setRecommendation('NEUTRAL')
                    setSelectedConsultation(null)
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
