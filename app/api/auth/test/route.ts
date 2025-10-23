import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    console.log('Testing auth endpoint...')
    
    // Test environment variables
    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID
    const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
    
    console.log('Environment check:', {
      hasGoogleClientId,
      hasGoogleClientSecret,
      hasNextAuthSecret
    })
    
    return NextResponse.json({
      success: true,
      environment: {
        hasGoogleClientId,
        hasGoogleClientSecret,
        hasNextAuthSecret
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
