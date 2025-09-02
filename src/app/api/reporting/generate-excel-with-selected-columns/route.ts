import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields according to Swagger schema
    const { tableName, selectedColumns, whereClause } = body;
    
    if (!tableName || !selectedColumns) {
      return NextResponse.json(
        { error: 'Missing required fields: tableName, selectedColumns' },
        { status: 400 }
      );
    }

    // Use environment variables for database connection
    const connectionDto = {
      databaseEngine: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      databaseName: process.env.DB_NAME || 'wujha_procurement',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/generate-excel-with-selected-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionDto,
        tableName,
        selectedColumns,
        whereClause: whereClause || undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine generate excel with selected columns error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/generate-excel-with-selected-columns`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    // Handle binary response for Excel
    if (response.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${tableName}_report.xlsx"`
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating excel report with selected columns from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to generate excel report with selected columns from reporting engine' },
      { status: 500 }
    );
  }
}
