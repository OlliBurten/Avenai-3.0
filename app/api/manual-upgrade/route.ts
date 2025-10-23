import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

async function getSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')

    if (!token || !token.value) {
      return null
    }

    const tokenValue = token.value.trim()
    if (typeof tokenValue !== 'string' || tokenValue.split('.').length !== 3) {
      return null
    }

    if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(tokenValue)) {
      return null
    }

    const { payload } = await jwtVerify(tokenValue, JWT_SECRET)
    return { user: payload }
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planKey } = await request.json()

    // Update the organization to Pro plan
    await prisma.organization.update({
      where: { id: session.user.organizationId as string },
      data: {
        subscriptionTier: 'PRO',
        subscriptionStatus: 'ACTIVE',
        stripePriceId: 'price_1S51ARBtqKEIPtHzYUHOBfCD',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancelAtPeriodEnd: false
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated to Pro plan' 
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
