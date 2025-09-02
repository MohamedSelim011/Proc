import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
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

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/table-relationships?tableName=${encodeURIComponent(tableName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connectionDto)
    });

    if (!response.ok) {
      // If the endpoint doesn't exist or returns an error, return empty array
      console.log(`No relationships found for table ${tableName}, returning empty array`);
      return NextResponse.json([]);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching table relationships from reporting engine:', error);
    // Return empty array instead of error to allow the frontend to continue
    return NextResponse.json([]);
  }
}
