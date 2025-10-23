import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Generate new API key
async function handleGenerateApiKey(req: NextRequest, session: any) {
  try {
    // Try to find user, with dev fallback
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    // Development fallback - if user not found, use any user
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('⚠️ Generate API Key: User not found, using dev fallback');
      user = await prisma.user.findFirst({
        include: { organization: true }
      })
    }

    // In development, allow any role to generate API keys
    const hasPermission = process.env.NODE_ENV === 'development' || 
      (user && ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role));

    if (!user || !hasPermission) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: 403
      })
    }

    if (!user.organizationId || !user.organization) {
      // In development, return mock generated key if no organization
      if (process.env.NODE_ENV === 'development') {
        const mockApiKey = `avenai_dev_${crypto.randomBytes(32).toString('hex')}`;
        console.log('🔧 Generated mock API key for development');
        return createResponse({
          message: 'API key generated successfully (dev mode)',
          apiKey: mockApiKey,
          organization: {
            id: 'dev-org',
            name: 'Development Organization',
            slug: 'dev-org'
          }
        }, 'API key generated successfully (dev mode)')
      }
      
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'User has no organization',
        statusCode: 400
      })
    }

    // Generate new API key
    const apiKey = `avenai_${crypto.randomBytes(32).toString('hex')}`
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
    const keyPrefix = apiKey.substring(0, 8) // "avenai_"

    try {
      // Check if organization already has an active API key
      const existingKey = await prisma.apiKey.findFirst({
        where: {
          organizationId: user.organizationId,
          isActive: true
        }
      })

      if (existingKey) {
        return createErrorResponse({
          code: 'BAD_REQUEST',
          message: 'Organization already has an active API key. Please revoke the existing key first.',
          statusCode: 400
        })
      }

      // Create new API key record
      await prisma.apiKey.create({
        data: {
          organizationId: user.organizationId,
          keyHash: hashedKey,
          keyPrefix: keyPrefix,
          name: 'Default API Key',
          createdBy: user.id
        }
      })

      // Also update organization with the API key hash for backward compatibility
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { apiKeyHash: hashedKey }
      })
    } catch (error) {
      // Fallback to old method if ApiKey model doesn't exist yet
      console.log('⚠️ ApiKey model not found, using fallback method');
      
      // Check if organization already has an API key
      if (user.organization.apiKeyHash) {
        return createErrorResponse({
          code: 'BAD_REQUEST',
          message: 'Organization already has an active API key. Please revoke the existing key first.',
          statusCode: 400
        })
      }

      // Update organization with new API key
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { apiKeyHash: hashedKey }
      })
    }

    // Log API key generation
    await prisma.analyticsEvent.create({
      data: {
        organizationId: user.organizationId!,
        eventType: 'api_key_generated',
        eventData: {
          generatedBy: user.email,
          timestamp: new Date().toISOString()
        },
        userIdentifier: user.email
      }
    })

    return createResponse({
      message: 'API key generated successfully',
      apiKey: apiKey,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug
      }
    }, 'API key generated successfully')

  } catch (error) {
    console.error('Generate API key error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate API key',
      statusCode: 500
    })
  }
}

