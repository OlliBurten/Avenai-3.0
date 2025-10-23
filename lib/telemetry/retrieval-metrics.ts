/**
 * Retrieval Metrics - Lightweight Telemetry
 * Tracks retrieval quality, fallback rate, and answer coverage
 */

export interface RetrievalMetrics {
  intent: string;
  topScore: number;
  uniqueSections: number;
  uniqueDocuments: number;
  fallbackTriggered: boolean;
  fallbackAttempts: number;
  endpointFound: boolean;
  verbatimFound: boolean;
  emptyAnswer: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
  retrievalTimeMs: number;
  vectorCount: number;
  textCount: number;
  fusedCount: number;
  finalCount: number;
}

export interface MetricsAggregation {
  total_queries: number;
  fallback_rate: number;          // % queries that needed fallback
  empty_answer_rate: number;      // % queries with no results
  endpoint_found_rate: number;    // % endpoint queries that found endpoints
  verbatim_hit_rate: number;      // % JSON/code queries that found verbatim blocks
  high_confidence_rate: number;   // % queries with high confidence
  avg_retrieval_time_ms: number;
  avg_top_score: number;
  avg_unique_sections: number;
  by_intent: Record<string, {
    count: number;
    avg_score: number;
    fallback_rate: number;
  }>;
}

// In-memory metrics store (replace with Redis/database in production)
const metricsStore: RetrievalMetrics[] = [];
const MAX_STORE_SIZE = 1000; // Keep last 1000 queries

/**
 * Log retrieval metrics
 * Call this after fusion/MMR in the retrieval pipeline
 */
export function logRetrievalMetrics(metrics: RetrievalMetrics): void {
  // Log to console
  console.log('[retrieval-metrics]', {
    intent: metrics.intent,
    topScore: metrics.topScore.toFixed(4),
    sections: metrics.uniqueSections,
    docs: metrics.uniqueDocuments,
    confidence: metrics.confidenceLevel,
    fallback: metrics.fallbackTriggered,
    endpoint: metrics.endpointFound,
    verbatim: metrics.verbatimFound,
    empty: metrics.emptyAnswer,
    time: `${metrics.retrievalTimeMs}ms`
  });

  // Store in memory (for aggregation)
  metricsStore.push(metrics);
  
  // Keep store size bounded
  if (metricsStore.length > MAX_STORE_SIZE) {
    metricsStore.shift();
  }

  // Optional: Persist to database
  if (process.env.ENABLE_METRICS_DB === 'true') {
    persistMetrics(metrics).catch(err => {
      console.error('[retrieval-metrics] Failed to persist:', err);
    });
  }
}

/**
 * Persist metrics to database (optional)
 */
async function persistMetrics(metrics: RetrievalMetrics): Promise<void> {
  // Example: Store in Prisma
  // await prisma.analyticsEvent.create({
  //   data: {
  //     type: 'retrieval',
  //     metadata: metrics,
  //     createdAt: new Date()
  //   }
  // });
  
  // For now, just log
  // You can implement database persistence later
}

/**
 * Get aggregated metrics
 */
export function getMetricsAggregation(): MetricsAggregation {
  if (metricsStore.length === 0) {
    return {
      total_queries: 0,
      fallback_rate: 0,
      empty_answer_rate: 0,
      endpoint_found_rate: 0,
      verbatim_hit_rate: 0,
      high_confidence_rate: 0,
      avg_retrieval_time_ms: 0,
      avg_top_score: 0,
      avg_unique_sections: 0,
      by_intent: {}
    };
  }

  const total = metricsStore.length;
  
  // Calculate rates
  const fallbackCount = metricsStore.filter(m => m.fallbackTriggered).length;
  const emptyCount = metricsStore.filter(m => m.emptyAnswer).length;
  const endpointQueries = metricsStore.filter(m => m.intent === 'ENDPOINT');
  const endpointFoundCount = endpointQueries.filter(m => m.endpointFound).length;
  const jsonQueries = metricsStore.filter(m => m.intent === 'JSON' || m.intent === 'ONE_LINE');
  const verbatimFoundCount = jsonQueries.filter(m => m.verbatimFound).length;
  const highConfidenceCount = metricsStore.filter(m => m.confidenceLevel === 'high').length;

  // Calculate averages
  const avgRetrievalTime = metricsStore.reduce((sum, m) => sum + m.retrievalTimeMs, 0) / total;
  const avgTopScore = metricsStore.reduce((sum, m) => sum + m.topScore, 0) / total;
  const avgSections = metricsStore.reduce((sum, m) => sum + m.uniqueSections, 0) / total;

  // By intent
  const byIntent: Record<string, { count: number; avg_score: number; fallback_rate: number }> = {};
  const intentGroups = new Map<string, RetrievalMetrics[]>();
  
  for (const m of metricsStore) {
    if (!intentGroups.has(m.intent)) {
      intentGroups.set(m.intent, []);
    }
    intentGroups.get(m.intent)!.push(m);
  }

  for (const [intent, metrics] of intentGroups) {
    const count = metrics.length;
    const avgScore = metrics.reduce((sum, m) => sum + m.topScore, 0) / count;
    const fallbackCount = metrics.filter(m => m.fallbackTriggered).length;
    
    byIntent[intent] = {
      count,
      avg_score: avgScore,
      fallback_rate: fallbackCount / count
    };
  }

  return {
    total_queries: total,
    fallback_rate: fallbackCount / total,
    empty_answer_rate: emptyCount / total,
    endpoint_found_rate: endpointQueries.length > 0 ? endpointFoundCount / endpointQueries.length : 0,
    verbatim_hit_rate: jsonQueries.length > 0 ? verbatimFoundCount / jsonQueries.length : 0,
    high_confidence_rate: highConfidenceCount / total,
    avg_retrieval_time_ms: avgRetrievalTime,
    avg_top_score: avgTopScore,
    avg_unique_sections: avgSections,
    by_intent: byIntent
  };
}

