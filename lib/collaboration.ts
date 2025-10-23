import { prisma } from './prisma'

export interface TeamMember {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[]
  joinedAt: Date
  lastActiveAt: Date
}

export interface TeamShare {
  id: string
  documentId: string
  documentTitle: string
  sharedBy: string
  sharedWith: string[]
  permissions: 'view' | 'edit' | 'admin'
  expiresAt?: Date
  createdAt: Date
  accessCount: number
  lastAccessedAt?: Date
}

export interface CollaborationSession {
  id: string
  documentId: string
  participants: string[]
  sessionId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ShareRequest {
  documentId: string
  emails: string[]
  permissions: 'view' | 'edit' | 'admin'
  message?: string
  expiresAt?: Date
}

export interface CollaborationResult {
  success: boolean
  shareId?: string
  message: string
  errors?: string[]
}

export class CollaborationManager {
  /**
   * Share a document with team members
   */
  static async shareDocument(
    documentId: string,
    sharedBy: string,
    request: ShareRequest
  ): Promise<CollaborationResult> {
    try {
      // Verify document exists and user has permission
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          organizationId: sharedBy
        }
      })

      if (!document) {
        return {
          success: false,
          message: 'Document not found or access denied'
        }
      }

      // Create share record
      const share = await prisma.documentShare.create({
        data: {
          documentId,
          sharedBy,
          userId: request.emails[0], // For now, just use the first email
          permission: (request.permissions[0] || 'READ') as 'READ' | 'WRITE' | 'ADMIN'
        }
      })

      // TODO: Send email notifications to shared users
      // This would integrate with an email service like SendGrid, Resend, etc.

      return {
        success: true,
        shareId: share.id,
        message: `Document shared with ${request.emails.length} team members`
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to share document',
        errors: [error.message]
      }
    }
  }

  /**
   * Get shared documents for a user
   */
  static async getSharedDocuments(userId: string): Promise<TeamShare[]> {
    try {
      const shares = await prisma.documentShare.findMany({
        where: {
          OR: [
            { sharedBy: userId },
            { userId: userId }
          ]
        },
        include: {
          document: {
            select: {
              title: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return shares.map(share => ({
        id: share.id,
        documentId: share.documentId,
        documentTitle: share.document?.title || 'Unknown Document',
        sharedBy: share.sharedBy,
        sharedWith: [share.userId],
        permissions: share.permission as 'view' | 'edit' | 'admin',
        expiresAt: undefined, // Not implemented in current schema
        createdAt: share.createdAt,
        accessCount: 0, // Not implemented in current schema
        lastAccessedAt: undefined // Not implemented in current schema
      }))
    } catch (error: any) {
      console.error('Error fetching shared documents:', error)
      return []
    }
  }

  /**
   * Start a collaborative session
   */
  static async startCollaborationSession(
    documentId: string,
    userId: string,
    sessionType: 'chat' | 'review' | 'edit'
  ): Promise<CollaborationSession | null> {
    try {
      const session = await prisma.collaborationSession.create({
        data: {
          documentId,
          userId,
          sessionId: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participants: JSON.stringify([userId])
        }
      })

      return {
        id: session.id,
        documentId: session.documentId,
        participants: JSON.parse(session.participants as string),
        sessionId: session.sessionId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    } catch (error: any) {
      console.error('Error starting collaboration session:', error)
      return null
    }
  }

  /**
   * Join an existing collaboration session
   */
  static async joinCollaborationSession(
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const session = await prisma.collaborationSession.findUnique({
        where: { id: sessionId }
      })

      if (!session) {
        return false
      }

      await prisma.collaborationSession.update({
        where: { id: sessionId },
        data: {
          participants: JSON.stringify([...JSON.parse(session.participants as string), userId])
        }
      })

      return true
    } catch (error: any) {
      console.error('Error joining collaboration session:', error)
      return false
    }
  }

  /**
   * Get active collaboration sessions for a document
   */
  static async getActiveSessions(documentId: string): Promise<CollaborationSession[]> {
    try {
      const sessions = await prisma.collaborationSession.findMany({
        where: {
          documentId,
          isActive: true,
          updatedAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000) // Active within last 30 minutes
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      return sessions.map(session => ({
        id: session.id,
        documentId: session.documentId,
        participants: JSON.parse(session.participants as string),
        sessionId: session.sessionId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }))
    } catch (error: any) {
      console.error('Error fetching active sessions:', error)
      return []
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string, userId: string): Promise<void> {
    try {
      await prisma.collaborationSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date()
        }
      })
    } catch (error: any) {
      console.error('Error updating session activity:', error)
    }
  }

  /**
   * Get team members for an organization
   */
  static async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      return users.map(user => ({
        id: user.id,
        email: user.email || 'unknown@example.com',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        role: user.role as 'owner' | 'admin' | 'member' | 'viewer',
        permissions: this.getPermissionsForRole(user.role as string),
        joinedAt: user.createdAt,
        lastActiveAt: user.lastLoginAt || user.createdAt
      }))
    } catch (error: any) {
      console.error('Error fetching team members:', error)
      return []
    }
  }

  /**
   * Get permissions for a role
   */
  private static getPermissionsForRole(role: string): string[] {
    const permissions = {
      owner: ['read', 'write', 'delete', 'share', 'admin'],
      admin: ['read', 'write', 'share', 'admin'],
      member: ['read', 'write'],
      viewer: ['read']
    }

    return permissions[role as keyof typeof permissions] || ['read']
  }

  /**
   * Revoke document access
   */
  static async revokeAccess(shareId: string, userId: string): Promise<boolean> {
    try {
      const share = await prisma.documentShare.findFirst({
        where: {
          id: shareId,
          sharedBy: userId
        }
      })

      if (!share) {
        return false
      }

      await prisma.documentShare.delete({
        where: { id: shareId }
      })

      return true
    } catch (error: any) {
      console.error('Error revoking access:', error)
      return false
    }
  }

  /**
   * Get collaboration analytics
   */
  static async getCollaborationAnalytics(organizationId: string): Promise<{
    totalShares: number
    activeSessions: number
    teamMembers: number
    sharedDocuments: number
  }> {
    try {
      const [totalShares, activeSessions, teamMembers, sharedDocuments] = await Promise.all([
        prisma.documentShare.count({
          where: {
            document: {
              organizationId
            }
          }
        }),
        prisma.collaborationSession.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }),
        prisma.user.count({
          where: { organizationId }
        }),
        prisma.document.count({
          where: {
            organizationId,
            shares: {
              some: {}
            }
          }
        })
      ])

      return {
        totalShares,
        activeSessions,
        teamMembers,
        sharedDocuments
      }
    } catch (error: any) {
      console.error('Error fetching collaboration analytics:', error)
      return {
        totalShares: 0,
        activeSessions: 0,
        teamMembers: 0,
        sharedDocuments: 0
      }
    }
  }
}

