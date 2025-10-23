import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Standardized error responses for all API routes
 */
export function createErrorResponse(error: ApiError | AppError | Error): NextResponse {
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details: any = undefined

  if (error instanceof AppError) {
    statusCode = error.statusCode
    code = error.code
    message = error.message
    details = error.details
  } else if ('statusCode' in error && 'code' in error) {
    statusCode = error.statusCode
    code = error.code
    message = error.message
    details = error.details
  } else {
    message = error.message || message
  }

  // Log error for debugging (but don't expose sensitive details)
  console.error(`API Error [${code}]:`, {
    message,
    statusCode,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  })

  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === 'development' && details && { details })
      }
    },
    { status: statusCode }
  )
}

/**
 * Common error types for consistent error handling
 */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

/**
 * Predefined error creators for common scenarios
 */
export const Errors = {
  unauthorized: (message: string = 'Authentication required') => 
    new AppError(message, 401, ErrorCodes.UNAUTHORIZED),
  
  forbidden: (message: string = 'Access denied') => 
    new AppError(message, 403, ErrorCodes.FORBIDDEN),
  
  notFound: (resource: string = 'Resource') => 
    new AppError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  
  validationError: (message: string, details?: any) => 
    new AppError(message, 400, ErrorCodes.VALIDATION_ERROR, details),
  
  fileTooLarge: (maxSize: string) => 
    new AppError(`File size exceeds maximum allowed size of ${maxSize}`, 413, ErrorCodes.FILE_TOO_LARGE),
  
  unsupportedFileType: (allowedTypes: string[]) => 
    new AppError(`Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`, 400, ErrorCodes.UNSUPPORTED_FILE_TYPE),
  
  processingError: (message: string, details?: any) => 
    new AppError(message, 422, ErrorCodes.PROCESSING_ERROR, details),
  
  databaseError: (message: string, details?: any) => 
    new AppError(message, 500, ErrorCodes.DATABASE_ERROR, details),
  
  externalApiError: (service: string, message: string) => 
    new AppError(`${service} API error: ${message}`, 502, ErrorCodes.EXTERNAL_API_ERROR),
  
  rateLimitExceeded: (message: string = 'Rate limit exceeded') => 
    new AppError(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED),
  
  internalError: (message: string = 'Internal server error', details?: any) => 
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, details)
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error as Error)
    }
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  )
  
  if (missingFields.length > 0) {
    throw Errors.validationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }
}

/**
 * Validate file upload constraints
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
}): void {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options
  
  if (file.size > maxSize) {
    throw Errors.fileTooLarge(`${Math.round(maxSize / (1024 * 1024))}MB`)
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw Errors.unsupportedFileType(allowedTypes)
  }
  
  if (allowedExtensions.length > 0) {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
      throw Errors.unsupportedFileType(allowedExtensions)
    }
  }
}
