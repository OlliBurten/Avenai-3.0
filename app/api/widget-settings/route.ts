import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get organization from user membership
    const membership = await prisma.membership.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    })
    
    const organizationId = membership?.org?.id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        subscriptionTier: true,
        widgetSettings: true,
        name: true,
        logoUrl: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Default widget settings
    const defaultSettings = {
      title: 'AI Assistant',
      subtitle: 'How can I help you today?',
      primaryColor: '#3B82F6',
      showBranding: organization.subscriptionTier === 'FREE',
      position: 'bottom-right',
      welcomeMessage: 'Hello! I\'m here to help with your questions.',
      customLogo: null,
      customDomain: null,
      // Pro white-label settings
      whiteLabel: organization.subscriptionTier === 'PRO' || organization.subscriptionTier === 'FOUNDER',
      customCss: null,
      customJs: null,
      hideAvenaiFooter: organization.subscriptionTier === 'PRO' || organization.subscriptionTier === 'FOUNDER',
      customApiEndpoint: null
    }

    // Merge with saved settings
    const savedSettings = organization.widgetSettings as any || {}
    const widgetSettings = { ...defaultSettings, ...savedSettings }

    return NextResponse.json({
      success: true,
      settings: widgetSettings,
      subscriptionTier: organization.subscriptionTier,
      organizationName: organization.name,
      organizationLogo: organization.logoUrl
    })

  } catch (error) {
    console.error('Error fetching widget settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get organization from user membership
    const membership = await prisma.membership.findFirst({
      where: { userId: (session.user as any).id },
      include: { org: true }
    })
    
    const organizationId = membership?.org?.id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { settings } = await req.json()

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user can customize branding
    const canCustomizeBranding = organization.subscriptionTier === 'PRO' || organization.subscriptionTier === 'FOUNDER'
    
    if (!canCustomizeBranding && settings.showBranding === false) {
      return NextResponse.json({ 
        error: 'Custom branding requires Pro or Enterprise subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    // Update widget settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        widgetSettings: settings
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Widget settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating widget settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}