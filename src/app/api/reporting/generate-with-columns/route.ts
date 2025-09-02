import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields according to Swagger schema
    const { connectionDto, tableName, selectedColumns, whereClause } = body;
    
    if (!connectionDto || !tableName || !selectedColumns || !Array.isArray(selectedColumns)) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionDto, tableName, selectedColumns' },
        { status: 400 }
      );
    }

    const { host, port, databaseName, username, password } = connectionDto;
    if (!host || !port || !databaseName || !username || password === undefined) {
      return NextResponse.json(
        { error: 'Missing required connection fields: host, port, databaseName, username, password' },
        { status: 400 }
      );
    }

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/generate-with-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionDto: {
          databaseEngine: connectionDto.databaseEngine || 'postgresql',
          host,
          port: parseInt(port),
          databaseName,
          username,
          password
        },
        tableName,
        selectedColumns,
        whereClause: whereClause || undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine generate with columns error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/generate-with-columns`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    // Handle binary response for PDF
    if (response.headers.get('content-type')?.includes('application/pdf')) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${tableName}_report.pdf"`
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating report with columns from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to generate report with columns from reporting engine' },
      { status: 500 }
    );
  }
}