/**
 * Print metrics dashboard to console
 */
export function printMetricsDashboard(): void {
  const agg = getMetricsAggregation();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          RETRIEVAL METRICS DASHBOARD                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Total Queries: ${agg.total_queries}\n`);

  console.log('🎯 Quality Metrics:');
  console.log(`   High Confidence Rate: ${(agg.high_confidence_rate * 100).toFixed(1)}%`);
  console.log(`   Fallback Rate: ${(agg.fallback_rate * 100).toFixed(1)}% (target: <15%)`);
  console.log(`   Empty Answer Rate: ${(agg.empty_answer_rate * 100).toFixed(1)}% (target: <2%)`);
  console.log(`   Endpoint Found Rate: ${(agg.endpoint_found_rate * 100).toFixed(1)}% (target: >90%)`);
  console.log(`   Verbatim Hit Rate: ${(agg.verbatim_hit_rate * 100).toFixed(1)}% (target: >80%)\n`);

  console.log('⏱️  Performance Metrics:');
  console.log(`   Avg Retrieval Time: ${agg.avg_retrieval_time_ms.toFixed(0)}ms (target: <120ms)`);
  console.log(`   Avg Top Score: ${agg.avg_top_score.toFixed(3)}`);
  console.log(`   Avg Unique Sections: ${agg.avg_unique_sections.toFixed(1)}\n`);

  console.log('📂 By Intent:');
  for (const [intent, stats] of Object.entries(agg.by_intent)) {
    console.log(`   ${intent}: ${stats.count} queries, score=${stats.avg_score.toFixed(3)}, fallback=${(stats.fallback_rate * 100).toFixed(0)}%`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // SLO violations
  const violations: string[] = [];
  if (agg.fallback_rate > 0.15) violations.push(`Fallback rate too high: ${(agg.fallback_rate * 100).toFixed(1)}%`);
  if (agg.empty_answer_rate > 0.02) violations.push(`Empty answer rate too high: ${(agg.empty_answer_rate * 100).toFixed(1)}%`);
  if (agg.avg_retrieval_time_ms > 120) violations.push(`Retrieval time too slow: ${agg.avg_retrieval_time_ms.toFixed(0)}ms`);
  if (agg.endpoint_found_rate < 0.9 && Object.keys(agg.by_intent).includes('ENDPOINT')) {
    violations.push(`Endpoint found rate too low: ${(agg.endpoint_found_rate * 100).toFixed(1)}%`);
  }

  if (violations.length > 0) {
    console.log('⚠️  SLO Violations:');
    violations.forEach(v => console.log(`   • ${v}`));
    console.log('');
  } else {
    console.log('✅ All SLOs met!\n');
  }
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  metricsStore.length = 0;
  console.log('🔄 [Metrics] Reset');
}

/**
 * Helper: Check if endpoint was found in results
 */
export function checkEndpointFound(results: Array<{ content: string; metadata?: any }>): boolean {
  return results.some(r => {
    // Check metadata first
    if (r.metadata?.endpoint) return true;
    
    // Check content
    return /^(GET|POST|PUT|PATCH|DELETE)\s+\//m.test(r.content);
  });
}

/**
 * Helper: Check if verbatim content was found
 */
export function checkVerbatimFound(results: Array<{ metadata?: any }>): boolean {
  return results.some(r => {
    return r.metadata?.has_verbatim === true || 
           r.metadata?.verbatim_block != null;
  });
}

