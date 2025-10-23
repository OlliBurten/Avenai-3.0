import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { searchSimilarDocuments } from '@/lib/pgvector'

export async function POST(req: NextRequest) {
  try {
    const { message, orgId, sessionId } = await req.json()

    if (!message || !orgId) {
      return NextResponse.json({ 
        error: 'Message and organization ID required' 
      }, { status: 400 })
    }

    // Verify organization exists and is Enterprise
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { 
        subscriptionTier: true,
        subscriptionStatus: true,
        name: true
      }
    })

    if (!organization) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 404 })
    }

    // Check if organization has Pro subscription
    if (organization.subscriptionTier !== 'PRO' && organization.subscriptionTier !== 'FOUNDER') {
      return NextResponse.json({ 
        error: 'White-label widget requires Pro subscription',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    // Check subscription status
    if (organization.subscriptionStatus !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Organization subscription is not active',
        code: 'SUBSCRIPTION_INACTIVE'
      }, { status: 403 })
    }

    // Get or create chat session
    let chatSession = await prisma.chatSession.findFirst({
      where: {
        organizationId: orgId,
        sessionId: sessionId
      }
    })

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          organizationId: orgId,
          sessionId: sessionId
        }
      })
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        organizationId: orgId,
        role: 'USER',
        content: message
      }
    })

    // Get relevant context from documents
    const pineconeMatches = await searchSimilarDocuments(message, orgId)
    
    // Build context from search results
    const context = pineconeMatches
      .map((match: any) => match.content || '')
      .join('\n\n')
      .slice(0, 4000) // Limit context length

    // Generate AI response
    const systemPrompt = `You are an AI assistant for ${organization.name}. 
    Answer questions based on the provided context. If the context doesn't contain relevant information, 
    politely say you don't have enough information to answer the question.
    
    Context:
    ${context}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Save AI response
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        organizationId: orgId,
        role: 'ASSISTANT',
        content: response
      }
    })

    return NextResponse.json({
      success: true,
      response: response,
      organization: organization.name
    })

  } catch (error) {
    console.error('White-label chat error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
