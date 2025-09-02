import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields according to Swagger schema
    const { databaseEngine, host, port, databaseName, username, password } = body;
    
    if (!host || !port || !databaseName || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: host, port, databaseName, username, password' },
        { status: 400 }
      );
    }

    const response = await fetch(`${REPORTING_ENGINE_URL}/api/v1/reports/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        databaseEngine: databaseEngine || 'postgresql',
        host,
        port: parseInt(port),
        databaseName,
        username,
        password
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reporting engine test connection error:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/test-connection`
      });
      throw new Error(`Reporting engine responded with status: ${response.status}, response: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing connection to reporting engine:', error);
    return NextResponse.json(
      { error: 'Failed to test connection to reporting engine' },
      { status: 500 }
    );
  }
}
