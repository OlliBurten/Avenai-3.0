import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org')
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { 
        subscriptionTier: true,
        ssoSettings: true,
        name: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if organization has Pro subscription
    if (organization.subscriptionTier !== 'PRO' && organization.subscriptionTier !== 'FOUNDER') {
      return NextResponse.json({ 
        error: 'OAuth SSO requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    const ssoSettings = organization.ssoSettings as any || {}
    
    if (!ssoSettings.enabled || ssoSettings.provider !== 'oauth') {
      return NextResponse.json({ 
        error: 'OAuth SSO not configured for this organization',
        code: 'SSO_NOT_CONFIGURED'
      }, { status: 400 })
    }

    // If no code, redirect to OAuth provider
    if (!code) {
      const authUrl = new URL(ssoSettings.oauth.authorizationUrl)
      authUrl.searchParams.set('client_id', ssoSettings.oauth.clientId)
      authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/sso/oauth?org=${orgId}`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', ssoSettings.oauth.scope)
      authUrl.searchParams.set('state', orgId)

      return NextResponse.redirect(authUrl.toString())
    }

    // Exchange code for access token
    const tokenResponse = await fetch(ssoSettings.oauth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ssoSettings.oauth.clientId,
        client_secret: ssoSettings.oauth.clientSecret,
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/sso/oauth?org=${orgId}`
      })
    })

    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to exchange code for token',
        code: 'TOKEN_EXCHANGE_FAILED'
      }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch(ssoSettings.oauth.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!userInfoResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to get user info',
        code: 'USER_INFO_FAILED'
      }, { status: 400 })
    }

    const userInfo = await userInfoResponse.json()

    // Map user attributes
    const mappedUser = {
      id: userInfo.sub || userInfo.id || `oauth_user_${Date.now()}`,
      email: userInfo.email || userInfo.email_address,
      firstName: userInfo.given_name || userInfo.first_name || userInfo.name?.split(' ')[0] || '',
      lastName: userInfo.family_name || userInfo.last_name || userInfo.name?.split(' ').slice(1).join(' ') || '',
      role: mapUserRole(userInfo, ssoSettings.roleMapping)
    }

    // Create or update user in database
    let user = await prisma.user.findFirst({
      where: {
        email: mappedUser.email,
        organizationId: orgId
      }
    })

    if (!user && ssoSettings.autoProvisioning) {
      // Auto-provision new user
      user = await prisma.user.create({
        data: {
          email: mappedUser.email,
          firstName: mappedUser.firstName,
          lastName: mappedUser.lastName,
          role: mappedUser.role,
          organizationId: orgId,
          emailVerified: new Date(),
          isActive: true
        }
      })
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found and auto-provisioning disabled',
        code: 'USER_NOT_FOUND'
      }, { status: 404 })
    }

    // Generate JWT token
    const token = generateJWTToken(user, orgId)

    // Redirect to dashboard with token
    const redirectUrl = new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL)
    redirectUrl.searchParams.set('token', token)

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('Error processing OAuth SSO:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function mapUserRole(userInfo: any, roleMapping: any) {
  if (!roleMapping?.attributeMappings?.role) {
    return roleMapping?.defaultRole || 'MEMBER'
  }

  const roleAttribute = roleMapping.attributeMappings.role
  const userRole = userInfo[roleAttribute]
  
  // Map common role values
  const roleMap: { [key: string]: string } = {
    'admin': 'ADMIN',
    'administrator': 'ADMIN',
    'manager': 'ADMIN',
    'user': 'MEMBER',
    'member': 'MEMBER',
    'viewer': 'VIEWER',
    'readonly': 'VIEWER'
  }

  return roleMap[userRole?.toLowerCase()] || roleMapping.defaultRole || 'MEMBER'
}

function generateJWTToken(user: any, organizationId: string) {
  // Simplified JWT token generation for demo
  // In production, use a proper JWT library with secret key
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: organizationId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = require('crypto').createHash('sha256').update(encodedHeader + '.' + encodedPayload + '.secret').digest('base64url')
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}
