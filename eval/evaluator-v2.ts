/**
 * Evaluator V2 - Exact & Structured Scoring
 * Tests Avenai against golden set with precision metrics
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GoldenQuestion {
  id: string;
  query: string;
  intent: string;
  expected_exact?: string[]; // Must appear verbatim
  expected_keywords?: string[]; // Should appear (case-insensitive)
  expected_structured?: any; // Structured validation
  category: string;
}

export interface EvalResult {
  id: string;
  query: string;
  intent: string;
  category: string;
  answer: string;
  scores: {
    exact: number; // 0-1: fraction of exact strings found
    keyword: number; // 0-1: fraction of keywords found
    structured: number; // 0-1: structured validation passed
    overall: number; // 0-1: weighted average
  };
  passed: boolean;
  failures: string[];
  duration_ms: number;
}

export interface EvalReport {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  by_category: Record<string, { total: number; passed: number; pass_rate: number }>;
  by_intent: Record<string, { total: number; passed: number; pass_rate: number }>;
  results: EvalResult[];
  summary: {
    avg_exact_score: number;
    avg_keyword_score: number;
    avg_structured_score: number;
    avg_duration_ms: number;
  };
}

/**
 * Score exact string matches
 */
function scoreExact(answer: string, expected: string[]): { score: number; found: string[]; missing: string[] } {
  if (!expected || expected.length === 0) return { score: 1, found: [], missing: [] };
  
  const found: string[] = [];
  const missing: string[] = [];
  
  for (const term of expected) {
    if (answer.includes(term)) {
      found.push(term);
    } else {
      missing.push(term);
    }
  }
  
  return {
    score: found.length / expected.length,
    found,
    missing
  };
}

/**
 * Score keyword presence (case-insensitive)
 */
function scoreKeywords(answer: string, keywords: string[]): { score: number; found: string[]; missing: string[] } {
  if (!keywords || keywords.length === 0) return { score: 1, found: [], missing: [] };
  
  const answerLower = answer.toLowerCase();
  const found: string[] = [];
  const missing: string[] = [];
  
  for (const keyword of keywords) {
    if (answerLower.includes(keyword.toLowerCase())) {
      found.push(keyword);
    } else {
      missing.push(keyword);
    }
  }
  
  return {
    score: found.length / keywords.length,
    found,
    missing
  };
}

/**
 * Structured validation
 */
function scoreStructured(answer: string, expected: any): { score: number; passed: boolean; reason?: string } {
  if (!expected) return { score: 1, passed: true };
  
  const type = expected.type;
  
  switch (type) {
    case 'headers': {
      // Validate header count and names
      const { count, names } = expected;
      let headerCount = 0;
      
      for (const name of names || []) {
        if (answer.includes(name)) headerCount++;
      }
      
      const passed = headerCount >= (count || names.length);
      return {
        score: headerCount / (count || names.length),
        passed,
        reason: passed ? undefined : `Found ${headerCount}/${count || names.length} headers`
      };
    }
    
    case 'endpoint': {
      // Validate METHOD and path
      const { method, path, path_contains } = expected;
      
      let methodFound = !method || answer.includes(method);
      let pathFound = !path || answer.includes(path);
      let pathContainsFound = !path_contains || answer.includes(path_contains);
      
      const checks = [methodFound, pathFound, pathContainsFound].filter(Boolean);
      const passed = checks.every(c => c);
      
      return {
        score: checks.filter(c => c).length / checks.length,
        passed,
        reason: passed ? undefined : `Missing: ${[
          !methodFound && 'method',
          !pathFound && 'path',
          !pathContainsFound && 'path_contains'
        ].filter(Boolean).join(', ')}`
      };
    }
    
    case 'json': {
      // Validate JSON fields present
      const { fields } = expected;
      let fieldCount = 0;
      
      for (const field of fields || []) {
        if (answer.includes(field)) fieldCount++;
      }
      
      const passed = fieldCount >= (fields?.length || 0);
      return {
        score: fieldCount / (fields?.length || 1),
        passed,
        reason: passed ? undefined : `Found ${fieldCount}/${fields?.length} fields`
      };
    }
    
    case 'error_list': {
      // Validate error count
      const { min_count } = expected;
      const errorCodes = answer.match(/\b[A-Z_]{3,}\b/g) || [];
      const passed = errorCodes.length >= (min_count || 3);
      
      return {
        score: Math.min(1, errorCodes.length / (min_count || 3)),
        passed,
        reason: passed ? undefined : `Found ${errorCodes.length} error codes, expected ≥${min_count}`
      };
    }
    
    case 'permissions': {
      // Validate permissions count
      const { min_count } = expected;
      const permissions = answer.match(/\b[A-Z_]{3,}\b/g) || [];
      const passed = permissions.length >= (min_count || 2);
      
      return {
        score: Math.min(1, permissions.length / (min_count || 2)),
        passed,
        reason: passed ? undefined : `Found ${permissions.length} permissions, expected ≥${min_count}`
      };
    }
    
    default:
      return { score: 1, passed: true };
  }
}

/**
 * Evaluate a single question
 */
