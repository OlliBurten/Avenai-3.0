import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization from user membership
    const membership = await prisma.memberships.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    })
    
    const orgId = membership?.org?.id

    // If no orgId, assume onboarding is not completed (user likely needs to create organization)
    if (!orgId) {
      console.log('[Onboarding] No orgId found, returning incomplete')
      return NextResponse.json({ completed: false })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { onboardingCompleted: true }
    })

    return NextResponse.json({ 
      completed: org?.onboardingCompleted || false 
    })
  } catch (error) {
    console.error('Onboarding status error:', error)
    // If there's an error, assume onboarding is not completed rather than crashing
    return NextResponse.json({ completed: false })
  }
}
