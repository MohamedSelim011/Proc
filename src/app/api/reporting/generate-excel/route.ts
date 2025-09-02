import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, selectedColumns } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Construct connection DTO from environment variables
    const connectionDto = {
      databaseEngine: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      databaseName: process.env.DB_NAME || 'wujha_procurement',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('tableName', tableName);
    
    // Add selected columns as query parameters if provided
    if (selectedColumns && selectedColumns.length > 0) {
      selectedColumns.forEach((column: string) => {
        queryParams.append('columns', column);
      });
    }

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/generate-excel?${queryParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionDto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine generate excel error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/generate-excel`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    // Handle binary response for Excel
    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${tableName}_report.xlsx"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating Excel report from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel report from reporting engine' },
      { status: 500 }
    );
  }
}
