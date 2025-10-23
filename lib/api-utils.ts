// lib/api-utils.ts
// Centralized API utilities for consistent error handling and responses

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ZodError } from 'zod'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  debug?: any
}

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

// Standard error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
} as const

// Standard HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Create a standardized API response
 */
export function createResponse<T>(
  data: T,
  message?: string,
  debug?: any,
  status?: number
): NextResponse<ApiResponse<T>> {
  const response = NextResponse.json({
    success: true,
    data,
    message: message || 'Success',
    debug,
  })
  
  if (status) {
    return new NextResponse(response.body, { ...response, status })
  }
  
  return response
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: ApiError,
  debug?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      debug,
    },
    { status: error.statusCode }
  )
}

/**
 * Handle common API errors
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error)

  // Zod validation errors
  if (error instanceof ZodError) {
    return createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.errors,
      statusCode: HTTP_STATUS.BAD_REQUEST,
    })
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002':
        return createErrorResponse({
          code: ERROR_CODES.CONFLICT,
          message: 'Resource already exists',
          statusCode: HTTP_STATUS.CONFLICT,
        })
      case 'P2025':
        return createErrorResponse({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Resource not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
        })
      case 'P2003':
        return createErrorResponse({
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Invalid reference',
          statusCode: HTTP_STATUS.BAD_REQUEST,
        })
    }
  }

  // Generic error
  return createErrorResponse({
    code: ERROR_CODES.INTERNAL_ERROR,
    message: 'Internal server error',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  })
}

/**
 * API route wrapper with authentication and error handling
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, session: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Development bypass - if no session, try to find any organization
      if (process.env.NODE_ENV === 'development') {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
          // Try to find any organization for development
          const anyOrg = await prisma.organization.findFirst({
            select: { id: true, name: true, subscriptionTier: true }
          })
          
          if (anyOrg) {
            // Create a mock session for development
            const mockSession = {
              user: { id: 'dev-user', email: 'dev@example.com' },
              organizationId: anyOrg.id
            }
            return await handler(req, mockSession)
          }
        }
      }

      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return await handler(req, session)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * API route wrapper with optional authentication
 */
export function withOptionalAuth<T = any>(
  handler: (req: NextRequest, session: any | null) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await getSession()
      return await handler(req, session)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validate organization access
 */
export function validateOrganizationAccess(
  session: any,
  organizationId: string
): boolean {
  return session.user?.organizationId === organizationId
}

/**
 * Create organization-scoped where clause for Prisma
 */
export function createOrgWhere(organizationId: string, additionalWhere: any = {}) {
  return {
    organizationId,
    ...additionalWhere,
  }
}

/**
 * Pagination utilities
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
  message?: string
) {
  const { page = 1, limit = 20 } = pagination
  const totalPages = Math.ceil(total / limit)

  return createResponse({
    items: data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }, message)
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
  private requests = new Map<string, number[]>()
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    const validRequests = userRequests.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

/**
 * Request validation utilities
 */
export function validateRequestMethod(
  req: NextRequest,
  allowedMethods: string[]
): boolean {
  return allowedMethods.includes(req.method)
}

export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

/**
 * Logging utilities
 */
export function logApiRequest(
  req: NextRequest,
  session: any | null,
  additionalData?: any
) {
  const logData = {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: getClientIP(req),
    userId: session?.user.id,
    organizationId: session?.user.organizationId,
    timestamp: new Date().toISOString(),
    ...additionalData,
  }

  console.log('API Request:', JSON.stringify(logData, null, 2))
}

export function logApiResponse(
  req: NextRequest,
  response: NextResponse,
  session: any | null,
  additionalData?: any
) {
  const logData = {
    method: req.method,
    url: req.url,
    status: response.status,
    userId: session?.user.id,
    organizationId: session?.user.organizationId,
    timestamp: new Date().toISOString(),
    ...additionalData,
  }

  console.log('API Response:', JSON.stringify(logData, null, 2))
}
