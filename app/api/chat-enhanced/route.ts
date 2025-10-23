import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ChatRequest {
  message: string
  sessionId?: string
  stream?: boolean
  organizationId?: string
  datasetId?: string
  conversationHistory?: any[]
}

interface ChatResponse {
  message: string
  sessionId: string
  metadata?: {
    sources?: any[]
    confidence?: number
    processingTime?: number
  }
  suggestions?: string[]
}

// POST /api/chat-enhanced - Enhanced chat with streaming support
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Chat API: Starting request processing...')
    
    const session = await getSession()
    console.log('🔍 Chat API: Session check result:', session ? 'Found' : 'Not found')
    
    if (!session?.user || !(session.user as any).id) {
      console.log('🔍 Chat API: No session found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Chat API: User authenticated:', session.user.email)
    
    const body: ChatRequest = await req.json()
    console.log('🔍 Chat API: Request body parsed:', { message: body.message?.substring(0, 50), stream: body.stream })
    
    const { message, sessionId, stream = false, organizationId, datasetId, conversationHistory } = body

    if (!message || message.trim().length === 0) {
      console.log('🔍 Chat API: Empty message, returning 400')
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const userOrganizationId = (session.user as any).organizationId
    const userId = (session.user as any).id
    console.log('🔍 Chat API: User details:', { userId, userOrganizationId })

    // Generate session ID if not provided
    const currentSessionId = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log('🔍 Chat API: Session ID:', currentSessionId)

    // Skip database operations for now to test if that's the issue
    console.log('🔍 Chat API: Skipping database operations for testing...')

    // Generate AI response
    console.log('🔍 Chat API: Generating AI response...')
    const aiResponse = await generateAIResponse(message)
    console.log('🔍 Chat API: AI response generated:', aiResponse.content.substring(0, 50))

    const response: ChatResponse = {
      message: aiResponse.content,
      sessionId: currentSessionId,
      metadata: {
        sources: aiResponse.sources,
        confidence: aiResponse.confidence,
        processingTime: aiResponse.processingTime
      },
      suggestions: aiResponse.suggestions
    }

    console.log('🔍 Chat API: Preparing response...')

    // Handle streaming request
    if (stream) {
      console.log('🔍 Chat API: Returning streaming response')
      const stream = new ReadableStream({
        start(controller) {
          // Send metadata first
          const metadataChunk = `data: ${JSON.stringify({
            type: 'metadata',
            data: response.metadata
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(metadataChunk))

          // Simulate streaming by sending the response in chunks
          const words = response.message.split(' ')
          let currentText = ''
          
          const sendChunk = () => {
            if (words.length > 0) {
              const word = words.shift()
              currentText += (currentText ? ' ' : '') + word
              
              const chunk = `data: ${JSON.stringify({
                type: 'content',
                content: word + ' '
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(chunk))
              
              setTimeout(sendChunk, 100) // Simulate typing delay
            } else {
              // Send final chunk
              const finalChunk = `data: ${JSON.stringify({
                type: 'done',
                suggestions: response.suggestions
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(finalChunk))
              controller.close()
            }
          }
          
          setTimeout(sendChunk, 500) // Initial delay
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Regular JSON response
    console.log('🔍 Chat API: Returning JSON response')
    return NextResponse.json({ success: true, data: response })

  } catch (error) {
    console.error('🔍 Chat API: Error occurred:', error)
    console.error('🔍 Chat API: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET /api/chat-enhanced - Get chat sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).organizationId
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const sessions = await prisma.chatSession.findMany({
      where: { organizationId },
      orderBy: { lastActivityAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          take: 10
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
          messageCount: session.chatMessages.length,
          messages: session.chatMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt
          }))
        })),
        pagination: {
          limit,
          offset,
          total: await prisma.chatSession.count({ where: { organizationId } })
        }
      }
    })

  } catch (error) {
    console.error('Enhanced chat sessions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve chat sessions' },
      { status: 500 }
    )
  }
}

// Helper function to generate AI response
async function generateAIResponse(message: string) {
  // Simulate processing time
  const processingTime = Math.floor(Math.random() * 2000) + 500

  // Mock AI responses based on message content
  const responses = {
    'hello': 'Hello! I\'m your AI assistant. How can I help you with your API documentation today?',
    'help': 'I can help you with API documentation, integration guides, troubleshooting, and more. What specific topic would you like to explore?',
    'api': 'I can help you understand API endpoints, authentication, rate limits, and integration patterns. What would you like to know about your API?',
    'error': 'I can help you troubleshoot API errors. Please share the specific error message or code you\'re encountering.',
    'auth': 'For authentication, I can help you understand API keys, OAuth flows, JWT tokens, and security best practices.',
    'integration': 'I can guide you through API integration steps, provide code examples, and help with implementation details.',
    'default': 'I understand you\'re asking about API documentation. Let me help you find the most relevant information. Could you provide more specific details about what you\'re trying to accomplish?'
  }

  const messageLower = message.toLowerCase()
  let response = responses.default

  if (messageLower.includes('hello') || messageLower.includes('hi')) {
    response = responses.hello
  } else if (messageLower.includes('help')) {
    response = responses.help
  } else if (messageLower.includes('api')) {
    response = responses.api
  } else if (messageLower.includes('error') || messageLower.includes('problem')) {
    response = responses.error
  } else if (messageLower.includes('auth') || messageLower.includes('login')) {
    response = responses.auth
  } else if (messageLower.includes('integration') || messageLower.includes('implement')) {
    response = responses.integration
  }

  return {
    content: response,
    processingTime,
    confidence: 0.95,
    sources: [
      {
        title: 'API Documentation',
        url: '/docs/api',
        relevance: 0.9
      }
    ],
    suggestions: [
      'How do I authenticate with the API?',
      'What are the rate limits?',
      'Can you show me an example integration?'
    ]
  }
}
