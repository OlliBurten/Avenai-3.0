import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createResponse, createErrorResponse } from '@/lib/api-utils'
import { dataExportRateLimit } from '@/lib/rate-limit'
import { AuditLogger, AuditEventType } from '@/lib/audit-logger'

/**
 * GDPR Data Export API
 * Exports all user data in a structured format
 */
export const GET = dataExportRateLimit(async (request: NextRequest) => {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user
    
    // Get organization from user membership
    const membership = await prisma.memberships.findFirst({
      where: { userId: (user as any).id },
      include: { org: true }
    })
    
    const organizationId = membership?.org?.id
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    try {
      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') || 'json'

      // Get all user data
      const userData = await prisma.user.findUnique({
        where: { id: (user as any).id },
        include: {
          organization: true,
          documents: {
            include: {
              documentChunks: true
            }
          },
          sharedDocuments: true,
          sharedWithMe: true,
          collaborationSessions: true
        }
      })

      if (!userData) {
        return createErrorResponse({
          code: 'NOT_FOUND',
          message: 'User not found',
          statusCode: 404
        })
      }

      // Get chat sessions and messages separately since they don't have direct user relationship
      const chatSessions = await prisma.chatSession.findMany({
        where: {
          organizationId: organizationId,
          userIdentifier: (user as any).id
        },
        include: {
          chatMessages: true
        }
      })

      // Structure the data for export
      const exportData = {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          avatarUrl: userData.avatarUrl,
          lastLoginAt: userData.lastLoginAt,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        },
        organization: {
          id: userData.organization?.id,
          name: userData.organization?.name,
          slug: userData.organization?.slug,
          domain: userData.organization?.domain,
          logoUrl: userData.organization?.logoUrl,
          subscriptionTier: userData.organization?.subscriptionTier,
          subscriptionStatus: userData.organization?.subscriptionStatus,
          createdAt: userData.organization?.createdAt,
          updatedAt: userData.organization?.updatedAt
        },
        documents: userData.documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          contentType: doc.contentType,
          fileSize: doc.fileSize,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          chunks: doc.documentChunks.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            metadata: chunk.metadata,
            createdAt: chunk.createdAt
          }))
        })),
        chatSessions: chatSessions.map(session => ({
          id: session.id,
          sessionId: session.sessionId,
          startedAt: session.startedAt,
          lastActivityAt: session.lastActivityAt,
          messages: session.chatMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt
          }))
        })),
        sharedDocuments: userData.sharedDocuments.map(share => ({
          id: share.id,
          permission: share.permission,
          createdAt: share.createdAt
        })),
        collaborationSessions: userData.collaborationSessions.map(collab => ({
          id: collab.id,
          sessionId: collab.sessionId,
          createdAt: collab.createdAt,
          updatedAt: collab.updatedAt
        })),
        exportDate: new Date().toISOString(),
        exportVersion: '1.0'
      }

      // Return data based on requested format
      if (format === 'json') {
        // Log data export
        await AuditLogger.logDataEvent(
          AuditEventType.DATA_EXPORT,
          organizationId,
          (user as any).id,
          request,
          { format: 'json', dataSize: JSON.stringify(exportData).length }
        )

        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="avenai-data-export-${(user as any).id}-${Date.now()}.json"`
          }
        })
      }

      // For CSV format (simplified)
      if (format === 'csv') {
        const csvData = [
          ['Data Type', 'ID', 'Name/Content', 'Created At'],
          ['User', userData.id, `${userData.firstName} ${userData.lastName}`, userData.createdAt],
          ['Organization', userData.organization?.id, userData.organization?.name, userData.organization?.createdAt],
          ...userData.documents.map(doc => ['Document', doc.id, doc.title, doc.createdAt]),
          ...chatSessions.map(session => ['Chat Session', session.id, `Session ${session.sessionId}`, session.startedAt])
        ]

        const csvContent = csvData.map(row => row.join(',')).join('\n')
        
        // Log data export
        await AuditLogger.logDataEvent(
          AuditEventType.DATA_EXPORT,
          organizationId,
          (user as any).id,
          request,
          { format: 'csv', dataSize: csvContent.length }
        )
        
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="avenai-data-export-${(user as any).id}-${Date.now()}.csv"`
          }
        })
      }

      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Unsupported format. Use json or csv.',
        statusCode: 400
      })

    } catch (error) {
      console.error('Data export error:', error)
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'Failed to export data',
        statusCode: 500
      })
    }
  })
