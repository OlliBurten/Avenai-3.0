/**
 * Golden Eval Runner
 * Runs all 15 technical questions from golden-set-v2.jsonl
 * Exact + Structured scoring with detailed reporting
 */

import * as fs from 'fs';
import * as path from 'path';

type GoldenQuestion = {
  id: string;
  query: string;
  intent: string;
  expected_exact?: string[];
  expected_keywords?: string[];
  expected_structured?: any;
  category: string;
};

type EvalResult = {
  id: string;
  query: string;
  intent: string;
  category: string;
  answer: string;
  scores: {
    exact: number;
    keyword: number;
    structured: number;
    overall: number;
  };
  passed: boolean;
  failures: string[];
  duration_ms: number;
};

/**
 * Ask via chat API
 */
async function ask(question: string): Promise<string> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const datasetId = process.env.DATASET_ID || 'eu-test-dataset';
  
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(process.env.SESSION_COOKIE ? { 'Cookie': process.env.SESSION_COOKIE } : {})
    },
    body: JSON.stringify({ message: question, datasetId })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const text = await response.text();
  
  // Extract from SSE stream
  const lines = text.split('\n').filter(line => line.startsWith('data: '));
  let fullAnswer = '';
  
  for (const line of lines) {
    const data = line.replace('data: ', '');
    if (!data.trim()) continue;
    
    try {
      const json = JSON.parse(data);
      if (json.content) fullAnswer += json.content;
    } catch {}
  }

  return fullAnswer || text;
}

/**
 * Score exact matches
 */
function scoreExact(answer: string, expected?: string[]): { score: number; missing: string[] } {
  if (!expected || expected.length === 0) return { score: 1, missing: [] };
  
  const missing: string[] = [];
  let found = 0;
  
  for (const term of expected) {
    if (answer.includes(term)) {
      found++;
    } else {
      missing.push(term);
    }
  }
  
  return { score: found / expected.length, missing };
}

/**
 * Score keywords
 */
function scoreKeywords(answer: string, keywords?: string[]): { score: number; missing: string[] } {
  if (!keywords || keywords.length === 0) return { score: 1, missing: [] };
  
  const answerLower = answer.toLowerCase();
  const missing: string[] = [];
  let found = 0;
  
  for (const keyword of keywords) {
    if (answerLower.includes(keyword.toLowerCase())) {
      found++;
    } else {
      missing.push(keyword);
    }
  }
  
  return { score: found / keywords.length, missing };
}

/**
 * Score structured expectations
 */
function scoreStructured(answer: string, expected?: any): { score: number; passed: boolean; reason?: string } {
  if (!expected) return { score: 1, passed: true };
  
  const type = expected.type;
  
  switch (type) {
    case 'headers': {
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
      const { method, path, path_contains } = expected;
      const methodFound = !method || answer.includes(method);
      const pathFound = !path || answer.includes(path);
      const pathContainsFound = !path_contains || answer.includes(path_contains);
      
      const checks = [methodFound, pathFound, pathContainsFound];
      const passed = checks.every(c => c);
      
      return {
        score: checks.filter(c => c).length / checks.length,
        passed,
        reason: passed ? undefined : 'Missing endpoint details'
      };
    }
    
    default:
      return { score: 1, passed: true };
  }
}

/**
 * Evaluate single question
 */
async function evaluateQuestion(question: GoldenQuestion): Promise<EvalResult> {
  const startTime = Date.now();
  
  const answer = await ask(question.query);
  const duration_ms = Date.now() - startTime;
  
  // Score all aspects
  const exactResult = scoreExact(answer, question.expected_exact);
  const keywordResult = scoreKeywords(answer, question.expected_keywords);
  const structuredResult = scoreStructured(answer, question.expected_structured);
  
  // Weighted overall
  const overall = 
    exactResult.score * 0.5 +
    keywordResult.score * 0.3 +
    structuredResult.score * 0.2;
  
  // Pass criteria
  const passed = question.expected_exact?.length > 0
    ? exactResult.score === 1.0  // 100% exact required
    : overall >= 0.9;             // 90% overall
  
  const failures: string[] = [];
  if (exactResult.missing.length > 0) {
    failures.push(`Missing exact: ${exactResult.missing.join(', ')}`);
  }
  if (keywordResult.missing.length > 0 && keywordResult.score < 0.7) {
    failures.push(`Missing keywords: ${keywordResult.missing.join(', ')}`);
  }
  if (!structuredResult.passed && structuredResult.reason) {
    failures.push(structuredResult.reason);
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
      overall
    },
    passed,
    failures,
    duration_ms
  };
}

