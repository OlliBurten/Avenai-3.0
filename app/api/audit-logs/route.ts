import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { AuditLogger, AuditEventType } from '@/lib/audit-logger'
import { createResponse, createErrorResponse } from '@/lib/api-utils'

/**
 * Get audit logs for the organization
 */
async function handleGetAuditLogs(request: NextRequest, session: any) {
    try {
      const { searchParams } = new URL(request.url)
      
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')
      const eventType = searchParams.get('eventType') as AuditEventType | undefined
      const userId = searchParams.get('userId') || undefined
      const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
      const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

      // Validate limit
      if (limit > 1000) {
        return createErrorResponse({
          code: 'BAD_REQUEST',
          message: 'Limit cannot exceed 1000',
          statusCode: 400
        })
      }

      const logs = await AuditLogger.getAuditLogs(session.user.organizationId, {
        limit,
        offset,
        eventType,
        userId,
        startDate,
        endDate
      })

      const stats = await AuditLogger.getAuditStats(session.user.organizationId, 30)

      return createResponse({
        logs,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit
        }
      })

    } catch (error) {
      console.error('Audit logs error:', error)
      return createErrorResponse({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit logs',
        statusCode: 500
      })
    }
}

export const GET = withAuth(handleGetAuditLogs)
