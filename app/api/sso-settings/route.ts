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

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        subscriptionTier: true,
        ssoSettings: true,
        name: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if user has Pro subscription for SSO
    if (organization.subscriptionTier !== 'PRO' && organization.subscriptionTier !== 'FOUNDER') {
      return NextResponse.json({ 
        error: 'SSO integration requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    // Default SSO settings
    const defaultSsoSettings = {
      enabled: false,
      provider: 'saml', // saml, oauth, custom
      saml: {
        entityId: '',
        ssoUrl: '',
        x509Certificate: '',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
      },
      oauth: {
        clientId: '',
        clientSecret: '',
        authorizationUrl: '',
        tokenUrl: '',
        userInfoUrl: '',
        scope: 'openid email profile'
      },
      custom: {
        loginUrl: '',
        logoutUrl: '',
        userInfoUrl: '',
        apiKey: ''
      },
      autoProvisioning: true,
      roleMapping: {
        defaultRole: 'MEMBER',
        attributeMappings: {
          email: 'email',
          name: 'name',
          role: 'role'
        }
      }
    }

    // Merge with saved settings
    const savedSettings = organization.ssoSettings as any || {}
    const ssoSettings = { ...defaultSsoSettings, ...savedSettings }

    return NextResponse.json({
      success: true,
      settings: ssoSettings,
      subscriptionTier: organization.subscriptionTier,
      organizationName: organization.name
    })

  } catch (error) {
    console.error('Error fetching SSO settings:', error)
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

    // Check if user has Pro subscription for SSO
    if (organization.subscriptionTier !== 'PRO' && organization.subscriptionTier !== 'FOUNDER') {
      return NextResponse.json({ 
        error: 'SSO integration requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    // Validate SSO settings based on provider
    if (settings.enabled) {
      if (settings.provider === 'saml') {
        if (!settings.saml?.entityId || !settings.saml?.ssoUrl || !settings.saml?.x509Certificate) {
          return NextResponse.json({ 
            error: 'SAML configuration requires Entity ID, SSO URL, and X.509 Certificate',
            code: 'INVALID_SAML_CONFIG'
          }, { status: 400 })
        }
      } else if (settings.provider === 'oauth') {
        if (!settings.oauth?.clientId || !settings.oauth?.clientSecret || !settings.oauth?.authorizationUrl) {
          return NextResponse.json({ 
            error: 'OAuth configuration requires Client ID, Client Secret, and Authorization URL',
            code: 'INVALID_OAUTH_CONFIG'
          }, { status: 400 })
        }
      } else if (settings.provider === 'custom') {
        if (!settings.custom?.loginUrl || !settings.custom?.userInfoUrl) {
          return NextResponse.json({ 
            error: 'Custom SSO configuration requires Login URL and User Info URL',
            code: 'INVALID_CUSTOM_CONFIG'
          }, { status: 400 })
        }
      }
    }

    // Update SSO settings
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ssoSettings: settings
      }
    })

    return NextResponse.json({
      success: true,
      message: 'SSO settings updated successfully'
    })

  } catch (error) {
    console.error('Error updating SSO settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