// Get current API key info (without revealing the key)
async function handleGetApiKeyInfo(req: NextRequest, session: any) {
  try {
    console.log('🔍 API Key Info - Session user ID:', session.user?.id);
    
    // Try to find user, with dev fallback
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })
    console.log('🔍 User found:', user ? 'YES' : 'NO');

    // Development fallback - if user not found, use any user
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('⚠️ User not found, trying dev fallback');
      try {
        user = await prisma.user.findFirst({
          include: { organization: true }
        })
        if (user) {
          console.log('✅ Found user via dev fallback:', user.email);
        } else {
          console.log('❌ No users found in database');
        }
      } catch (error) {
        console.log('❌ Database error:', error.message);
      }
    }

    if (!user) {
      console.error('❌ API Key Error: No user found');
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404
      })
    }

    // If user exists but has no organization, create one in development
    if (!user.organization && process.env.NODE_ENV === 'development') {
      console.log('🔧 User has no organization, creating one for development');
      try {
        const org = await prisma.organization.create({
          data: {
            name: 'Development Organization',
            slug: `dev-org-${Date.now()}`,
            subscriptionTier: 'PRO',
            ownerId: user.id
          }
        })
        
        // Update user to link to organization
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: org.id }
        })
        
        // Refresh user with organization
        user = await prisma.user.findUnique({
          where: { id: user.id },
          include: { organization: true }
        })
        
        console.log('✅ Created organization and linked user');
      } catch (error) {
        console.error('❌ Failed to create organization:', error.message);
        return createErrorResponse({
          code: 'INTERNAL_ERROR',
          message: 'Failed to create organization',
          statusCode: 500
        })
      }
    }

    if (!user.organization) {
      console.error('❌ API Key Error: User has no organization');
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'User has no organization',
        statusCode: 400
      })
    }
    
    console.log('✅ Found user:', user.email, 'org:', user.organization.name);

    // Get existing API keys for this organization
    let apiKeys = []
    let hasApiKey = false
    
    try {
      apiKeys = await prisma.apiKey.findMany({
        where: {
          organizationId: user.organizationId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          createdByUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
      hasApiKey = apiKeys.length > 0
    } catch (error) {
      // Fallback to old method if ApiKey model doesn't exist yet
      console.log('⚠️ ApiKey model not found, using fallback method');
      hasApiKey = !!user.organization.apiKeyHash
    }

    // Get API usage statistics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const apiUsage = await prisma.analyticsEvent.count({
      where: {
        organizationId: user.organizationId!,
        eventType: 'api_chat_request',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    return createResponse({
      hasApiKey: hasApiKey,
      apiKeys: apiKeys.map(key => ({
        id: key.id,
        keyPrefix: key.keyPrefix,
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        createdBy: key.createdByUser.name || key.createdByUser.email
      })),
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        subscriptionTier: user.organization.subscriptionTier
      },
      limits: {
        requestsPerMinute: user.organization.subscriptionTier === 'PRO' ? 1000 : 60,
        requestsPerDay: user.organization.subscriptionTier === 'PRO' ? 10000 : 200,
        documentsMax: user.organization.subscriptionTier === 'PRO' ? 1000 : 60
      },
      usage: {
        requestsLast30Days: apiUsage,
        lastUsed: apiKeys.length > 0 ? apiKeys[0].lastUsedAt?.toISOString() : null
      }
    }, 'API key info retrieved successfully')

  } catch (error) {
    console.error('Get API key info error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch API key info',
      statusCode: 500
    })
  }
}

// Revoke API key
async function handleRevokeApiKey(req: NextRequest, session: any) {
  try {
    // Try to find user, with dev fallback
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    // Development fallback - if user not found, use any user
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('⚠️ Revoke API Key: User not found, using dev fallback');
      user = await prisma.user.findFirst({
        include: { organization: true }
      })
    }

    // In development, allow any role to revoke API keys
    const hasPermission = process.env.NODE_ENV === 'development' || 
      (user && ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role));

    if (!user || !hasPermission) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: 403
      })
    }

    if (!user.organizationId || !user.organization) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'User has no organization',
        statusCode: 400
      })
    }

    try {
      // Deactivate all API keys for this organization
      await prisma.apiKey.updateMany({
        where: {
          organizationId: user.organizationId,
          isActive: true
        },
        data: {
          isActive: false
        }
      })
    } catch (error) {
      // Fallback to old method if ApiKey model doesn't exist yet
      console.log('⚠️ ApiKey model not found, using fallback method');
      
      // Remove API key from organization
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { apiKeyHash: null }
      })
    }

    // Log API key revocation
    await prisma.analyticsEvent.create({
      data: {
        organizationId: user.organizationId!,
        eventType: 'api_key_revoked',
        eventData: {
          revokedBy: user.email,
          timestamp: new Date().toISOString()
        },
        userIdentifier: user.email
      }
    })

    return createResponse({
      message: 'API key revoked successfully'
    }, 'API key revoked successfully')

  } catch (error) {
    console.error('Revoke API key error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to revoke API key',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetApiKeyInfo)
export const POST = withAuth(handleGenerateApiKey)
export const DELETE = withAuth(handleRevokeApiKey)
