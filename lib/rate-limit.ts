import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/security'

// Rate limit configurations for different endpoints
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Chat endpoints - moderate limits
  chat: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Document upload - stricter limits
  documents: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // General API - standard limits
  default: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Data export/deletion - very strict
  dataExport: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  }
}

// Rate limiter instances
const rateLimiters = new Map<string, RateLimiter>()

function getRateLimiter(endpoint: string): RateLimiter {
  if (!rateLimiters.has(endpoint)) {
    const config = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.default
    rateLimiters.set(endpoint, new RateLimiter(config.maxRequests, config.windowMs))
  }
  return rateLimiters.get(endpoint)!
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token first
  const authToken = request.cookies.get('auth-token')?.value
  if (authToken) {
    try {
      // Extract user ID from JWT (simplified - in production, verify the token)
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      return `user:${payload.id}`
    } catch {
      // Fall back to IP if token is invalid
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0] : realIP || 'unknown'
  return `ip:${ip}`
}

function determineEndpointType(pathname: string): string {
  if (pathname.includes('/auth/')) return 'auth'
  if (pathname.includes('/chat')) return 'chat'
  if (pathname.includes('/documents')) return 'documents'
  if (pathname.includes('/data-export') || pathname.includes('/data-deletion')) return 'dataExport'
  return 'default'
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpointType?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const clientId = getClientIdentifier(request)
      const endpoint = endpointType || determineEndpointType(request.nextUrl.pathname)
      const rateLimiter = getRateLimiter(endpoint)

      if (!rateLimiter.isAllowed(clientId)) {
        const remaining = rateLimiter.getRemainingRequests(clientId)
        const resetTime = rateLimiter.getResetTime(clientId)
        
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            remaining: 0
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': resetTime.toString()
            }
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = await handler(request)
      const remaining = rateLimiter.getRemainingRequests(clientId)
      const resetTime = rateLimiter.getResetTime(clientId)

      response.headers.set('X-RateLimit-Limit', rateLimiter['maxRequests'].toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetTime.toString())

      return response

    } catch (error) {
      console.error('Rate limiting error:', error)
      // If rate limiting fails, allow the request to proceed
      return handler(request)
    }
  }
}

// Specific rate limiters for common endpoints
export const authRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withRateLimit(handler, 'auth')

export const chatRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withRateLimit(handler, 'chat')

export const documentRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withRateLimit(handler, 'documents')

export const dataExportRateLimit = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withRateLimit(handler, 'dataExport')

// Rate limit status endpoint
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request)
  const endpoint = determineEndpointType(request.nextUrl.pathname)
  const rateLimiter = getRateLimiter(endpoint)

  return new NextResponse(
    JSON.stringify({
      clientId,
      endpoint,
      remaining: rateLimiter.getRemainingRequests(clientId),
      limit: rateLimiter['maxRequests'],
      resetTime: rateLimiter.getResetTime(clientId)
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
  )
}
