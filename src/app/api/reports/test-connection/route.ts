import { NextRequest, NextResponse } from 'next/server'

const REPORT_ENGINE_BASE_URL =
  process.env.REPORTING_ENGINE_URL
// POST /api/reports/test-connection
// Simple health check for the external reporting engine
export async function POST(request: NextRequest) {
  try {
    console.log('[reports/test-connection] REPORT_ENGINE_BASE_URL =', REPORT_ENGINE_BASE_URL)

    const res = await fetch(`${REPORT_ENGINE_BASE_URL}/api/reports/test-connection`, {
      method: 'POST',
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          message: text || 'Reporting engine test-connection failed',
        },
        { status: 502 },
      )
    }

    const body = await res.json().catch(() => ({}))
    console.log('[reports/test-connection] engine responded with:', body)

    return NextResponse.json({
      ok: true,
      engineUrl: REPORT_ENGINE_BASE_URL,
      engineResponse: body,
    })
  } catch (error: any) {
    console.error('Error calling reporting engine test-connection:', error)
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Failed to reach reporting engine',
      },
      { status: 500 },
    )
  }
}



