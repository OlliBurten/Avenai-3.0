import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEmbedding, generateResponse } from '@/lib/openai'
import { searchSimilarDocuments } from '@/lib/pgvector'

// Public chat endpoint for widget (no authentication required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, orgId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify organization exists or create demo organization
    let organization
    try {
      organization = await prisma.organization.findFirst({
        where: {
          id: orgId
        }
      })
    } catch (error) {
      console.error('Database connection error:', error)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { 
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        }
      )
    }

    if (!organization && orgId === 'demo-org') {
      // Create demo organization for testing
      organization = await prisma.organization.create({
        data: {
          id: 'demo-org',
          name: 'Demo Organization',
          slug: 'demo-org',
          subscriptionTier: 'PRO',
          subscriptionStatus: 'ACTIVE',
          settings: {},
          cancelAtPeriodEnd: false
        }
      })
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid organization' },
        { status: 404 }
      )
    }

    // Try to create embedding and search for similar documents
    let pineconeMatches: any[] = []
    let dbMatches: any[] = []
    
    try {
      pineconeMatches = await searchSimilarDocuments(
        message, // Pass the message string directly
        organization.id,
        undefined, // no specific dataset
        undefined // no tags
      )
    } catch (error) {
      console.log('Pinecone search failed, using database fallback:', error)
    }

    // Get additional context from database if needed
    try {
      if (pineconeMatches.length < 3) {
        const chunks = await prisma.documentChunk.findMany({
          where: {
            document: {
              organizationId: organization.id
            }
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            document: {
              select: { title: true }
            }
          }
        })
        dbMatches = chunks
      }
    } catch (error) {
      console.error('Database search failed:', error)
      // Continue without database matches if connection fails
      dbMatches = []
    }

    // Combine all matches
    const allMatches = [...pineconeMatches, ...dbMatches]
    
    // Create context for the AI
    const context = allMatches.map(match => ({
      content: match.content || match.text || '',
      title: match.document?.title || 'Document',
      chunkIndex: match.chunkIndex || 0
    }))

    // Generate response with proper error handling
    let response: string
    try {
      // Convert context array to string format
      const contextString = context.map(ctx => `${ctx.title}: ${ctx.content}`).join('\n\n')
      
      response = await generateResponse(message, contextString, [])
    } catch (error) {
      console.log('Response generation failed, using fallback:', error)
      // Fallback response when AI generation fails
      response = `Hello! I'm your AI assistant. I received your message: "${message}". 

I'm currently running in fallback mode due to some configuration issues. For full functionality, please ensure your OpenAI API key is properly configured.

I can still help you with basic questions and provide general assistance!`
    }

    return NextResponse.json({
      response: response,
      usedMatches: allMatches.length,
      debug: {
        orgId: organization.id,
        pineconeMatches: pineconeMatches.length,
        dbMatches: dbMatches.length,
        totalMatches: allMatches.length
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Widget chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}