/**
 * Main runner
 */
async function main() {
  console.log('🏆 Avenai Golden Evaluation - Phase 4');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📍 Base URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
  console.log(`📊 Dataset: ${process.env.DATASET_ID || 'eu-test-dataset'}\n`);

  // Load golden set
  const goldenSetPath = path.join(process.cwd(), 'eval', 'golden-set-v2.jsonl');
  const questions: GoldenQuestion[] = fs.readFileSync(goldenSetPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  console.log(`📝 Loaded ${questions.length} questions\n`);

  // Run evaluation
  const results: EvalResult[] = [];
  
  for (const question of questions) {
    console.log(`\n🔍 [${question.id}] ${question.query}`);
    
    const result = await evaluateQuestion(question);
    results.push(result);
    
    const emoji = result.passed ? '✅' : '❌';
    console.log(`   ${emoji} Overall: ${(result.scores.overall * 100).toFixed(0)}% (${result.duration_ms}ms)`);
    console.log(`      Exact: ${(result.scores.exact * 100).toFixed(0)}%, Keyword: ${(result.scores.keyword * 100).toFixed(0)}%, Structured: ${(result.scores.structured * 100).toFixed(0)}%`);
    
    if (!result.passed) {
      result.failures.forEach(f => console.log(`      ⚠️  ${f}`));
    }
  }

  // Calculate statistics
  const passedCount = results.filter(r => r.passed).length;
  const passRate = passedCount / results.length;
  
  // By category
  const byCategory = new Map<string, { total: number; passed: number }>();
  for (const result of results) {
    if (!byCategory.has(result.category)) {
      byCategory.set(result.category, { total: 0, passed: 0 });
    }
    const stats = byCategory.get(result.category)!;
    stats.total++;
    if (result.passed) stats.passed++;
  }

  // By intent
  const byIntent = new Map<string, { total: number; passed: number }>();
  for (const result of results) {
    if (!byIntent.has(result.intent)) {
      byIntent.set(result.intent, { total: 0, passed: 0 });
    }
    const stats = byIntent.get(result.intent)!;
    stats.total++;
    if (result.passed) stats.passed++;
  }

  // Print summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 GOLDEN EVALUATION REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Passed: ${passedCount}/${results.length} (${(passRate * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${results.length - passedCount}/${results.length}\n`);

  console.log('📈 Score Breakdown:');
  const avgExact = results.reduce((sum, r) => sum + r.scores.exact, 0) / results.length;
  const avgKeyword = results.reduce((sum, r) => sum + r.scores.keyword, 0) / results.length;
  const avgStructured = results.reduce((sum, r) => sum + r.scores.structured, 0) / results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
  
  console.log(`   Exact Matches: ${(avgExact * 100).toFixed(1)}%`);
  console.log(`   Keywords: ${(avgKeyword * 100).toFixed(1)}%`);
  console.log(`   Structured: ${(avgStructured * 100).toFixed(1)}%\n`);

  console.log('⏱️  Performance:');
  console.log(`   Avg Duration: ${avgDuration.toFixed(0)}ms\n`);

  console.log('📂 By Category:');
  for (const [cat, stats] of byCategory) {
    const rate = (stats.passed / stats.total * 100).toFixed(0);
    console.log(`   ${cat}: ${stats.passed}/${stats.total} (${rate}%)`);
  }

  console.log('\n🎯 By Intent:');
  for (const [intent, stats] of byIntent) {
    const rate = (stats.passed / stats.total * 100).toFixed(0);
    console.log(`   ${intent}: ${stats.passed}/${stats.total} (${rate}%)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');

  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(process.cwd(), 'eval', 'reports', `golden-eval-${timestamp}.json`);
  
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    pass_rate: passRate,
    by_category: Object.fromEntries(byCategory),
    by_intent: Object.fromEntries(byIntent),
    results,
    summary: {
      avg_exact_score: avgExact,
      avg_keyword_score: avgKeyword,
      avg_structured_score: avgStructured,
      avg_duration_ms: avgDuration
    }
  }, null, 2));
  
  console.log(`📝 Report saved to: ${reportPath}`);

  // Exit with status
  if (passRate >= 0.95) {
    console.log('🎉 PASS - Meets 95% target!');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log(`⚠️  FAIL - Below 95% target`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

