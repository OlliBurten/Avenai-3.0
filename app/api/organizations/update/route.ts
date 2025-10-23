import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, domain, settings } = await req.json()

    // Update the user's organization
    const updatedOrg = await prisma.organization.update({
      where: { 
        id: (session.user as any).organizationId 
      },
      data: {
        name,
        domain,
        settings: {
          ...settings,
          updatedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      organization: updatedOrg 
    })

  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' }, 
      { status: 500 }
    )
  }
}
