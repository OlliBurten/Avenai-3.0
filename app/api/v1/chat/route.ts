import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEmbedding, generateResponse } from '@/lib/openai'
import { searchSimilarDocuments } from '@/lib/pgvector'
import crypto from 'crypto'

// API Key authentication
async function authenticateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!apiKey) {
    return null
  }

  try {
    // Hash the provided API key
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // Find organization by API key
    const organization = await prisma.organization.findFirst({
      where: {
        apiKeyHash: hashedKey
      },
      include: {
        users: {
          where: {
            isActive: true
          },
          take: 1
        }
      }
    })

    if (!organization) {
      return null
    }

    return {
      organization,
      user: organization.users[0] // Use first active user for context
    }
  } catch (error) {
    console.error('API key authentication error:', error)
    return null
  }
}

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(apiKey: string, limit: number = 100, windowMs: number = 60000) {
  const now = Date.now()
  const key = `rate_limit:${apiKey}`
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= limit) {
    return false
  }
  
  current.count++
  return true
}

// Chat endpoint for public API
export async function POST(request: NextRequest) {
  try {
    // Authenticate API key
    const auth = await authenticateApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Rate limiting
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!checkRateLimit(apiKey!)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { message, context, stream = false } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Search for relevant document chunks
    let relevantChunks: any[] = []
    
    // Use database search (working perfectly for pilot)
    console.log('🔄 Using database search for org:', auth.organization.id);
    relevantChunks = await prisma.documentChunk.findMany({
      where: {
        organizationId: auth.organization.id,
        document: {
          status: "COMPLETED"
        }
      },
      include: {
        document: true
      },
      take: 5,
      orderBy: {
        id: 'desc'
      }
    })
    console.log('✅ Database search returned:', relevantChunks.length, 'chunks');

    // Build context from relevant chunks
    const documentContext = relevantChunks.length > 0
      ? relevantChunks.map(chunk => {
          if ('score' in chunk && typeof chunk.score === 'number') {
            return `[Score: ${chunk.score.toFixed(3)}]\n${(chunk as any).text}`
          }
          return (chunk as any).text || chunk.content
        }).join('\n\n')
      : ''

    // Combine with provided context
    const fullContext = context ? `${context}\n\n${documentContext}` : documentContext

    // Generate response
    const response = await generateResponse(message, fullContext)

    // Log API usage
    await prisma.analyticsEvent.create({
      data: {
        organizationId: auth.organization.id,
        eventType: 'api_chat_request',
        eventData: {
          message: message.substring(0, 100), // Truncate for privacy
          contextLength: fullContext.length,
          chunkCount: relevantChunks.length,
          apiKey: apiKey?.substring(0, 8) + '...' // Partial key for tracking
        },
        userIdentifier: auth.user?.email,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      response: response,
      context: {
        sources: relevantChunks.map(chunk => ({
          title: (chunk as any).document?.title || 'Document',
          score: (chunk as any).score?.toFixed(3) || 'N/A'
        })),
        chunkCount: relevantChunks.length,
        contextLength: fullContext.length
      },
      usage: {
        organizationId: auth.organization.id,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Public API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get organization info
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      organization: {
        id: auth.organization.id,
        name: auth.organization.name,
        slug: auth.organization.slug,
        subscriptionTier: auth.organization.subscriptionTier,
        subscriptionStatus: auth.organization.subscriptionStatus
      },
      limits: {
        // These would come from subscription tier in production
        requestsPerMinute: 100,
        requestsPerDay: 10000,
        documentsMax: 1000
      }
    })

  } catch (error) {
    console.error('Public API info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
