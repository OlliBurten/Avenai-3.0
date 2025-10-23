import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org')
    const samlRequest = searchParams.get('SAMLRequest')

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
        error: 'SAML SSO requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    const ssoSettings = organization.ssoSettings as any || {}
    
    if (!ssoSettings.enabled || ssoSettings.provider !== 'saml') {
      return NextResponse.json({ 
        error: 'SAML SSO not configured for this organization',
        code: 'SSO_NOT_CONFIGURED'
      }, { status: 400 })
    }

    // Generate SAML Response
    const samlResponse = generateSamlResponse(ssoSettings.saml, organization.name)

    return new NextResponse(samlResponse, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Error processing SAML request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org')

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
        error: 'SAML SSO requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    const ssoSettings = organization.ssoSettings as any || {}
    
    if (!ssoSettings.enabled || ssoSettings.provider !== 'saml') {
      return NextResponse.json({ 
        error: 'SAML SSO not configured for this organization',
        code: 'SSO_NOT_CONFIGURED'
      }, { status: 400 })
    }

    // Process SAML Response (simplified for demo)
    const formData = await req.formData()
    const samlResponse = formData.get('SAMLResponse') as string

    if (!samlResponse) {
      return NextResponse.json({ error: 'SAML Response required' }, { status: 400 })
    }

    // In a real implementation, you would:
    // 1. Decode and validate the SAML response
    // 2. Verify the digital signature
    // 3. Extract user attributes
    // 4. Create or update user account
    // 5. Generate JWT token

    // For demo purposes, we'll simulate a successful login
    const mockUser = {
      id: 'sso_user_' + Date.now(),
      email: 'user@example.com',
      firstName: 'SSO',
      lastName: 'User',
      role: ssoSettings.roleMapping?.defaultRole || 'MEMBER'
    }

    // Generate JWT token (simplified)
    const token = generateJWTToken(mockUser, orgId)

    return NextResponse.json({
      success: true,
      token,
      user: mockUser,
      redirectUrl: '/dashboard'
    })

  } catch (error) {
    console.error('Error processing SAML response:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSamlResponse(samlConfig: any, organizationName: string) {
  const responseId = 'saml_response_' + Date.now()
  const assertionId = 'assertion_' + Date.now()
  const issueInstant = new Date().toISOString()
  
  return `<!DOCTYPE html>
<html>
<head>
    <title>SAML SSO - ${organizationName}</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 500px; margin: 0 auto; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h2>SAML SSO Authentication</h2>
        <div class="spinner"></div>
        <p>Processing SAML authentication...</p>
        <form id="samlForm" method="POST" action="${samlConfig.ssoUrl}">
            <input type="hidden" name="SAMLResponse" value="${generateMockSamlResponse(responseId, assertionId, issueInstant)}" />
            <input type="hidden" name="RelayState" value="" />
        </form>
        <script>
            setTimeout(function() {
                document.getElementById('samlForm').submit();
            }, 2000);
        </script>
    </div>
</body>
</html>`;
}

function generateMockSamlResponse(responseId: string, assertionId: string, issueInstant: string) {
  // This is a simplified mock SAML response for demo purposes
  // In production, you would generate a proper SAML response with digital signature
  return Buffer.from(`
    <samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
                    ID="${responseId}" 
                    Version="2.0" 
                    IssueInstant="${issueInstant}">
        <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">Avenai</saml:Issuer>
        <samlp:Status>
            <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
        </samlp:Status>
        <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
                        ID="${assertionId}" 
                        Version="2.0" 
                        IssueInstant="${issueInstant}">
            <saml:Issuer>Avenai</saml:Issuer>
            <saml:Subject>
                <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">user@example.com</saml:NameID>
            </saml:Subject>
            <saml:AttributeStatement>
                <saml:Attribute Name="email">
                    <saml:AttributeValue>user@example.com</saml:AttributeValue>
                </saml:Attribute>
                <saml:Attribute Name="name">
                    <saml:AttributeValue>SSO User</saml:AttributeValue>
                </saml:Attribute>
            </saml:AttributeStatement>
        </saml:Assertion>
    </samlp:Response>
  `).toString('base64');
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
  const signature = createHash('sha256').update(encodedHeader + '.' + encodedPayload + '.secret').digest('base64url')
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}
