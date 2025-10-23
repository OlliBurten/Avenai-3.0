// lib/prisma.ts
// Centralized Prisma client with proper connection management

import { PrismaClient as PrismaClientType } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClientType | undefined
}

// Create Prisma client with proper configuration
const createPrismaClient = () => {
  // Handle missing DATABASE_URL during build
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found, creating mock Prisma client for build')
    return new PrismaClientType({
      log: ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: 'postgresql://mock:mock@localhost:5432/mock',
        },
      },
    })
  }

  return new PrismaClientType({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Use global variable to prevent multiple instances in development
export const prisma = globalThis.__prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Graceful shutdown - removed process.on calls as they cause issues with Edge runtime
// Next.js will handle graceful shutdown automatically

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Transaction utilities
export async function withTransaction<T>(
  callback: (tx: Omit<PrismaClientType, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback)
}

// Batch operations utilities
export async function batchCreate<T>(
  model: any,
  data: T[],
  batchSize: number = 1000
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    await model.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }
}

// Soft delete utilities
export async function softDeleteDocument(documentId: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { 
      status: 'FAILED',
      metadata: {
        softDeleted: true,
        deletedAt: new Date().toISOString(),
      }
    },
  })
}

export async function softDeleteDataset(datasetId: string): Promise<void> {
  await prisma.dataset.update({
    where: { id: datasetId },
    data: { 
      isActive: false,
      updatedAt: new Date(),
    },
  })
}

// Cleanup utilities
export async function cleanupSoftDeletedDatasets(): Promise<number> {
  const result = await prisma.dataset.deleteMany({
    where: {
      isActive: false,
      updatedAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    },
  })
  
  return result.count
}

export async function cleanupFailedDocuments(): Promise<number> {
  const result = await prisma.document.deleteMany({
    where: {
      status: 'FAILED',
      metadata: {
        path: ['softDeleted'],
        equals: true,
      },
      createdAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    },
  })
  
  return result.count
}

// Analytics utilities
export async function getOrganizationStats(organizationId: string) {
  const [
    documentCount,
    datasetCount,
    chunkCount,
    chatSessionCount,
    userCount,
  ] = await Promise.all([
    prisma.document.count({
      where: { organizationId, status: 'COMPLETED' },
    }),
    prisma.dataset.count({
      where: { organizationId, isActive: true },
    }),
    prisma.documentChunk.count({
      where: { organizationId },
    }),
    prisma.chatSession.count({
      where: { organizationId },
    }),
    prisma.user.count({
      where: { organizationId, isActive: true },
    }),
  ])

  return {
    documents: documentCount,
    datasets: datasetCount,
    chunks: chunkCount,
    chatSessions: chatSessionCount,
    users: userCount,
  }
}

// Search utilities
export async function searchDocuments(
  organizationId: string,
  query: string,
  datasetId?: string,
  limit: number = 20
) {
  const where = {
    organizationId,
    ...(datasetId && { datasetId }),
    status: 'COMPLETED' as const,
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { tags: { has: query } },
    ],
  }

  return await prisma.document.findMany({
    where,
    include: {
      dataset: {
        select: { name: true, type: true },
      },
      user: {
        select: { firstName: true, lastName: true },
      },
      _count: {
        select: { documentChunks: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function searchDocumentChunks(
  organizationId: string,
  query: string,
  datasetId?: string,
  limit: number = 50
) {
  const where = {
    organizationId,
    ...(datasetId && { document: { datasetId } }),
    content: { contains: query, mode: 'insensitive' as const },
  }

  return await prisma.documentChunk.findMany({
    where,
    include: {
      document: {
        select: { 
          id: true, 
          title: true, 
          dataset: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Organization-scoped where clause helper
export function createOrgWhere(organizationId: string, additionalWhere: any = {}) {
  return {
    organizationId,
    ...additionalWhere,
  }
}

// Export types for better TypeScript support
export type PrismaClient = typeof prisma
export type DocumentWithRelations = Awaited<ReturnType<typeof prisma.document.findFirst>>
export type DatasetWithRelations = Awaited<ReturnType<typeof prisma.dataset.findFirst>>
export type UserWithRelations = Awaited<ReturnType<typeof prisma.user.findFirst>>
export type OrganizationWithRelations = Awaited<ReturnType<typeof prisma.organization.findFirst>>