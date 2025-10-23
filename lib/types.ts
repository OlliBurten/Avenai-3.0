// lib/types.ts
// Centralized TypeScript types for the entire application

import { UserRole, SubscriptionTier, SubscriptionStatus, DocumentStatus, MessageRole, SharePermission, DatasetType } from '@prisma/client'

// ===== AUTHENTICATION TYPES =====
export interface SessionUser {
  id: string
  email: string
  organizationId: string
  name?: string
  role?: UserRole
}

export interface Session {
  user: SessionUser
}

// ===== ORGANIZATION TYPES =====
export interface Organization {
  id: string
  name: string
  slug: string
  domain?: string
  logoUrl?: string
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  apiKeyHash?: string
  webhookUrl?: string
  settings: Record<string, any>
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

// ===== USER TYPES =====
export interface User {
  id: string
  organizationId: string
  email: string
  passwordHash?: string
  firstName?: string
  lastName?: string
  role: UserRole
  avatarUrl?: string
  lastLoginAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ===== DATASET TYPES =====
export interface Dataset {
  id: string
  organizationId: string
  name: string
  description?: string
  type: DatasetType
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  documents?: Document[]
  _count?: {
    documents: number
  }
}

// ===== DOCUMENT TYPES =====
export interface Document {
  id: string
  organizationId: string
  datasetId?: string
  userId?: string
  title: string
  contentType: string
  filePath?: string
  fileSize?: bigint
  fileHash?: string
  status: DocumentStatus
  tags: string[]
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  dataset?: Dataset
  user?: User
  documentChunks?: DocumentChunk[]
  shares?: DocumentShare[]
}

export interface DocumentChunk {
  id: string
  documentId: string
  organizationId: string
  content: string
  embeddingId?: string
  chunkIndex: number
  metadata: Record<string, any>
  createdAt: Date
  document?: Document
}

// ===== CHAT TYPES =====
export interface ChatSession {
  id: string
  organizationId: string
  sessionId: string
  userIdentifier?: string
  context: Record<string, any>
  startedAt: Date
  lastActivityAt: Date
  chatMessages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  sessionId: string
  organizationId: string
  role: MessageRole
  content: string
  metadata: Record<string, any>
  createdAt: Date
  session?: ChatSession
}

// ===== SHARING TYPES =====
export interface DocumentShare {
  id: string
  documentId: string
  userId: string
  sharedBy: string
  permission: SharePermission
  createdAt: Date
  updatedAt: Date
  document?: Document
  user?: User
  sharedByUser?: User
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsEvent {
  id: string
  organizationId: string
  eventType: string
  eventData: Record<string, any>
  userIdentifier?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

// ===== COLLABORATION TYPES =====
export interface CollaborationSession {
  id: string
  documentId: string
  userId: string
  sessionId: string
  participants: any[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  document?: Document
  user?: User
}

// ===== API TYPES =====
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  debug?: any
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// ===== CHAT WIDGET TYPES =====
export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  messageId?: string // For feedback tracking
}

export interface ChatWidgetProps {
  organizationId: string
}

// ===== DOCUMENT UPLOAD TYPES =====
export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface DocumentUploadProps {
  organizationId: string
  datasetId?: string
  onUploadComplete?: (document: Document) => void
  onUploadError?: (error: string) => void
}

// ===== BILLING TYPES =====
export interface BillingInfo {
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

export interface BillingDashboardProps {
  organizationId: string
}

// ===== SEARCH TYPES =====
export interface SearchResult {
  id: string
  title: string
  content: string
  type: 'document' | 'chunk'
  relevanceScore?: number
  metadata?: Record<string, any>
}

export interface SearchParams {
  query: string
  datasetId?: string
  organizationId: string
  limit?: number
  offset?: number
}

// ===== FORM TYPES =====
export interface DatasetFormData {
  name: string
  description?: string
  type: DatasetType
  tags?: string[]
}

export interface UserFormData {
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
}

// ===== ERROR TYPES =====
export interface ApiError {
  code: string
  message: string
  details?: any
  statusCode: number
}

// ===== CONFIGURATION TYPES =====
export interface AppConfig {
  app: {
    name: string
    version: string
    environment: string
    port: number
    host: string
  }
  database: {
    url: string
    maxConnections: number
    connectionTimeout: number
    queryTimeout: number
    ssl: boolean | object
  }
  auth: {
    secret: string
    jwtExpiry: string
    sessionExpiry: number
    cookieSecure: boolean
    cookieSameSite: 'lax' | 'strict' | 'none'
  }
  openai: {
    apiKey: string
    embeddingModel: string
    chatModel: string
    maxTokens: number
    temperature: number
    timeout: number
  }
  pinecone: {
    apiKey: string
    environment: string
    indexName: string
    dimension: number
    metric: 'cosine' | 'euclidean' | 'dotproduct'
  }
  stripe: {
    secretKey: string
    publishableKey: string
    webhookSecret: string
    priceIds: {
      pro: string
    }
  }
  upload: {
    maxFileSize: number
    allowedTypes: string[]
    allowedExtensions: string[]
    storagePath: string
  }
  processing: {
    maxChunkSize: number
    maxMergeSize: number
    minChunkSize: number
    batchSize: number
    maxConcurrentProcessing: number
    processingTimeout: number
  }
  rateLimit: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
    skipFailedRequests: boolean
  }
  cache: {
    ttl: number
    maxSize: number
    checkPeriod: number
  }
  logging: {
    level: string
    format: string
    enableConsole: boolean
    enableFile: boolean
    filePath: string
  }
  monitoring: {
    enableMetrics: boolean
    metricsPort: number
    healthCheckInterval: number
  }
  security: {
    enableCSP: boolean
    enableHSTS: boolean
    enableXSSProtection: boolean
    enableCSRFProtection: boolean
    enableRateLimiting: boolean
    enableInputSanitization: boolean
    maxLoginAttempts: number
    lockoutDuration: number
  }
  features: {
    enableAnalytics: boolean
    enableCollaboration: boolean
    enableVersionControl: boolean
    enableApiKeys: boolean
    enableBilling: boolean
  }
  performance: {
    enableCompression: boolean
    enableMinification: boolean
    enableTreeShaking: boolean
    enableCodeSplitting: boolean
    enableLazyLoading: boolean
    enablePrefetching: boolean
    enableCaching: boolean
  }
  development: {
    enableHotReload: boolean
    enableSourceMaps: boolean
    enableDebugLogs: boolean
    enableErrorOverlay: boolean
  }
}

// ===== UTILITY TYPES =====
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type NonNullable<T> = T extends null | undefined ? never : T

// ===== COMPONENT PROPS TYPES =====
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export interface ErrorProps extends BaseComponentProps {
  error?: Error | string
  onRetry?: () => void
}

// ===== EXPORT ALL PRISMA TYPES =====
export {
  UserRole,
  SubscriptionTier,
  SubscriptionStatus,
  DocumentStatus,
  MessageRole,
  SharePermission,
  DatasetType,
}