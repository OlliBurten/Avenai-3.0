/**
 * Database Optimization Utilities
 * Centralized query optimization and caching
 */

import { prisma } from './prisma'
import LRUCache from '@alloc/quick-lru'

// Query result cache with 5-minute TTL
const queryCache = new LRUCache<string, { data: any; timestamp: number }>({
  maxSize: 1000,
  maxAge: 5 * 60 * 1000 // 5 minutes
})

interface CacheOptions {
  ttl?: number
  key: string
}

/**
 * Cached database query wrapper
 */
export async function cachedQuery<T>(
  queryFn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { key, ttl = 5 * 60 * 1000 } = options
  
  // Check cache first
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  
  // Execute query and cache result
  const result = await queryFn()
  queryCache.set(key, { data: result, timestamp: Date.now() })
  
  return result
}

/**
 * Optimized user lookup with organization data
 */
export async function getUserWithOrganization(email: string, isActive: boolean = true) {
  return cachedQuery(
    () => prisma.user.findFirst({
      where: { email, isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        passwordHash: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionTier: true,
            subscriptionStatus: true
          }
        }
      }
    }),
    { key: `user:${email}:${isActive}` }
  )
}

/**
 * Optimized document search with pagination
 */
export async function searchDocuments(
  organizationId: string,
  options: {
    datasetId?: string
    query?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}
) {
  const { datasetId, query, page = 1, pageSize = 20, status } = options
  
  const where: any = {
    organizationId,
    ...(datasetId ? { datasetId } : {}),
    ...(status ? { status } : {}),
    ...(query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } }
      ]
    } : {})
  }
  
  const cacheKey = `documents:${organizationId}:${JSON.stringify(options)}`
  
  return cachedQuery(
    async () => {
      const [items, total] = await Promise.all([
        prisma.document.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            contentType: true,
            fileSize: true,
            tags: true,
            datasetId: true,
            _count: {
              select: { documentChunks: true }
            }
          }
        }),
        prisma.document.count({ where })
      ])
      
      return { items, total, page, pageSize }
    },
    { key: cacheKey, ttl: 2 * 60 * 1000 } // 2 minutes for document lists
  )
}

/**
 * Optimized analytics aggregation
 */
export async function getAnalyticsData(organizationId: string) {
  return cachedQuery(
    async () => {
      const [
        totalDocuments,
        totalDatasets,
        totalUsers,
        totalChatSessions,
        totalApiKeys,
        recentDocuments,
        recentChatSessions
      ] = await Promise.all([
        prisma.document.count({ where: { organizationId } }),
        prisma.dataset.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId, isActive: true } }),
        prisma.chatSession.count({ where: { organizationId } }),
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { apiKeyHash: true }
        }).then(org => org?.apiKeyHash ? 1 : 0),
        prisma.document.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        }),
        prisma.chatSession.findMany({
          where: { organizationId },
          orderBy: { lastActivityAt: 'desc' },
          take: 5,
          select: {
            id: true,
            sessionId: true,
            userIdentifier: true,
            lastActivityAt: true
          }
        })
      ])
      
      return {
        overview: {
          totalDocuments,
          totalDatasets,
          totalUsers,
          totalChatSessions,
          totalApiKeys
        },
        recent: {
          documents: recentDocuments,
          chatSessions: recentChatSessions
        }
      }
    },
    { key: `analytics:${organizationId}`, ttl: 1 * 60 * 1000 } // 1 minute
  )
}

/**
 * Optimized chat session management
 */
export async function getOrCreateChatSession(
  organizationId: string,
  userEmail: string
) {
  const cacheKey = `chat-session:${organizationId}:${userEmail}`
  
  return cachedQuery(
    async () => {
      // Find existing session within last 24 hours
      let session = await prisma.chatSession.findFirst({
        where: {
          organizationId,
          userIdentifier: userEmail,
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { startedAt: 'desc' }
      })
      
      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            organizationId,
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userIdentifier: userEmail,
            startedAt: new Date(),
            lastActivityAt: new Date()
          }
        })
      } else {
        // Update last activity
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { lastActivityAt: new Date() }
        })
      }
      
      return session
    },
    { key: cacheKey, ttl: 30 * 1000 } // 30 seconds for active sessions
  )
}

/**
 * Clear cache for specific organization
 */
export function clearOrganizationCache(organizationId: string) {
  const keysToDelete: string[] = []
  
  for (const key of queryCache.keys()) {
    if (key.includes(organizationId)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => queryCache.delete(key))
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  queryCache.clear()
}
