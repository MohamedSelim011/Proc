import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, columns, filters, limit = 100 } = body;

    if (!tableName || !columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { error: 'Table name and columns array are required' },
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

    // Use the preview-with-columns endpoint since there's no general preview endpoint
    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/preview-with-columns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionDto,
        tableName,
        selectedColumns: columns,
        whereClause: filters && filters.length > 0 ? 
          filters.map(f => `${f.column} ${f.operator} '${f.value}'`).join(' AND ') : 
          undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine preview error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/preview-with-columns`
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
          'Content-Disposition': `inline; filename="${tableName}_preview.pdf"`
        }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error previewing report from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to preview report from reporting engine' },
      { status: 500 }
    );
  }
}
