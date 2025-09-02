import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    // Use environment variables for database connection
    const connectionDto = {
      databaseEngine: 'postgresql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      databaseName: process.env.DB_NAME || 'wujha_procurement',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionDto)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine tables error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/tables`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tables from reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables from reporting engine' },
      { status: 500 }
    );
  }
}
