import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

interface SaveMessageRequest {
  sessionId: string
  role: 'USER' | 'ASSISTANT'
  content: string
  metadata?: any
}

async function handleSaveMessage(req: NextRequest, session: any) {
  try {
    const { sessionId, role, content, metadata = {} }: SaveMessageRequest = await req.json()
    
    if (!sessionId || !role || !content) {
      return createErrorResponse({
        code: 'VALIDATION_ERROR',
        message: 'sessionId, role, and content are required',
        statusCode: 400
      })
    }

    const organizationId = session.user.organizationId as string

    // Verify the session belongs to this organization
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        sessionId,
        organizationId
      }
    })

    if (!chatSession) {
      return createErrorResponse({
        code: 'SESSION_NOT_FOUND',
        message: 'Chat session not found',
        statusCode: 404
      })
    }

    // Save the message to the database
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        organizationId,
        role,
        content,
        metadata
      }
    })

    return createResponse({
      messageId: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt
    }, 'Message saved successfully')

  } catch (error) {
    console.error('Save message error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to save message',
      statusCode: 500
    })
  }
}

export const POST = withAuth(handleSaveMessage)