export async function evaluateQuestion(
  question: GoldenQuestion,
  answerFn: (query: string) => Promise<string>
): Promise<EvalResult> {
  const startTime = Date.now();
  
  // Get answer from Avenai
  const answer = await answerFn(question.query);
  
  const duration_ms = Date.now() - startTime;
  
  // Score exact matches
  const exactResult = scoreExact(answer, question.expected_exact || []);
  
  // Score keywords
  const keywordResult = scoreKeywords(answer, question.expected_keywords || []);
  
  // Score structured
  const structuredResult = scoreStructured(answer, question.expected_structured);
  
  // Calculate overall score (weighted)
  const weights = {
    exact: 0.5,
    keyword: 0.3,
    structured: 0.2
  };
  
  const overallScore = 
    exactResult.score * weights.exact +
    keywordResult.score * weights.keyword +
    structuredResult.score * weights.structured;
  
  // Determine if passed (>= 90% overall, or all exact matches if specified)
  const passed = question.expected_exact?.length > 0
    ? exactResult.score === 1.0 // 100% exact matches required
    : overallScore >= 0.9;
  
  // Collect failures
  const failures: string[] = [];
  
  if (exactResult.missing.length > 0) {
    failures.push(`Missing exact: ${exactResult.missing.join(', ')}`);
  }
  
  if (keywordResult.missing.length > 0 && keywordResult.score < 0.7) {
    failures.push(`Missing keywords: ${keywordResult.missing.join(', ')}`);
  }
  
  if (!structuredResult.passed && structuredResult.reason) {
    failures.push(`Structured validation: ${structuredResult.reason}`);
  }
  
  return {
    id: question.id,
    query: question.query,
    intent: question.intent,
    category: question.category,
    answer,
    scores: {
      exact: exactResult.score,
      keyword: keywordResult.score,
      structured: structuredResult.score,
      overall: overallScore
    },
    passed,
    failures,
    duration_ms
  };
}

/**
 * Run full evaluation suite
 */
export async function runEvaluation(
  goldenSetPath: string,
  answerFn: (query: string) => Promise<string>
): Promise<EvalReport> {
  // Load golden set
  const goldenSet: GoldenQuestion[] = fs.readFileSync(goldenSetPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
  
  console.log(`📊 Evaluating ${goldenSet.length} questions from golden set...`);
  
  // Evaluate all questions
  const results: EvalResult[] = [];
  
  for (const question of goldenSet) {
    console.log(`\n🔍 [${question.id}] ${question.query}`);
    
    const result = await evaluateQuestion(question, answerFn);
    results.push(result);
    
    const statusEmoji = result.passed ? '✅' : '❌';
    console.log(`   ${statusEmoji} Overall: ${(result.scores.overall * 100).toFixed(0)}% (${result.duration_ms}ms)`);
    console.log(`      Exact: ${(result.scores.exact * 100).toFixed(0)}%, Keyword: ${(result.scores.keyword * 100).toFixed(0)}%, Structured: ${(result.scores.structured * 100).toFixed(0)}%`);
    
    if (!result.passed && result.failures.length > 0) {
      console.log(`      Failures: ${result.failures.join('; ')}`);
    }
  }
  
  // Calculate statistics
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const pass_rate = passed / results.length;
  
  // By category
  const by_category: Record<string, any> = {};
  for (const result of results) {
    if (!by_category[result.category]) {
      by_category[result.category] = { total: 0, passed: 0, pass_rate: 0 };
    }
    by_category[result.category].total++;
    if (result.passed) by_category[result.category].passed++;
  }
  
  for (const cat in by_category) {
    by_category[cat].pass_rate = by_category[cat].passed / by_category[cat].total;
  }
  
  // By intent
  const by_intent: Record<string, any> = {};
  for (const result of results) {
    if (!by_intent[result.intent]) {
      by_intent[result.intent] = { total: 0, passed: 0, pass_rate: 0 };
    }
    by_intent[result.intent].total++;
    if (result.passed) by_intent[result.intent].passed++;
  }
  
  for (const intent in by_intent) {
    by_intent[intent].pass_rate = by_intent[intent].passed / by_intent[intent].total;
  }
  
  // Summary stats
  const summary = {
    avg_exact_score: results.reduce((sum, r) => sum + r.scores.exact, 0) / results.length,
    avg_keyword_score: results.reduce((sum, r) => sum + r.scores.keyword, 0) / results.length,
    avg_structured_score: results.reduce((sum, r) => sum + r.scores.structured, 0) / results.length,
    avg_duration_ms: results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length
  };
  
  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    pass_rate,
    by_category,
    by_intent,
    results,
    summary
  };
  
  // Print summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 EVALUATION REPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n✅ Passed: ${passed}/${results.length} (${(pass_rate * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  console.log('\n📈 Score Breakdown:');
  console.log(`   Exact Matches: ${(summary.avg_exact_score * 100).toFixed(1)}%`);
  console.log(`   Keywords: ${(summary.avg_keyword_score * 100).toFixed(1)}%`);
  console.log(`   Structured: ${(summary.avg_structured_score * 100).toFixed(1)}%`);
  
  console.log('\n⏱️  Performance:');
  console.log(`   Avg Duration: ${summary.avg_duration_ms.toFixed(0)}ms`);
  
  console.log('\n📂 By Category:');
  for (const [cat, stats] of Object.entries(by_category)) {
    console.log(`   ${cat}: ${stats.passed}/${stats.total} (${(stats.pass_rate * 100).toFixed(0)}%)`);
  }
  
  console.log('\n🎯 By Intent:');
  for (const [intent, stats] of Object.entries(by_intent)) {
    console.log(`   ${intent}: ${stats.passed}/${stats.total} (${(stats.pass_rate * 100).toFixed(0)}%)`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  // Determine overall status
  const meetsTarget = pass_rate >= 0.95;
  const status = meetsTarget ? '🎉 PASS - Meets 95% target!' : '⚠️  FAIL - Below 95% target';
  console.log(status);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  return report;
}

/**
 * Save report to file
 */
export function saveReport(report: EvalReport, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`📝 Report saved to: ${outputPath}`);
}

