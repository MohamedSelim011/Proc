import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const contract = await prisma.serviceContract.findUnique({
      where: { id },
      include: {
        vendor: true,
        pr: {
          include: {
            servicePR: {
              include: {
                items: {
                  include: {
                    serviceItem: {
                      include: {
                        serviceCategory: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!contract) {
      return NextResponse.json(
        { error: 'Service contract not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(contract);
  } catch (error) {
    console.error('Error fetching service contract:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 