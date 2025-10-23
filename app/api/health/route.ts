import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for monitoring API status
 * Tests database connectivity and returns service status
 */
export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test`;
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'All systems operational',
      services: {
        api: {
          status: 'ok',
        },
        database: {
          status: 'ok',
        },
      },
    }, { status: 200 });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        api: {
          status: 'ok',
        },
        database: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    }, { status: 500 });
  }
}