import { NextRequest, NextResponse } from 'next/server';

const REPORTING_ENGINE_URL = process.env.REPORTING_ENGINE_URL || 'http://localhost:8080';

export async function GET() {
  try {
    console.log('Testing connectivity to external reporting engine...');
    
    // Since the external engine doesn't have a /health endpoint,
    // we'll test connectivity by calling the tables endpoint
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
      console.error('Reporting engine health check failed:', {
        status: response.status,
        statusText: response.statusText,
        response: errorText,
        url: `${REPORTING_ENGINE_URL}/api/v1/reports/tables`
      });
      
      return NextResponse.json({
        status: 'unhealthy',
        externalEngine: {
          url: REPORTING_ENGINE_URL,
          status: response.status,
          error: errorText
        },
        message: 'External reporting engine is not responding correctly'
      }, { status: 503 });
    }

    const data = await response.json();
    console.log('Reporting engine health check successful:', data);
    
    return NextResponse.json({
      status: 'healthy',
      externalEngine: {
        url: REPORTING_ENGINE_URL,
        status: response.status,
        response: data
      },
      message: 'External reporting engine is responding correctly'
    });
    
  } catch (error) {
    console.error('Error checking reporting engine health:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      externalEngine: {
        url: REPORTING_ENGINE_URL,
        error: error instanceof Error ? error.message : String(error)
      },
      message: 'Failed to connect to external reporting engine'
    }, { status: 503 });
  }
}
