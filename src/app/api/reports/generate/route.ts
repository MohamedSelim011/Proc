import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseUrl } from '@/lib/reporting/connection'

const REPORT_ENGINE_BASE_URL = process.env.REPORTING_ENGINE_URL

// POST /api/reports/generate
// Simple PDF generation – forwards body plus connectionDto to the engine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const connectionDto = parseDatabaseUrl()

    const engineUrl = `${REPORT_ENGINE_BASE_URL}/api/v1/reports/generate-with-columns`

    const res = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/pdf',
      },
      body: JSON.stringify({ connectionDto, ...body }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Reporting engine /generate-with-columns error:', res.status, text)
      return NextResponse.json(
        {
          error: 'Reporting engine generate failed',
          status: res.status,
          message: text,
        },
        { status: 502 },
      )
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      },
    })
  } catch (error: any) {
    console.error('Error in /api/reports/generate:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 },
    )
  }
}



