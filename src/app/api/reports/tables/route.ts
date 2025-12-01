import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseUrl } from '@/lib/reporting/connection'

const REPORT_ENGINE_BASE_URL =
  process.env.REPORTING_ENGINE_URL

// POST /api/reports/tables
// Returns list of tables visible to the reporting engine
export async function POST(request: NextRequest) {
  try {
    const connectionDto = parseDatabaseUrl()

    // Debug: log the engine URL and a redacted version of the connection DTO
    console.log('[reports/tables] REPORT_ENGINE_BASE_URL =', REPORT_ENGINE_BASE_URL)
    console.log('[reports/tables] connectionDto (redacted) =', {
      ...connectionDto,
      password: connectionDto.password ? '***redacted***' : undefined,
    })

    const res = await fetch(`${REPORT_ENGINE_BASE_URL}/api/v1/reports/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // IMPORTANT: send the connection DTO directly, as expected by the engine
      body: JSON.stringify(connectionDto),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[reports/tables] Reporting engine /tables error:', res.status, text)
      return NextResponse.json(
        {
          error: 'Reporting engine /tables call failed',
          status: res.status,
          message: text,
        },
        { status: 502 },
      )
    }

    const tables = await res.json()
    console.log('[reports/tables] Engine returned tables payload:', tables)
    return NextResponse.json(tables)
  } catch (error: any) {
    console.error('[reports/tables] Error in /api/reports/tables:', error)
    return NextResponse.json(
      { error: 'Failed to load tables metadata' },
      { status: 500 },
    )
  }
}