// Helper functions for collaboration features
export async function detectCollaborationIntent(message: string): Promise<{
  isCollaborationRequest: boolean
  intent: 'share' | 'invite' | 'session' | 'analytics' | null
  context: any
}> {
  const lowerMessage = message.toLowerCase()

  // Share document intent
  if (lowerMessage.includes('share') && (lowerMessage.includes('document') || lowerMessage.includes('with'))) {
    return {
      isCollaborationRequest: true,
      intent: 'share',
      context: {
        action: 'share_document',
        requiresDocument: true,
        requiresEmails: true
      }
    }
  }

  // Invite team members intent
  if (lowerMessage.includes('invite') && (lowerMessage.includes('team') || lowerMessage.includes('member'))) {
    return {
      isCollaborationRequest: true,
      intent: 'invite',
      context: {
        action: 'invite_team_member',
        requiresEmail: true
      }
    }
  }

  // Start collaboration session intent
  if (lowerMessage.includes('collaborate') || lowerMessage.includes('session') || lowerMessage.includes('together')) {
    return {
      isCollaborationRequest: true,
      intent: 'session',
      context: {
        action: 'start_collaboration',
        requiresDocument: true
      }
    }
  }

  // Analytics intent
  if (lowerMessage.includes('analytics') || lowerMessage.includes('stats') || lowerMessage.includes('team activity')) {
    return {
      isCollaborationRequest: true,
      intent: 'analytics',
      context: {
        action: 'get_collaboration_analytics'
      }
    }
  }

  return {
    isCollaborationRequest: false,
    intent: null,
    context: null
  }
}

export function formatCollaborationResult(result: CollaborationResult): string {
  if (result.success) {
    return `✅ **Collaboration Success**\n\n${result.message}`
  } else {
    return `❌ **Collaboration Error**\n\n${result.message}${result.errors ? '\n\n**Errors:**\n' + result.errors.join('\n') : ''}`
  }
}

export function formatTeamMembers(members: TeamMember[]): string {
  if (members.length === 0) {
    return 'No team members found.'
  }

  const memberList = members.map(member => 
    `- **${member.name}** (${member.email})\n  Role: ${member.role}\n  Permissions: ${member.permissions.join(', ')}\n  Last Active: ${member.lastActiveAt.toLocaleDateString()}`
  ).join('\n\n')

  return `## 👥 Team Members (${members.length})\n\n${memberList}`
}

export function formatSharedDocuments(shares: TeamShare[]): string {
  if (shares.length === 0) {
    return 'No shared documents found.'
  }

  const shareList = shares.map(share => 
    `- **${share.documentTitle}**\n  Shared by: ${share.sharedBy}\n  Permissions: ${share.permissions}\n  Shared with: ${share.sharedWith.join(', ')}\n  Created: ${share.createdAt.toLocaleDateString()}`
  ).join('\n\n')

  return `## 📄 Shared Documents (${shares.length})\n\n${shareList}`
}

export function formatCollaborationAnalytics(analytics: {
  totalShares: number
  activeSessions: number
  teamMembers: number
  sharedDocuments: number
}): string {
  return `## 📊 Collaboration Analytics

- **Team Members**: ${analytics.teamMembers}
- **Shared Documents**: ${analytics.sharedDocuments}
- **Total Shares**: ${analytics.totalShares}
- **Active Sessions**: ${analytics.activeSessions}

*Data from the last 24 hours*`
}
