// lib/telemetry.ts
/**
 * Telemetry and observability for Avenai Copilot
 * Logs per-answer metrics for QA and performance monitoring
 */

export interface TelemetryEvent {
  timestamp: string;
  organizationId: string;
  datasetId: string;
  query: string;
  
  // Retrieval metrics
  top1Score: number;
  cumTop2Score: number;
  docsConsidered: number;
  docsCited: number;
  
  // Confidence branch
  branch: 'confident' | 'partial' | 'out_of_scope';
  
  // Performance
  retrievalTimeMs: number;
  generationTimeMs: number;
  totalTimeMs: number;
  
  // Flags
  timeoutRetryUsed: boolean;
  fallbackUsed: boolean;
  singleDocPreference: boolean;
  tokenLimitSafeguard: boolean;
  
  // Product family
  productFamily?: string;
  familyDominance?: number;
}

/**
 * Log a telemetry event
 */
export function logTelemetry(event: TelemetryEvent): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 TELEMETRY:', JSON.stringify(event, null, 2));
  }
  
  // In production, you could POST to /api/logs or send to external service
  // Example:
  // fetch('/api/logs', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(event)
  // }).catch(err => console.error('Telemetry log failed:', err));
}

/**
 * Create a telemetry event from chat metadata
 */
export function createTelemetryEvent(data: {
  organizationId: string;
  datasetId: string;
  query: string;
  intent?: string;  // Add intent
  topScore: number;
  scoreGap?: number;  // Add scoreGap
  uniqueSections?: number;  // Add uniqueSections
  secondScore?: number;
  docsConsidered: number;
  docsCited: number;
  branch: 'confident' | 'partial' | 'out_of_scope';
  fallbackTriggered?: boolean;  // Add fallbackTriggered
  retrievalTimeMs: number;
  generationTimeMs: number;
  timeoutRetryUsed?: boolean;
  fallbackUsed?: boolean;
  singleDocPreference?: boolean;
  tokenLimitSafeguard?: boolean;
  productFamily?: string;
  familyDominance?: number;
}): TelemetryEvent {
  return {
    timestamp: new Date().toISOString(),
    organizationId: data.organizationId,
    datasetId: data.datasetId,
    query: data.query.substring(0, 200), // Truncate for privacy
    top1Score: Math.round(data.topScore * 1000) / 1000,
    cumTop2Score: Math.round(((data.topScore + (data.secondScore || 0)) / 2) * 1000) / 1000,
    docsConsidered: data.docsConsidered,
    docsCited: data.docsCited,
    branch: data.branch,
    retrievalTimeMs: data.retrievalTimeMs,
    generationTimeMs: data.generationTimeMs,
    totalTimeMs: data.retrievalTimeMs + data.generationTimeMs,
    timeoutRetryUsed: data.timeoutRetryUsed || false,
    fallbackUsed: data.fallbackUsed || false,
    singleDocPreference: data.singleDocPreference || false,
    tokenLimitSafeguard: data.tokenLimitSafeguard || false,
    productFamily: data.productFamily,
    familyDominance: data.familyDominance ? Math.round(data.familyDominance * 10) / 10 : undefined
  };
}



