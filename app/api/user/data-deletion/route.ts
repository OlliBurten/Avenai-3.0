import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createResponse, createErrorResponse } from '@/lib/api-utils'
import { dataExportRateLimit } from '@/lib/rate-limit'
import { AuditLogger, AuditEventType } from '@/lib/audit-logger'

/**
 * GDPR Data Deletion API
 * Permanently deletes all user data (Right to be Forgotten)
 */
export const DELETE = dataExportRateLimit(async (request: NextRequest) => {
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
      const confirm = searchParams.get('confirm')

      // Require explicit confirmation
      if (confirm !== 'true') {
        return createErrorResponse({
          code: 'BAD_REQUEST',
          message: 'Deletion requires confirmation. Add ?confirm=true to proceed.',
          statusCode: 400
        })
      }

      // Start a transaction to ensure data consistency
      let organizationUsers = 0
      await prisma.$transaction(async (tx) => {
        // Delete user's chat messages
        await tx.chatMessage.deleteMany({
          where: {
            organizationId: organizationId,
            session: {
              userIdentifier: (user as any).id
            }
          }
        })

        // Delete user's chat sessions
        await tx.chatSession.deleteMany({
          where: {
            organizationId: organizationId,
            userIdentifier: (user as any).id
          }
        })

        // Delete user's document chunks
        await tx.documentChunk.deleteMany({
          where: {
            organizationId: organizationId,
            document: {
              userId: (user as any).id
            }
          }
        })

        // Delete user's documents
        await tx.document.deleteMany({
          where: {
            organizationId: organizationId,
            userId: (user as any).id
          }
        })

        // Delete document shares where user is the sharer
        await tx.documentShare.deleteMany({
          where: {
            sharedBy: (user as any).id
          }
        })

        // Delete document shares where user is the recipient
        await tx.documentShare.deleteMany({
          where: {
            userId: (user as any).id
          }
        })

        // Delete collaboration sessions
        await tx.collaborationSession.deleteMany({
          where: {
            userId: (user as any).id
          }
        })

        // Delete analytics events
        await tx.analyticsEvent.deleteMany({
          where: {
            organizationId: organizationId
          }
        })

        // Delete datasets (if user is the only member)
        organizationUsers = await tx.user.count({
          where: {
            organizationId: organizationId
          }
        })

        if (organizationUsers === 1) {
          // User is the only member, delete organization data
          await tx.dataset.deleteMany({
            where: {
              organizationId: organizationId
            }
          })

          // Delete organization
          await tx.organization.delete({
            where: {
              id: organizationId
            }
          })
        }

        // Finally, delete the user
        await tx.user.delete({
          where: {
            id: (user as any).id
          }
        })
      })

      // Log the deletion for audit purposes
      console.log(`User data deleted: ${(user as any).id} (${user.email}) at ${new Date().toISOString()}`)

      // Log data deletion
      await AuditLogger.logDataEvent(
        AuditEventType.DATA_DELETION,
        organizationId,
        (user as any).id,
        request,
        { 
          email: user.email,
          organizationDeleted: organizationUsers === 1,
          deletedAt: new Date().toISOString()
        }
      )

      return createResponse({
        success: true,
        message: 'All user data has been permanently deleted',
        deletedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Data deletion error:', error)
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user data',
        statusCode: 500
      })
    }
  })

/**
 * GDPR Data Anonymization API
 * Anonymizes user data instead of deleting (alternative to deletion)
 */
export const POST = dataExportRateLimit(async (request: NextRequest) => {
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
      const confirm = searchParams.get('confirm')

      if (confirm !== 'true') {
        return createErrorResponse({
          code: 'BAD_REQUEST',
          message: 'Anonymization requires confirmation. Add ?confirm=true to proceed.',
          statusCode: 400
        })
      }

      // Anonymize user data
      await prisma.$transaction(async (tx) => {
        // Anonymize user profile
        await tx.user.update({
          where: { id: (user as any).id },
          data: {
            email: `deleted-${(user as any).id}@example.com`,
            firstName: 'Deleted',
            lastName: 'User',
            avatarUrl: null,
            passwordHash: null,
            isActive: false
          }
        })

        // Anonymize chat messages (keep for analytics but remove personal content)
        await tx.chatMessage.updateMany({
          where: {
            organizationId: organizationId,
            session: {
              userIdentifier: (user as any).id
            }
          },
          data: {
            content: '[Content anonymized]'
          }
        })

        // Anonymize document names
        await tx.document.updateMany({
          where: {
            organizationId: organizationId,
            userId: (user as any).id
          },
          data: {
            title: `Document-${(user as any).id}`
          }
        })
      })

      // Log data anonymization
      await AuditLogger.logDataEvent(
        AuditEventType.DATA_ANONYMIZATION,
        organizationId,
        (user as any).id,
        request,
        { 
          email: user.email,
          anonymizedAt: new Date().toISOString()
        }
      )

      return createResponse({
        success: true,
        message: 'User data has been anonymized',
        anonymizedAt: new Date().toISOString()
      })

    } catch (error) {
      console.error('Data anonymization error:', error)
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'Failed to anonymize user data',
        statusCode: 500
      })
    }
  })
