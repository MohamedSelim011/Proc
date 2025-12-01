import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseUrl } from '@/lib/reporting/connection'

const REPORT_ENGINE_BASE_URL =
  process.env.REPORTING_ENGINE_URL

// POST /api/reports/relationships
// Body: { tableName: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tableName = body.tableName as string | undefined

    if (!tableName) {
      return NextResponse.json(
        { error: 'tableName is required' },
        { status: 400 },
      )
    }

    const connectionDto = parseDatabaseUrl()

    const url = new URL(
      `${REPORT_ENGINE_BASE_URL}/api/v1/reports/table-relationships`,
    )
    url.searchParams.set('tableName', tableName)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Engine expects the DB config object directly in the body
      body: JSON.stringify(connectionDto),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(
        'Reporting engine /table-relationships error:',
        res.status,
        text,
      )
      return NextResponse.json(
        {
          error: 'Reporting engine /table-relationships call failed',
          status: res.status,
          message: text,
        },
        { status: 502 },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in /api/reports/relationships:', error)
    return NextResponse.json(
      { error: 'Failed to load relationship metadata' },
      { status: 500 },
    )
  }
}



