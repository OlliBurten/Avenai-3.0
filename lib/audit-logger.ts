import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  SIGNUP = 'SIGNUP',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Document events
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE = 'DOCUMENT_DELETE',
  DOCUMENT_SHARE = 'DOCUMENT_SHARE',
  DOCUMENT_UNSHARE = 'DOCUMENT_UNSHARE',
  
  // Chat events
  CHAT_SESSION_START = 'CHAT_SESSION_START',
  CHAT_SESSION_END = 'CHAT_SESSION_END',
  CHAT_MESSAGE_SENT = 'CHAT_MESSAGE_SENT',
  
  // Data management events
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  DATA_ANONYMIZATION = 'DATA_ANONYMIZATION',
  
  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // System events
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  SUBSCRIPTION_CHANGED = 'SUBSCRIPTION_CHANGED'
}

export interface AuditLogEntry {
  id?: string
  organizationId: string
  userId?: string
  eventType: AuditEventType
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId,
          eventType: entry.eventType,
          description: entry.description,
          metadata: entry.metadata || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: entry.timestamp || new Date()
        }
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging should never break the main flow
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILED | AuditEventType.LOGOUT | AuditEventType.SIGNUP,
    organizationId: string,
    userId: string | undefined,
    request: NextRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      eventType,
      description: this.getAuthDescription(eventType, metadata),
      metadata,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    })
  }

  /**
   * Log document events
   */
  static async logDocumentEvent(
    eventType: AuditEventType.DOCUMENT_UPLOAD | AuditEventType.DOCUMENT_DELETE | AuditEventType.DOCUMENT_SHARE | AuditEventType.DOCUMENT_UNSHARE,
    organizationId: string,
    userId: string,
    request: NextRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      eventType,
      description: this.getDocumentDescription(eventType, metadata),
      metadata,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    })
  }

  /**
   * Log chat events
   */
  static async logChatEvent(
    eventType: AuditEventType.CHAT_SESSION_START | AuditEventType.CHAT_SESSION_END | AuditEventType.CHAT_MESSAGE_SENT,
    organizationId: string,
    userId: string,
    request: NextRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      eventType,
      description: this.getChatDescription(eventType, metadata),
      metadata,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    })
  }

  /**
   * Log data management events
   */
  static async logDataEvent(
    eventType: AuditEventType.DATA_EXPORT | AuditEventType.DATA_DELETION | AuditEventType.DATA_ANONYMIZATION,
    organizationId: string,
    userId: string,
    request: NextRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      eventType,
      description: this.getDataDescription(eventType, metadata),
      metadata,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    })
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED | AuditEventType.SUSPICIOUS_ACTIVITY | AuditEventType.UNAUTHORIZED_ACCESS,
    organizationId: string,
    userId: string | undefined,
    request: NextRequest,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      organizationId,
      userId,
      eventType,
      description: this.getSecurityDescription(eventType, metadata),
      metadata,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined
    })
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
      return realIP
    }
    
    return 'unknown'
  }

  /**
   * Get authentication event descriptions
   */
  private static getAuthDescription(eventType: AuditEventType, metadata?: Record<string, any>): string {
    switch (eventType) {
      case AuditEventType.LOGIN_SUCCESS:
        return `User logged in successfully${metadata?.email ? ` (${metadata.email})` : ''}`
      case AuditEventType.LOGIN_FAILED:
        return `Failed login attempt${metadata?.email ? ` for ${metadata.email}` : ''}`
      case AuditEventType.LOGOUT:
        return 'User logged out'
      case AuditEventType.SIGNUP:
        return `New user registered${metadata?.email ? ` (${metadata.email})` : ''}`
      case AuditEventType.PASSWORD_RESET:
        return `Password reset requested${metadata?.email ? ` for ${metadata.email}` : ''}`
      default:
        return 'Authentication event'
    }
  }

  /**
   * Get document event descriptions
   */
  private static getDocumentDescription(eventType: AuditEventType, metadata?: Record<string, any>): string {
    switch (eventType) {
      case AuditEventType.DOCUMENT_UPLOAD:
        return `Document uploaded: ${metadata?.fileName || 'unknown'}`
      case AuditEventType.DOCUMENT_DELETE:
        return `Document deleted: ${metadata?.fileName || 'unknown'}`
      case AuditEventType.DOCUMENT_SHARE:
        return `Document shared: ${metadata?.fileName || 'unknown'}`
      case AuditEventType.DOCUMENT_UNSHARE:
        return `Document unshared: ${metadata?.fileName || 'unknown'}`
      default:
        return 'Document event'
    }
  }

  /**
   * Get chat event descriptions
   */
  private static getChatDescription(eventType: AuditEventType, metadata?: Record<string, any>): string {
    switch (eventType) {
      case AuditEventType.CHAT_SESSION_START:
        return 'Chat session started'
      case AuditEventType.CHAT_SESSION_END:
        return 'Chat session ended'
      case AuditEventType.CHAT_MESSAGE_SENT:
        return `Message sent${metadata?.messageLength ? ` (${metadata.messageLength} chars)` : ''}`
      default:
        return 'Chat event'
    }
  }

  /**
   * Get data event descriptions
   */
  private static getDataDescription(eventType: AuditEventType, metadata?: Record<string, any>): string {
    switch (eventType) {
      case AuditEventType.DATA_EXPORT:
        return `Data export requested${metadata?.format ? ` (${metadata.format})` : ''}`
      case AuditEventType.DATA_DELETION:
        return 'User data deletion requested'
      case AuditEventType.DATA_ANONYMIZATION:
        return 'User data anonymization requested'
      default:
        return 'Data management event'
    }
  }

  /**
   * Get security event descriptions
   */
  private static getSecurityDescription(eventType: AuditEventType, metadata?: Record<string, any>): string {
    switch (eventType) {
      case AuditEventType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded${metadata?.endpoint ? ` for ${metadata.endpoint}` : ''}`
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        return `Suspicious activity detected${metadata?.reason ? `: ${metadata.reason}` : ''}`
      case AuditEventType.UNAUTHORIZED_ACCESS:
        return `Unauthorized access attempt${metadata?.resource ? ` to ${metadata.resource}` : ''}`
      default:
        return 'Security event'
    }
  }

  /**
   * Get audit logs for an organization
   */
  static async getAuditLogs(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      eventType?: AuditEventType
      userId?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const {
      limit = 100,
      offset = 0,
      eventType,
      userId,
      startDate,
      endDate
    } = options

    const where: any = {
      organizationId
    }

    if (eventType) where.eventType = eventType
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(organizationId: string, days: number = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const stats = await prisma.auditLog.groupBy({
      by: ['eventType'],
      where: {
        organizationId,
        timestamp: {
          gte: startDate
        }
      },
      _count: {
        eventType: true
      }
    })

    return stats.map(stat => ({
      eventType: stat.eventType,
      count: stat._count.eventType
    }))
  }
}
