import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'
import { getSubscriptionLimits } from '@/lib/subscription-limits'

// Get usage statistics
async function handleGetUsage(req: NextRequest, session: any) {
  try {
    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('timeRange') || '30' // days
    const organizationId = session.user.organizationId

    const days = parseInt(timeRange)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get current subscription info
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    // Get usage statistics
    const [
      totalDocuments,
      documentsThisPeriod,
      totalChatSessions,
      chatSessionsThisPeriod,
      totalMessages,
      messagesThisPeriod,
      totalApiRequests,
      apiRequestsThisPeriod,
      totalStorageBytes,
      storageThisPeriod
    ] = await Promise.all([
      // Documents
      prisma.document.count({
        where: { organizationId }
      }),
      prisma.document.count({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        }
      }),
      
      // Chat Sessions
      prisma.chatSession.count({
        where: { organizationId }
      }),
      prisma.chatSession.count({
        where: {
          organizationId,
          startedAt: { gte: startDate }
        }
      }),
      
      // Messages
      prisma.chatMessage.count({
        where: { organizationId }
      }),
      prisma.chatMessage.count({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        }
      }),
      
      // API Requests (from analytics events)
      prisma.analyticsEvent.count({
        where: {
          organizationId,
          eventType: 'api_chat_request'
        }
      }),
      prisma.analyticsEvent.count({
        where: {
          organizationId,
          eventType: 'api_chat_request',
          createdAt: { gte: startDate }
        }
      }),
      
      // Storage (sum of file sizes)
      prisma.document.aggregate({
        where: { organizationId },
        _sum: { fileSize: true }
      }),
      prisma.document.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startDate }
        },
        _sum: { fileSize: true }
      })
    ])

    // Calculate limits based on subscription tier
    const limits = getSubscriptionLimits(organization.subscriptionTier)
    
    // Calculate usage percentages (handle unlimited limits)
    const usagePercentages = {
      documents: limits.documents === -1 ? 0 : Math.min((totalDocuments / limits.documents) * 100, 100),
      chatSessions: limits.chatSessions === -1 ? 0 : Math.min((totalChatSessions / limits.chatSessions) * 100, 100),
      messages: limits.messages === -1 ? 0 : Math.min((totalMessages / limits.messages) * 100, 100),
      apiRequests: limits.apiRequests === -1 ? 0 : Math.min((totalApiRequests / limits.apiRequests) * 100, 100),
      storage: limits.storage === -1 ? 0 : Math.min((Number(totalStorageBytes._sum.fileSize || BigInt(0)) / limits.storage) * 100, 100)
    }

    // Get daily usage for charts
    const dailyUsage = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const [documentsToday, sessionsToday, messagesToday, apiRequestsToday] = await Promise.all([
        prisma.document.count({
          where: {
            organizationId,
            createdAt: { gte: date, lt: nextDate }
          }
        }),
        prisma.chatSession.count({
          where: {
            organizationId,
            startedAt: { gte: date, lt: nextDate }
          }
        }),
        prisma.chatMessage.count({
          where: {
            organizationId,
            createdAt: { gte: date, lt: nextDate }
          }
        }),
        prisma.analyticsEvent.count({
          where: {
            organizationId,
            eventType: 'api_chat_request',
            createdAt: { gte: date, lt: nextDate }
          }
        })
      ])

      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        documents: documentsToday,
        sessions: sessionsToday,
        messages: messagesToday,
        apiRequests: apiRequestsToday
      })
    }

    return createResponse({
      subscription: {
        tier: organization.subscriptionTier,
        status: organization.subscriptionStatus,
        startDate: organization.createdAt.toISOString()
      },
      limits,
      usage: {
        documents: {
          total: totalDocuments,
          thisPeriod: documentsThisPeriod,
          percentage: usagePercentages.documents
        },
        chatSessions: {
          total: totalChatSessions,
          thisPeriod: chatSessionsThisPeriod,
          percentage: usagePercentages.chatSessions
        },
        messages: {
          total: totalMessages,
          thisPeriod: messagesThisPeriod,
          percentage: usagePercentages.messages
        },
        apiRequests: {
          total: totalApiRequests,
          thisPeriod: apiRequestsThisPeriod,
          percentage: usagePercentages.apiRequests
        },
        storage: {
          total: Number(totalStorageBytes._sum.fileSize || BigInt(0)),
          thisPeriod: Number(storageThisPeriod._sum.fileSize || BigInt(0)),
          percentage: usagePercentages.storage
        }
      },
      dailyUsage,
      timeRange: days
    }, 'Usage data retrieved successfully')

  } catch (error) {
    console.error('Usage tracking error:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch usage data',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetUsage)
