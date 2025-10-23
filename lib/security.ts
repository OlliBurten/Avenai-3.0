import { NextRequest } from 'next/server'
import { createHash, randomBytes } from 'crypto'

/**
 * Security utilities for production-ready application
 */

// Input sanitization
export const Sanitization = {
  // Sanitize HTML content
  sanitizeHtml: (html: string): string => {
    // Remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
  },

  // Sanitize file names
  sanitizeFileName: (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .substring(0, 255)
  },

  // Sanitize user input
  sanitizeInput: (input: string): string => {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+=/gi, '')
  },

  // Validate email format
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  },

  // Validate password strength
  validatePassword: (password: string): {
    isValid: boolean
    errors: string[]
  } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },
}

// Rate limiting
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  getResetTime(identifier: string): number {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    const oldestRequest = Math.min(...requests)
    
    return oldestRequest + this.windowMs
  }
}

// CSRF protection
export const CSRFProtection = {
  generateToken: (): string => {
    return randomBytes(32).toString('hex')
  },

  validateToken: (token: string, sessionToken: string): boolean => {
    return token === sessionToken && token.length === 64
  },

  getTokenFromRequest: async (request: NextRequest): Promise<string | null> => {
    // Check header first
    const headerToken = request.headers.get('x-csrf-token')
    if (headerToken) return headerToken

    // Check form data
    const formData = await request.formData()
    if (formData) {
      const token = formData.get('csrf-token')
      if (typeof token === 'string') return token
    }

    // Check JSON body
    try {
      const body = await request.json()
      if (body && typeof body === 'object' && 'csrf-token' in body) {
        return body['csrf-token'] as string
      }
    } catch {
      // Ignore JSON parsing errors
    }

    return null
  },
}

// Content Security Policy
export const CSP = {
  generatePolicy: (options: {
    allowInlineStyles?: boolean
    allowInlineScripts?: boolean
    allowEval?: boolean
    allowDataUrls?: boolean
  } = {}): string => {
    const {
      allowInlineStyles = false,
      allowInlineScripts = false,
      allowEval = false,
      allowDataUrls = false,
    } = options

    const directives = [
      "default-src 'self'",
      "script-src 'self'" + (allowInlineScripts ? " 'unsafe-inline'" : '') + (allowEval ? " 'unsafe-eval'" : ''),
      "style-src 'self'" + (allowInlineStyles ? " 'unsafe-inline'" : ''),
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]

    if (allowDataUrls) {
      directives.push("img-src 'self' data: https:")
    }

    return directives.join('; ')
  },
}

// Security headers
export const SecurityHeaders = {
  generateHeaders: (): Record<string, string> => {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': CSP.generatePolicy(),
    }
  },
}

// File upload security
export const FileSecurity = {
  // Validate file type by magic bytes
  validateFileType: async (file: File, allowedTypes: string[]): Promise<boolean> => {
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    // Check magic bytes for common file types
    const magicBytes: Record<string, number[][]> = {
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG
      'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF
      'text/plain': [[0xEF, 0xBB, 0xBF], [0xFF, 0xFE], [0xFE, 0xFF]], // UTF-8/UTF-16 BOM
    }

    for (const type of allowedTypes) {
      const signatures = magicBytes[type]
      if (signatures) {
        for (const signature of signatures) {
          if (signature.every((byte, index) => uint8Array[index] === byte)) {
            return true
          }
        }
      }
    }

    return false
  },

  // Generate secure file hash
  generateFileHash: (content: Buffer): string => {
    return createHash('sha256').update(content).digest('hex')
  },

  // Scan for malicious content
  scanContent: (content: string): {
    isSafe: boolean
    threats: string[]
  } => {
    const threats: string[] = []
    
    // Check for common attack patterns
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        threats.push(`Malicious pattern detected: ${pattern.source}`)
      }
    }

    return {
      isSafe: threats.length === 0,
      threats,
    }
  },
}

// Environment security
export const EnvironmentSecurity = {
  validateEnvironment: (): {
    isValid: boolean
    errors: string[]
  } => {
    const errors: string[] = []
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'OPENAI_API_KEY',
      'PINECONE_API_KEY',
      'PINECONE_ENVIRONMENT',
    ]

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`)
      }
    }

    // Validate secret strength
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters long')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  },
}
