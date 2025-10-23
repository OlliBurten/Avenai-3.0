// lib/env-validation.ts
// Centralized environment validation for production readiness

import { z } from 'zod'

// Environment schema validation
const EnvironmentSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL').optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format'),
  
  // Pinecone
  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is required'),
  PINECONE_ENVIRONMENT: z.string().min(1, 'PINECONE_ENVIRONMENT is required'),
  PINECONE_INDEX_NAME: z.string().min(1, 'PINECONE_INDEX_NAME is required').default('avenai-docs'),
  
  // Document Processing Worker
  DOC_WORKER_URL: z.string().url('Invalid DOC_WORKER_URL').optional(),
  
  // OCR Services (optional - for cloud OCR)
  AZURE_CV_ENDPOINT: z.string().url('Invalid AZURE_CV_ENDPOINT').optional(),
  AZURE_CV_KEY: z.string().min(1, 'AZURE_CV_KEY is required if AZURE_CV_ENDPOINT is set').optional(),
  GOOGLE_OCR_CREDENTIALS: z.string().min(1, 'GOOGLE_OCR_CREDENTIALS is required for Google OCR').optional(),
  AWS_OCR_REGION: z.string().min(1, 'AWS_OCR_REGION is required for AWS OCR').optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required for AWS OCR').optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required for AWS OCR').optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid Stripe secret key format'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_', 'Invalid Stripe publishable key format'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'Invalid Stripe webhook secret format'),
  STRIPE_PRO_PRICE_ID: z.string().min(1, 'STRIPE_PRO_PRICE_ID is required'),
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Optional features
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_COLLABORATION: z.string().transform(val => val === 'true').default('false'),
  ENABLE_VERSION_CONTROL: z.string().transform(val => val === 'true').default('false'),
  ENABLE_API_KEYS: z.string().transform(val => val === 'true').default('false'),
  ENABLE_BILLING: z.string().transform(val => val === 'true').default('true'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  
  // Monitoring
  METRICS_PORT: z.string().transform(Number).default('9090'),
})

export type Environment = z.infer<typeof EnvironmentSchema>

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  environment: Partial<Environment>
}

/**
 * Validate environment variables with detailed error reporting
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    const environment = EnvironmentSchema.parse(process.env)
    
    // Additional custom validations
    if (environment.NODE_ENV === 'production') {
      if (!environment.NEXTAUTH_URL) {
        errors.push('NEXTAUTH_URL is required in production')
      }
      
      if (environment.NEXTAUTH_SECRET.length < 64) {
        warnings.push('Consider using a longer NEXTAUTH_SECRET (64+ characters) for production')
      }
    }
    
    // Check Pinecone index name format
    if (!/^[a-z0-9-]+$/.test(environment.PINECONE_INDEX_NAME)) {
      errors.push('PINECONE_INDEX_NAME must contain only lowercase letters, numbers, and hyphens')
    }
    
    // Check Stripe price ID format
    if (!environment.STRIPE_PRO_PRICE_ID.startsWith('price_')) {
      warnings.push('STRIPE_PRO_PRICE_ID should start with "price_"')
    }
    
    // Check OCR service configuration
    if (environment.AZURE_CV_ENDPOINT && !environment.AZURE_CV_KEY) {
      errors.push('AZURE_CV_KEY is required when AZURE_CV_ENDPOINT is set')
    }
    
    if (environment.AWS_OCR_REGION && (!environment.AWS_ACCESS_KEY_ID || !environment.AWS_SECRET_ACCESS_KEY)) {
      errors.push('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when AWS_OCR_REGION is set')
    }
    
    // Check document worker URL
    if (!environment.DOC_WORKER_URL) {
      warnings.push('DOC_WORKER_URL not set - PDF processing will use fallback methods')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      environment,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
      errors.push(...zodErrors)
    } else {
      errors.push(`Unexpected validation error: ${error}`)
    }
    
    return {
      isValid: false,
      errors,
      warnings,
      environment: {},
    }
  }
}

/**
 * Get validated environment variables
 */
export function getEnvironment(): Environment {
  const validation = validateEnvironment()
  
  if (!validation.isValid) {
    console.error('❌ Environment validation failed:')
    validation.errors.forEach(error => console.error(`   ${error}`))
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed in production')
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:')
    validation.warnings.forEach(warning => console.warn(`   ${warning}`))
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    console.log('✅ Environment validation passed')
  }
  
  return validation.environment as Environment
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnvironmentVariable(key: string): boolean {
  return process.env[key] !== undefined && process.env[key] !== ''
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  return process.env[key] || fallback || ''
}

/**
 * Get boolean environment variable
 */
export function getBooleanEnvVar(key: string, fallback: boolean = false): boolean {
  const value = process.env[key]
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

/**
 * Get number environment variable
 */
export function getNumberEnvVar(key: string, fallback: number = 0): number {
  const value = process.env[key]
  if (value === undefined) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Environment-specific configuration
 */
export function getEnvironmentConfig() {
  const env = getEnvironment()
  
  return {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    
    // Database
    database: {
      url: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    
    // Authentication
    auth: {
      secret: env.NEXTAUTH_SECRET,
      url: env.NEXTAUTH_URL,
      secure: env.NODE_ENV === 'production',
    },
    
    // OpenAI
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    
    // Pinecone
    pinecone: {
      apiKey: env.PINECONE_API_KEY,
      environment: env.PINECONE_ENVIRONMENT,
      indexName: env.PINECONE_INDEX_NAME,
    },
    
    // Document Processing
    documentProcessing: {
      workerUrl: env.DOC_WORKER_URL,
    },
    
    // OCR Services
    ocr: {
      azure: {
        endpoint: env.AZURE_CV_ENDPOINT,
        key: env.AZURE_CV_KEY,
      },
      google: {
        credentials: env.GOOGLE_OCR_CREDENTIALS,
      },
      aws: {
        region: env.AWS_OCR_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    },
    
    // Stripe
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      proPriceId: env.STRIPE_PRO_PRICE_ID,
    },
    
    // Features
    features: {
      analytics: env.ENABLE_ANALYTICS,
      collaboration: env.ENABLE_COLLABORATION,
      versionControl: env.ENABLE_VERSION_CONTROL,
      apiKeys: env.ENABLE_API_KEYS,
      billing: env.ENABLE_BILLING,
    },
    
    // Logging
    logging: {
      level: env.LOG_LEVEL,
      filePath: env.LOG_FILE_PATH,
    },
    
    // Monitoring
    monitoring: {
      metricsPort: env.METRICS_PORT,
    },
  }
}

// Auto-validate on import in development
if (process.env.NODE_ENV === 'development') {
  validateEnvironment()
}
