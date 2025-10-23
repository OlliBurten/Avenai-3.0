import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Try to count organizations
    const orgCount = await prisma.organization.count()
    
    return NextResponse.json({
      success: true,
      databaseConnected: true,
      organizationCount: orgCount,
      message: 'Database connection successful'
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      databaseConnected: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }, { status: 500 })
  }
}
