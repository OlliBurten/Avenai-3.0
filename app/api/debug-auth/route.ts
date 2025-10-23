import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')

    console.log('🔍 Debug Auth - Token exists:', !!token)
    console.log('🔍 Debug Auth - Token value length:', token?.value?.length || 0)
    console.log('🔍 Debug Auth - Token preview:', token?.value?.substring(0, 50) + '...' || 'No token')

    if (!token || !token.value) {
      return NextResponse.json({ 
        error: 'No auth token found',
        hasToken: false,
        tokenLength: 0
      }, { status: 401 })
    }

    try {
      const { payload } = await jwtVerify(token.value, JWT_SECRET)
      return NextResponse.json({
        success: true,
        hasToken: true,
        tokenLength: token.value.length,
        user: {
          id: payload.id,
          email: payload.email,
          organizationId: payload.organizationId
        }
      })
    } catch (jwtError) {
      return NextResponse.json({
        error: 'Invalid JWT token',
        hasToken: true,
        tokenLength: token.value.length,
        jwtError: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error'
      }, { status: 401 })
    }

  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
