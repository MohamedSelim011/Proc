import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const METABASE_URL = process.env.METABASE_URL;
    const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

    // Check if Metabase is available by pinging the health endpoint
    const response = await fetch(`${METABASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      return NextResponse.json({ 
        status: 'available',
        url: METABASE_URL,
        secretKey: METABASE_SECRET_KEY,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          status: 'unavailable',
          error: 'Metabase health check failed',
          url: METABASE_URL,
          secretKey: METABASE_SECRET_KEY,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Metabase health check error:', error);
    return NextResponse.json(
      { 
        status: 'unavailable',
        error: 'Failed to connect to Metabase',
        url: process.env.METABASE_URL || 'Not configured',
        secretKey: process.env.METABASE_SECRET_KEY || 'Not configured',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
