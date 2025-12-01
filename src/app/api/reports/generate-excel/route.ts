import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseUrl } from '@/lib/reporting/connection'

const REPORT_ENGINE_BASE_URL =
  process.env.REPORTING_ENGINE_URL

// POST /api/reports/generate-excel
// Simple Excel generation – forwards body plus connectionDto to the engine
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const connectionDto = parseDatabaseUrl()

    const engineUrl = `${REPORT_ENGINE_BASE_URL}/api/reports/generate-excel`

    const res = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: JSON.stringify({ connectionDto, ...body }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Reporting engine /generate-excel error:', res.status, text)
      return NextResponse.json(
        {
          error: 'Reporting engine Excel generation failed',
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
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="report.xlsx"',
      },
    })
  } catch (error: any) {
    console.error('Error in /api/reports/generate-excel:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel report' },
      { status: 500 },
    )
  }
}



