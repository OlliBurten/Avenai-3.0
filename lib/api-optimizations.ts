/**
 * API Route Optimizations
 * Centralized optimizations for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import LRUCache from '@alloc/quick-lru'

// Response cache for GET requests
const responseCache = new LRUCache<string, { response: any; timestamp: number }>({
  maxSize: 500,
  maxAge: 2 * 60 * 1000 // 2 minutes
})

// Rate limiting cache
const rateLimitCache = new LRUCache<string, { count: number; resetTime: number }>({
  maxSize: 10000,
  maxAge: 15 * 60 * 1000 // 15 minutes
})

interface CacheOptions {
  ttl?: number
  key: string
}

/**
 * Cached API response wrapper
 */
export function withCache<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  options: CacheOptions
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req)
    }

    const { key, ttl = 2 * 60 * 1000 } = options
    
    // Check cache
    const cached = responseCache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return NextResponse.json(cached.response)
    }
    
    // Execute handler and cache response
    const response = await handler(req)
    const data = await response.json()
    
    responseCache.set(key, { response: data, timestamp: Date.now() })
    
    return NextResponse.json(data)
  }
}

/**
 * Enhanced rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    windowMs?: number
    maxRequests?: number
    keyGenerator?: (req: NextRequest) => string
  } = {}
) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => {
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown'
      return ip
    }
  } = options

  return async (req: NextRequest): Promise<NextResponse> => {
    const key = keyGenerator(req)
    const now = Date.now()
    
    // Get current rate limit data
    const rateLimitData = rateLimitCache.get(key) || { count: 0, resetTime: now + windowMs }
    
    // Reset if window expired
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0
      rateLimitData.resetTime = now + windowMs
    }
    
    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.resetTime.toString()
          }
        }
      )
    }
    
    // Increment counter
    rateLimitData.count++
    rateLimitCache.set(key, rateLimitData)
    
    // Add rate limit headers
    const response = await handler(req)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - rateLimitData.count).toString())
    response.headers.set('X-RateLimit-Reset', rateLimitData.resetTime.toString())
    
    return response
  }
}

/**
 * Request validation middleware
 */
export function withValidation<T>(
  handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>,
  validator: (data: any) => T
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const body = await req.json()
      const validatedData = validator(body)
      return handler(req, validatedData)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      )
    }
  }
}

/**
 * Error handling middleware
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('API Error:', error)
      
      // Don't expose sensitive error details in production
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return NextResponse.json(
        {
          error: 'Internal server error',
          ...(isDevelopment && { details: error instanceof Error ? error.message : 'Unknown error' })
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpointName: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    
    try {
      const response = await handler(req)
      const duration = Date.now() - startTime
      
      // Log slow requests
      if (duration > 1000) {
        console.warn(`Slow API request: ${endpointName} took ${duration}ms`)
      }
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`API Error in ${endpointName} after ${duration}ms:`, error)
      throw error
    }
  }
}

/**
 * Combined middleware wrapper
 */
export function createOptimizedHandler<T>(
  handler: (req: NextRequest, data?: T) => Promise<NextResponse>,
  options: {
    cache?: CacheOptions
    rateLimit?: {
      windowMs?: number
      maxRequests?: number
    }
    validation?: (data: any) => T
    endpointName?: string
  } = {}
) {
  let optimizedHandler = handler

  // Add performance monitoring
  if (options.endpointName) {
    optimizedHandler = withPerformanceMonitoring(optimizedHandler, options.endpointName)
  }

  // Add error handling
  optimizedHandler = withErrorHandling(optimizedHandler)

  // Add validation
  if (options.validation) {
    optimizedHandler = withValidation(optimizedHandler, options.validation)
  }

  // Add rate limiting
  if (options.rateLimit) {
    optimizedHandler = withRateLimit(optimizedHandler, options.rateLimit)
  }

  // Add caching
  if (options.cache) {
    optimizedHandler = withCache(optimizedHandler, options.cache)
  }

  return optimizedHandler
}

/**
 * Clear cache utilities
 */
export function clearResponseCache(pattern?: string) {
  if (!pattern) {
    responseCache.clear()
    return
  }

  const keysToDelete: string[] = []
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => responseCache.delete(key))
}

export function clearRateLimitCache(pattern?: string) {
  if (!pattern) {
    rateLimitCache.clear()
    return
  }

  const keysToDelete: string[] = []
  for (const key of rateLimitCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => rateLimitCache.delete(key))
}

/**
 * Request size limiter
 */
export function withSizeLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  maxSize: number = 1024 * 1024 // 1MB default
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const contentLength = req.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      )
    }

    return handler(req)
  }
}

/**
 * CORS middleware
 */
export function withCORS(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
  } = {}
) {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    headers = ['Content-Type', 'Authorization']
  } = options

  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req)
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin)
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '))
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    
    return response
  }
}
