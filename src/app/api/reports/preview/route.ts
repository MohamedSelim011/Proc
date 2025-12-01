import { NextRequest, NextResponse } from 'next/server'
import { parseDatabaseUrl } from '@/lib/reporting/connection'

const REPORT_ENGINE_BASE_URL =
  process.env.REPORTING_ENGINE_URL

type ReportType = 'pdf' | 'excel'

// POST /api/reports/preview
// Body: ReportRequest (see docs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      primaryTable,
      reportType,
      whereClause,
      relatedTables,
      primaryTableColumns,
      relatedTableColumns,
    } = body as {
      primaryTable?: string
      reportType?: ReportType
      whereClause?: string
      relatedTables?: string[]
      primaryTableColumns?: string[]
      relatedTableColumns?: Record<string, string[]>
    }

    if (!primaryTable) {
      return NextResponse.json(
        { error: 'primaryTable is required' },
        { status: 400 },
      )
    }

    const type: ReportType = reportType === 'excel' ? 'excel' : 'pdf'

    const connectionDto = parseDatabaseUrl()

    const hasRelations =
      Array.isArray(relatedTables) &&
      relatedTables.length > 0 &&
      relatedTableColumns &&
      Object.keys(relatedTableColumns).length > 0

    let enginePath: string
    if (hasRelations) {
      enginePath =
        type === 'pdf'
          ? '/api/v1/reports/generate-relational-with-columns'
          : '/api/v1/reports/generate-relational-excel-with-columns'
    } else {
      enginePath =
        type === 'pdf'
          ? '/api/v1/reports/generate-with-columns'
          : '/api/v1/reports/generate-excel-with-columns'
    }

    const engineUrl = `${REPORT_ENGINE_BASE_URL}${enginePath}`

    const payload: any = {
      connectionDto,
      primaryTable,
      whereClause,
    }

    if (primaryTableColumns?.length) {
      payload.primaryTableColumns = primaryTableColumns
    }
    if (hasRelations) {
      payload.relatedTables = relatedTables
      payload.relatedTableColumns = relatedTableColumns
    } else if (!primaryTableColumns && body.selectedColumns) {
      // basic compatibility with older payloads { tableName, selectedColumns }
      payload.primaryTableColumns = body.selectedColumns
    }

    const res = await fetch(engineUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:
          type === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Reporting engine preview error:', res.status, text)
      return NextResponse.json(
        {
          error: 'Reporting engine preview failed',
          status: res.status,
          message: text,
        },
        { status: 502 },
      )
    }

    const arrayBuffer = await res.arrayBuffer()
    const contentType =
      type === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    const ext = type === 'pdf' ? 'pdf' : 'xlsx'

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="report.${ext}"`,
      },
    })
  } catch (error: any) {
    console.error('Error in /api/reports/preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate report preview' },
      { status: 500 },
    )
  }
}



