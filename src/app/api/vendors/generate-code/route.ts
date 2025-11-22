import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to generate unique vendor code
async function generateUniqueVendorCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Generate 8-digit random number
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const vendorCode = `VEN-${randomNum}`;
    
    // Check if code already exists
    const existing = await prisma.vendor.findUnique({
      where: { vendorCode }
    });
    
    if (!existing) {
      return vendorCode;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based code if random generation fails
  const timestamp = Date.now().toString().slice(-8);
  return `VEN-${timestamp}`;
}

// GET /api/vendors/generate-code - Generate a unique vendor code
export async function GET(request: NextRequest) {
  try {
    const vendorCode = await generateUniqueVendorCode();
    return NextResponse.json({ vendorCode }, { status: 200 });
  } catch (error) {
    console.error('Error generating vendor code:', error);
    return NextResponse.json(
      { error: 'Failed to generate vendor code' },
      { status: 500 }
    );
  }
}

