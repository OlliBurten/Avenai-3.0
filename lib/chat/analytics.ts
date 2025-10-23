// lib/chat/analytics.ts
// Quality monitoring for GPT-style RAG system

import { prisma } from '@/lib/prisma';

export interface ChatAnalytics {
  questionId: string;
  question: string;
  datasetId: string;
  organizationId: string;
  
  // Retrieval metrics
  semanticMatches: number;
  keywordMatches: number;
  hybridSearch: boolean;
  finalChunks: number;
  distinctDocs: number;
  
  // Answer metrics
  answerLength: number;
  coverage: 'full' | 'partial' | 'out_of_scope';
  usedStructured: boolean;
  fallbackUsed: boolean;
  
  // Quality metrics
  feedback?: 'up' | 'down';
  responseTime: number;
  
  timestamp: Date;
}

/**
 * Log chat interaction for quality monitoring
 */
export async function logChatAnalytics(data: Omit<ChatAnalytics, 'timestamp'>): Promise<void> {
  try {
    // Store in database for analytics dashboard
    // Note: userId is required, so we skip DB storage for now
    // TODO: Add userId to analytics data or make it optional in schema
    
    // For now, just log to console
    console.log('📊 Chat Analytics (DB storage skipped - needs userId):', {
      questionId: data.questionId,
      question: data.question.substring(0, 50),
      coverage: data.coverage,
      chunks: data.finalChunks,
      hybrid: data.hybridSearch,
      time: `${data.responseTime}ms`
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Chat Analytics:', {
        question: data.question.substring(0, 50),
        coverage: data.coverage,
        chunks: data.finalChunks,
        hybrid: data.hybridSearch,
        time: `${data.responseTime}ms`
      });
    }
  } catch (error) {
    console.error('Failed to log chat analytics:', error);
  }
}

/**
 * Get quality metrics for a dataset
 */
export async function getDatasetQualityMetrics(datasetId: string): Promise<{
  totalQuestions: number;
  avgCoverage: number;
  avgResponseTime: number;
  feedbackRatio: { up: number; down: number };
  topUnansweredTerms: string[];
}> {
  const feedback = await prisma.chatFeedback.findMany({
    where: { datasetId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  
  const totalQuestions = feedback.length;
  
  // Calculate coverage percentage
  const coverageScores = feedback.map(f => {
    const coverage = (f.metadata as any)?.answer?.coverage;
    if (coverage === 'full') return 1.0;
    if (coverage === 'partial') return 0.5;
    return 0.0;
  });
  const avgCoverage = totalQuestions > 0 && coverageScores.length > 0 
    ? coverageScores.reduce((a: number, b: number) => a + b, 0) / totalQuestions 
    : 0;
  
  // Calculate average response time
  const responseTimes = feedback
    .map(f => (f.metadata as any)?.performance?.responseTime)
    .filter(t => typeof t === 'number');
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
  
  // Calculate feedback ratio
  const upCount = feedback.filter(f => f.rating === 'POSITIVE').length;
  const downCount = feedback.filter(f => f.rating === 'NEGATIVE').length;
  const feedbackRatio = {
    up: totalQuestions > 0 ? upCount / totalQuestions : 0,
    down: totalQuestions > 0 ? downCount / totalQuestions : 0
  };
  
  // Extract unanswered terms (questions with out_of_scope coverage)
  const unansweredQuestions = feedback
    .filter(f => (f.metadata as any)?.answer?.coverage === 'out_of_scope')
    .map(f => f.userQuery);
  
  // Simple term extraction (can be improved with NLP)
  const termCounts: Record<string, number> = {};
  unansweredQuestions.forEach(q => {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    words.forEach(w => {
      termCounts[w] = (termCounts[w] || 0) + 1;
    });
  });
  
  const topUnansweredTerms = Object.entries(termCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([term]) => term);
  
  return {
    totalQuestions,
    avgCoverage,
    avgResponseTime,
    feedbackRatio,
    topUnansweredTerms
  };
}

/**
 * Get real-time quality dashboard data
 */
export async function getQualityDashboard(organizationId: string): Promise<{
  datasets: Array<{
    id: string;
    name: string;
    metrics: Awaited<ReturnType<typeof getDatasetQualityMetrics>>;
  }>;
  overall: {
    totalQuestions: number;
    avgCoverage: number;
    avgResponseTime: number;
    feedbackRatio: { up: number; down: number };
  };
}> {
  const datasets = await prisma.dataset.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true }
  });
  
  const datasetMetrics = await Promise.all(
    datasets.map(async (ds) => ({
      id: ds.id,
      name: ds.name,
      metrics: await getDatasetQualityMetrics(ds.id)
    }))
  );
  
  // Calculate overall metrics
  const allMetrics = datasetMetrics.map(d => d.metrics);
  const totalQuestions = allMetrics.reduce((sum, m) => sum + m.totalQuestions, 0);
  const avgCoverage = allMetrics.reduce((sum, m) => sum + m.avgCoverage * m.totalQuestions, 0) / totalQuestions || 0;
  const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.avgResponseTime * m.totalQuestions, 0) / totalQuestions || 0;
  const totalUp = allMetrics.reduce((sum, m) => sum + m.feedbackRatio.up * m.totalQuestions, 0);
  const totalDown = allMetrics.reduce((sum, m) => sum + m.feedbackRatio.down * m.totalQuestions, 0);
  
  return {
    datasets: datasetMetrics,
    overall: {
      totalQuestions,
      avgCoverage,
      avgResponseTime,
      feedbackRatio: {
        up: totalQuestions > 0 ? totalUp / totalQuestions : 0,
        down: totalQuestions > 0 ? totalDown / totalQuestions : 0
      }
    }
  };
}
