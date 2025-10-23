import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'
import { createOptimizedHandler } from '@/lib/api-optimizations'

// Optimized analytics handler with parallel queries and caching
async function handleGetAnalytics(req: NextRequest, session: any) {
  try {
    // Development bypass - if session.user.id is 'dev-user', use any organization
    if (process.env.NODE_ENV === 'development' && session.user.id === 'dev-user') {
      const anyOrg = await prisma.organization.findFirst({
        select: { id: true, name: true, subscriptionTier: true }
      })
      
      if (!anyOrg) {
        return createErrorResponse({
          code: 'NOT_FOUND',
          message: 'No organizations found in database',
          statusCode: 404
        })
      }
      
      const organizationId = anyOrg.id
      const organization = anyOrg
      
      console.log('✅ Development mode - using organization:', { orgId: organizationId.substring(0, 20), orgName: organization.name, tier: organization.subscriptionTier });
      
      // Continue with the rest of the function using the found organization
      const isProUser = organization.subscriptionTier !== 'FREE'
      const { searchParams } = new URL(req.url)
      const timeRange = searchParams.get('timeRange') || '30'
      const days = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Execute all count queries in parallel for better performance
      const [
        totalDocuments,
        documentsInRange,
        totalChatSessions,
        chatSessionsInRange,
        totalMessages,
        messagesInRange,
        totalApiKeys,
        totalUsers,
        totalDocumentChunks,
        documentChunksInRange,
        totalDocumentShares,
        documentSharesInRange,
        // Pilot metrics
        feedbackStats,
        confidenceDistribution,
        responseTimeStats,
        topQueriesRaw
      ] = await Promise.all([
        prisma.document.count({ where: { organizationId } }),
        prisma.document.count({ where: { organizationId, createdAt: { gte: startDate } } }),
        prisma.chatSession.count({ where: { organizationId } }),
        prisma.chatSession.count({ where: { organizationId, startedAt: { gte: startDate } } }),
        prisma.chatMessage.count({ where: { organizationId } }),
        prisma.chatMessage.count({ where: { organizationId, createdAt: { gte: startDate } } }),
        prisma.organization.count({ where: { id: organizationId, apiKeyHash: { not: null } } }),
        prisma.user.count({ where: { organizationId, isActive: true } }),
        prisma.documentChunk.count({ where: { organizationId } }),
        prisma.documentChunk.count({ where: { organizationId, createdAt: { gte: startDate } } }),
        prisma.documentShare.count({ 
          where: { 
            document: { organizationId }
          } 
        }),
        prisma.documentShare.count({ 
          where: { 
            document: { organizationId },
            createdAt: { gte: startDate }
          } 
        }),
        // Pilot metrics
        prisma.chatFeedback.count({ where: { organizationId, createdAt: { gte: startDate } } }).catch(() => 0),
        (prisma as any).copilotResponse.groupBy({
          by: ['confidenceLevel'],
          where: { organizationId, createdAt: { gte: startDate } },
          _count: { confidenceLevel: true }
        }).catch(() => []),
        (prisma as any).copilotResponse.aggregate({
          where: { organizationId, createdAt: { gte: startDate } },
          _avg: { latencyMs: true },
          _count: { latencyMs: true }
        }).catch(() => ({ _avg: { latencyMs: null }, _count: { latencyMs: 0 } })),
        (prisma as any).copilotResponse.findMany({
          where: { organizationId, createdAt: { gte: startDate } },
          select: { prompt: true },
          orderBy: { createdAt: 'desc' },
          take: 100
        }).catch(() => [])
      ])

      // Process pilot metrics
      const positiveFeedback = await prisma.chatFeedback.count({ 
        where: { organizationId, rating: 'POSITIVE', createdAt: { gte: startDate } } 
      }).catch(() => 0)
      const negativeFeedback = await prisma.chatFeedback.count({ 
        where: { organizationId, rating: 'NEGATIVE', createdAt: { gte: startDate } } 
      }).catch(() => 0)
      
      const totalFeedback = positiveFeedback + negativeFeedback
      const satisfactionRate = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : 0
      
      // Process confidence distribution
      const confidenceData = confidenceDistribution.map((item: any) => ({
        level: item.confidenceLevel,
        count: item._count.confidenceLevel,
        percentage: confidenceDistribution.length > 0 ? 
          Math.round((item._count.confidenceLevel / confidenceDistribution.reduce((sum: number, c: any) => sum + c._count.confidenceLevel, 0)) * 100) : 0
      }))
      
      // Process top queries
      const queryCounts: { [key: string]: number } = {}
      topQueriesRaw.forEach((item: any) => {
        const normalizedQuery = item.prompt.toLowerCase().trim().replace(/\s+/g, ' ')
        queryCounts[normalizedQuery] = (queryCounts[normalizedQuery] || 0) + 1
      })
      
      const topQueries = Object.entries(queryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }))

      const baseResponse = {
        overview: {
          totalDocuments,
          documentsInRange,
          totalChatSessions,
          chatSessionsInRange,
          totalMessages,
          messagesInRange,
          totalApiKeys,
          totalUsers,
          totalDocumentChunks,
          documentChunksInRange,
          totalDocumentShares,
          documentSharesInRange,
          // Pilot metrics
          satisfactionRate,
          totalFeedback,
          positiveFeedback,
          negativeFeedback,
          avgResponseTime: responseTimeStats._avg.latencyMs || 0
        },
        confidenceDistribution: confidenceData,
        topQueries,
        requiresUpgrade: !isProUser
      }

      return createResponse(baseResponse)
    }

    // Get organization via membership (same pattern as chat route)
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: {
        role: true,
        org: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true
          }
        }
      }
    })

    if (!membership?.org) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found. Please complete onboarding.',
        statusCode: 404
      })
    }

    const organizationId = membership.org.id
    const organization = membership.org
    
    console.log('✅ Organization found for analytics:', { orgId: organizationId.substring(0, 20), orgName: organization.name, tier: organization.subscriptionTier });

    // Provide basic metrics for Free users, advanced analytics for Pro users
    const isProUser = organization.subscriptionTier !== 'FREE'

    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || '30' // days

    const days = parseInt(timeRange)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Execute all count queries in parallel for better performance
    const [
      totalDocuments,
      documentsInRange,
      documentStatusBreakdown,
      totalChunks,
      chunksInRange,
      totalChatSessions,
      chatSessionsInRange,
      totalMessages,
      messagesInRange,
      totalShares,
      sharesInRange,
      totalUsers,
      hasApiKey,
      recentDocuments,
      recentChatSessions,
      totalSize,
      // Pilot-critical metrics
      feedbackStats,
      confidenceDistribution,
      responseTimeStats,
      topQueriesRaw
    ] = await Promise.all([
      // Document counts
      prisma.document.count({ where: { organizationId } }),
      prisma.document.count({ 
        where: { 
          organizationId, 
          createdAt: { gte: startDate } 
        } 
      }),
      
      // Document status breakdown
      prisma.document.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true }
      }),
      
      // Chunk counts
      prisma.documentChunk.count({ where: { organizationId } }),
      prisma.documentChunk.count({ 
        where: { 
          organizationId, 
          createdAt: { gte: startDate } 
        } 
      }),
      
      // Chat session counts
      prisma.chatSession.count({ where: { organizationId } }),
      prisma.chatSession.count({ 
        where: { 
          organizationId, 
          startedAt: { gte: startDate } 
        } 
      }),
      
      // Message counts
      prisma.chatMessage.count({ where: { organizationId } }),
      prisma.chatMessage.count({ 
        where: { 
          organizationId, 
          createdAt: { gte: startDate } 
        } 
      }),
      
      // Share counts
      prisma.documentShare.count({
        where: { document: { organizationId } }
      }),
      prisma.documentShare.count({
        where: { 
          document: { organizationId },
          createdAt: { gte: startDate }
        }
      }),
      
      // User count
      prisma.user.count({
        where: { organizationId, isActive: true }
      }),
      
      // API key check
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { apiKeyHash: true }
      }),
      
      // Recent activity (limited to prevent performance issues)
      prisma.document.findMany({
        where: { organizationId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      prisma.chatSession.findMany({
        where: { organizationId },
        select: {
          id: true,
          sessionId: true,
          userIdentifier: true,
          lastActivityAt: true
        },
        orderBy: { lastActivityAt: 'desc' },
        take: 10
      }),
      
      // Total file size calculation
      prisma.document.aggregate({
        where: { organizationId },
        _sum: { fileSize: true }
      }),
      
      // Pilot-critical: Feedback satisfaction rate
      (async () => {
        const positive = await prisma.chatFeedback.count({
          where: { organizationId, rating: 'POSITIVE', createdAt: { gte: startDate } }
        })
        const negative = await prisma.chatFeedback.count({
          where: { organizationId, rating: 'NEGATIVE', createdAt: { gte: startDate } }
        })
        const total = positive + negative
        return {
          total,
          positive,
          negative,
          satisfactionRate: total > 0 ? ((positive / total) * 100).toFixed(1) : '0'
        }
      })(),
      
      // Pilot-critical: Confidence distribution
      prisma.copilotResponse.groupBy({
        by: ['confidenceLevel'],
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _count: { confidenceLevel: true }
      }).catch(() => []),
      
      // Pilot-critical: Response time stats  
      prisma.copilotResponse.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _avg: { latencyMs: true },
        _count: { latencyMs: true }
      }).catch(() => ({ _avg: { latencyMs: 0 }, _count: { latencyMs: 0 } })),
      
      // Pilot-critical: Top queries
      prisma.copilotResponse.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        select: {
          prompt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Get last 100, then aggregate
      }).catch(() => [])
    ])

    const totalApiKeys = hasApiKey?.apiKeyHash ? 1 : 0
    const totalSizeBytes = Number(totalSize._sum.fileSize || 0)
    
    // Process top queries (normalize and count)
    const queryCount = new Map<string, number>()
    topQueriesRaw.forEach(r => {
      const normalized = r.prompt.toLowerCase().trim().replace(/\s+/g, ' ')
      queryCount.set(normalized, (queryCount.get(normalized) || 0) + 1)
    })
    const topQueries = Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }))

    // Calculate growth rates efficiently
    const documentGrowthRate = documentsInRange > 0 ? 
      ((documentsInRange / Math.max(totalDocuments - documentsInRange, 1)) * 100).toFixed(1) : '0'
    
    const chunkGrowthRate = chunksInRange > 0 ? 
      ((chunksInRange / Math.max(totalChunks - chunksInRange, 1)) * 100).toFixed(1) : '0'
    
    const sessionGrowthRate = chatSessionsInRange > 0 ? 
      ((chatSessionsInRange / Math.max(totalChatSessions - chatSessionsInRange, 1)) * 100).toFixed(1) : '0'

    // Optimized daily activity - use raw SQL for better performance
    const dailyActivityQuery = await prisma.$queryRaw`
      SELECT 
        DATE(\"createdAt\") as date,
        COUNT(CASE WHEN table_name = 'documents' THEN 1 END) as documents,
        COUNT(CASE WHEN table_name = 'chat_sessions' THEN 1 END) as sessions,
        COUNT(CASE WHEN table_name = 'chat_messages' THEN 1 END) as messages
      FROM (
        SELECT \"createdAt\", 'documents' as table_name FROM \"documents\" WHERE \"organizationId\" = ${organizationId} AND \"createdAt\" >= ${startDate}
        UNION ALL
        SELECT \"startedAt\" as \"createdAt\", 'chat_sessions' as table_name FROM \"chat_sessions\" WHERE \"organizationId\" = ${organizationId} AND \"startedAt\" >= ${startDate}
        UNION ALL
        SELECT \"createdAt\", 'chat_messages' as table_name FROM \"chat_messages\" WHERE \"organizationId\" = ${organizationId} AND \"createdAt\" >= ${startDate}
      ) as combined
      GROUP BY DATE(\"createdAt\")
      ORDER BY date DESC
      LIMIT ${days}
    `

    // Format daily activity data
    const dailyActivity = Array.isArray(dailyActivityQuery) ? 
      dailyActivityQuery.map((row: any) => ({
        date: row.date.toISOString().split('T')[0],
        documents: Number(row.documents) || 0,
        sessions: Number(row.sessions) || 0,
        messages: Number(row.messages) || 0
      })) : []

    // Base response with essential metrics for all users (including pilot metrics)
    const baseResponse = {
      overview: {
        totalDocuments,
        totalChatSessions,
        totalMessages,
        totalApiKeys,
        totalSize: totalSizeBytes,
        // Pilot-critical metrics (show to all users for pilot testing)
        satisfactionRate: feedbackStats.satisfactionRate,
        totalFeedback: feedbackStats.total,
        positiveFeedback: feedbackStats.positive,
        negativeFeedback: feedbackStats.negative,
        avgResponseTime: responseTimeStats._avg.latencyMs ? Math.round(responseTimeStats._avg.latencyMs) : 0
      },
      // Pilot-critical distributions
      confidenceDistribution: confidenceDistribution.map(item => ({
        level: item.confidenceLevel,
        count: item._count.confidenceLevel,
        percentage: responseTimeStats._count.latencyMs > 0 
          ? ((item._count.confidenceLevel / responseTimeStats._count.latencyMs) * 100).toFixed(1)
          : '0'
      })),
      topQueries,
      subscriptionTier: organization.subscriptionTier,
      isProUser
    }

    // Add Pro-only features if user has Pro subscription
    if (isProUser) {
      return createResponse({
        ...baseResponse,
        overview: {
          ...baseResponse.overview,
          documentsInRange,
          documentGrowthRate: `${documentGrowthRate}%`,
          totalChunks,
          chunksInRange,
          chunkGrowthRate: `${chunkGrowthRate}%`,
          chatSessionsInRange,
          sessionGrowthRate: `${sessionGrowthRate}%`,
          messagesInRange,
          totalShares,
          sharesInRange,
          totalUsers
        },
        documentStatusBreakdown: documentStatusBreakdown.map(item => ({
          status: item.status,
          count: item._count.status
        })),
        recentActivity: {
          documents: recentDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            status: doc.status,
            createdAt: doc.createdAt,
            user: doc.user ? `${doc.user.firstName} ${doc.user.lastName}` : 'Unknown'
          })),
          chatSessions: recentChatSessions.map(session => ({
            id: session.id,
            sessionId: session.sessionId,
            userIdentifier: session.userIdentifier,
            lastActivityAt: session.lastActivityAt
          }))
        },
        dailyActivity,
        timeRange: days
      }, 'Analytics data retrieved successfully')
    } else {
      // Free user response with basic metrics only
      return createResponse({
        ...baseResponse,
        requiresUpgrade: true,
        upgradeMessage: 'Upgrade to Pro for detailed analytics, growth rates, and activity insights'
      }, 'Basic analytics data retrieved successfully')
    }

  } catch (error) {
    console.error('Analytics error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: `Failed to fetch analytics data: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetAnalytics)
