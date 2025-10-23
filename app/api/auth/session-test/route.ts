import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    console.log('Testing session retrieval...')
    
    const session = await getServerSession(authOptions)
    
    console.log('Session result:', session ? 'Session found' : 'No session')
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      user: session?.user || null
    })
  } catch (error) {
    console.error('Session test error:', error)
    return NextResponse.json(
      { error: 'Session test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
