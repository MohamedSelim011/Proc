import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      inventoryBaseUrlConfigured: Boolean(process.env.INVENTORY_SYSTEM_BASE_URL?.trim()),
    },
  });
}

