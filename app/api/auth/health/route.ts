import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  console.log('[Auth Health] Env check:', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    HAVE_SECRET: !!process.env.NEXTAUTH_SECRET,
    HAVE_GOOGLE_ID: !!process.env.GOOGLE_CLIENT_ID,
    HAVE_GOOGLE_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV
  })

  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({ 
      ok: true, 
      session: !!session,
      hasUser: !!session?.user,
      environment: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        HAVE_SECRET: !!process.env.NEXTAUTH_SECRET,
        HAVE_GOOGLE_ID: !!process.env.GOOGLE_CLIENT_ID,
        HAVE_GOOGLE_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      }
    })
  } catch (e: any) {
    console.error('[Auth Health] Error:', e)
    return NextResponse.json({ 
      ok: false, 
      error: String(e?.message || e),
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 })
  }
}
