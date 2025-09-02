import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, whereClause, ...connectionDto } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Validate required connection fields
    const { host, port, databaseName, username, password } = connectionDto;
    if (!host || !port || !databaseName || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required connection fields: host, port, databaseName, username, password' },
        { status: 400 }
      );
    }

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/generate-custom-excel?tableName=${encodeURIComponent(tableName)}${whereClause ? `&whereClause=${encodeURIComponent(whereClause)}` : ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseEngine: connectionDto.databaseEngine || 'postgresql',
        host,
        port: parseInt(port),
        databaseName,
        username,
        password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine generate custom excel error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/generate-custom-excel`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    // Handle binary response for Excel
    if (response.headers.get('content-type')?.includes('spreadsheetml')) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${tableName}_custom_report.xlsx"`
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating custom Excel report from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to generate custom Excel report from reporting engine' },
      { status: 500 }
    );
  }
}
