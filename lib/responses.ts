import { NextResponse } from 'next/server'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

/**
 * Create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  meta?: Partial<ApiResponse['meta']>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    },
    { status: statusCode }
  )
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  error: {
    code: string
    message: string
    details?: any
  },
  statusCode: number = 500
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    },
    { status: statusCode }
  )
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = 200
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(total / limit)
  
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    },
    { status: statusCode }
  )
}

/**
 * Common response creators for specific scenarios
 */
export const Responses = {
  ok: <T>(data: T) => createSuccessResponse(data, 200),
  created: <T>(data: T) => createSuccessResponse(data, 201),
  noContent: () => new NextResponse(null, { status: 204 }),
  
  unauthorized: (message: string = 'Authentication required') =>
    createErrorResponse({ code: 'UNAUTHORIZED', message }, 401),
  
  forbidden: (message: string = 'Access denied') =>
    createErrorResponse({ code: 'FORBIDDEN', message }, 403),
  
  notFound: (resource: string = 'Resource') =>
    createErrorResponse({ code: 'NOT_FOUND', message: `${resource} not found` }, 404),
  
  validationError: (message: string, details?: any) =>
    createErrorResponse({ code: 'VALIDATION_ERROR', message, details }, 400),
  
  internalError: (message: string = 'Internal server error', details?: any) =>
    createErrorResponse({ code: 'INTERNAL_ERROR', message, details }, 500),
  
  serviceUnavailable: (service: string) =>
    createErrorResponse({ code: 'SERVICE_UNAVAILABLE', message: `${service} is currently unavailable` }, 503)
}

/**
 * Response helpers for common data types
 */
export const DataResponses = {
  document: (document: any) => Responses.ok({
    id: document.id,
    title: document.title,
    status: document.status,
    chunkCount: document.chunkCount || 0,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  }),
  
  documents: (documents: any[], page?: number, limit?: number, total?: number) => {
    if (page !== undefined && limit !== undefined && total !== undefined) {
      return createPaginatedResponse(documents, page, limit, total)
    }
    return Responses.ok(documents)
  },
  
  chatResponse: (response: string, sources?: any[]) => Responses.ok({
    response,
    sources: sources || [],
    timestamp: new Date().toISOString()
  }),
  
  user: (user: any) => Responses.ok({
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    role: user.role,
    createdAt: user.createdAt
  }),
  
  organization: (org: any) => Responses.ok({
    id: org.id,
    name: org.name,
    plan: org.plan,
    createdAt: org.createdAt
  })
}
