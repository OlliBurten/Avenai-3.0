import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // This is a one-time script to update Oliver's account
    // In production, this should be secured or removed after use
    
    console.log('🔍 Looking for Oliver\'s account...')
    
    // Find Oliver's user account
    const user = await prisma.user.findFirst({
      where: {
        email: 'oliver@avenai.io'
      },
      include: {
        organization: true
      }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Oliver\'s account not found!' 
      }, { status: 404 })
    }

    if (!user.organization) {
      return NextResponse.json({ 
        error: 'Oliver\'s organization not found!' 
      }, { status: 404 })
    }

    console.log(`✅ Found Oliver's account: ${user.email}`)
    console.log(`📊 Current organization: ${user.organization.name}`)
    console.log(`🎯 Current tier: ${user.organization.subscriptionTier}`)

    // Update organization to FOUNDER tier
    const updatedOrg = await prisma.organization.update({
      where: {
        id: user.organizationId!
      },
      data: {
        subscriptionTier: 'FOUNDER',
        subscriptionStatus: 'ACTIVE'
      }
    })

    console.log('🎉 Successfully updated Oliver\'s organization to FOUNDER tier!')
    console.log(`📈 New tier: ${updatedOrg.subscriptionTier}`)
    console.log(`📊 Status: ${updatedOrg.subscriptionStatus}`)

    return NextResponse.json({
      success: true,
      message: 'Oliver\'s account updated to FOUNDER tier with unlimited access!',
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        subscriptionTier: updatedOrg.subscriptionTier,
        subscriptionStatus: updatedOrg.subscriptionStatus
      }
    })

  } catch (error) {
    console.error('❌ Error updating founder tier:', error)
    return NextResponse.json({ 
      error: 'Failed to update founder tier',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
