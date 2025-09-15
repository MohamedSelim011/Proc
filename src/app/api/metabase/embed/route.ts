import { NextRequest, NextResponse } from 'next/server';

const METABASE_URL = process.env.METABASE_URL;
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    const { dashboardId } = await req.json();

    if (!dashboardId) {
      return NextResponse.json({ error: 'Dashboard ID is required' }, { status: 400 });
    }

    // Generate JWT token for Metabase embedding
    const payload = {
      resource: { dashboard: dashboardId },
      params: {},
      exp: Math.round(Date.now() / 1000) + (10 * 60) // 10 minutes from now
    };

    // Simple JWT creation (for production, use a proper JWT library)
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Create signature using HMAC SHA256
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', METABASE_SECRET_KEY)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    // Generate the embed URL
    const embedUrl = `${METABASE_URL}/embed/dashboard/${token}#bordered=false&titled=false`;

    return NextResponse.json({ 
      embedUrl,
      token,
      dashboardId,
      expiresAt: new Date(payload.exp * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error generating embed token:', error);
    return NextResponse.json({ error: 'Failed to generate embed token' }, { status: 500 });
  }
}
