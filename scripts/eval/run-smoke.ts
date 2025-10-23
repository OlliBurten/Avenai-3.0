/**
 * Smoke Test Harness - Exact + Structured Validation
 * Runs against deployed URL (not local) to reflect production quality
 */

import assert from 'node:assert/strict';

type TestCase = {
  id: string;
  question: string;
  intent: string;
  expect?: {
    exact?: string[];   // Must appear verbatim
    regex?: string[];   // Must match regex
    notContain?: string[]; // Must NOT appear (for hallucination detection)
  };
};

/**
 * Ask a question via the chat API
 */
async function ask(question: string): Promise<string> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const datasetId = process.env.DATASET_ID || 'cmh2vj3nd000c6whwghx40m36';
  
  console.log(`   🔍 Asking: "${question.substring(0, 80)}..."`);
  
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // Add session cookie if needed
      ...(process.env.SESSION_COOKIE ? { 'Cookie': process.env.SESSION_COOKIE } : {})
    },
    body: JSON.stringify({ 
      message: question, 
      datasetId 
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  // Handle streaming response
  const text = await response.text();
  
  // Extract answer from SSE stream
  const lines = text.split('\n').filter(line => line.startsWith('data: '));
  let fullAnswer = '';
  
  for (const line of lines) {
    const data = line.replace('data: ', '');
    if (!data.trim()) continue;
    
    try {
      const json = JSON.parse(data);
      if (json.content) {
        fullAnswer += json.content;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return fullAnswer || text;
}

/**
 * Score answer against expectations
 */
function score(answer: string, testCase: TestCase): {
  passed: boolean;
  details: {
    exact: { passed: boolean; missing: string[] };
    regex: { passed: boolean; failed: string[] };
    notContain: { passed: boolean; found: string[] };
  };
} {
  const details = {
    exact: { passed: true, missing: [] as string[] },
    regex: { passed: true, failed: [] as string[] },
    notContain: { passed: true, found: [] as string[] }
  };

  // Check exact strings
  if (testCase.expect?.exact) {
    for (const term of testCase.expect.exact) {
      if (!answer.includes(term)) {
        details.exact.passed = false;
        details.exact.missing.push(term);
      }
    }
  }

  // Check regex patterns
  if (testCase.expect?.regex) {
    for (const pattern of testCase.expect.regex) {
      if (!new RegExp(pattern, 'i').test(answer)) {
        details.regex.passed = false;
        details.regex.failed.push(pattern);
      }
    }
  }

  // Check NOT contain (hallucination detection)
  if (testCase.expect?.notContain) {
    for (const term of testCase.expect.notContain) {
      if (answer.includes(term)) {
        details.notContain.passed = false;
        details.notContain.found.push(term);
      }
    }
  }

  const passed = details.exact.passed && details.regex.passed && details.notContain.passed;

  return { passed, details };
}

/**
 * Main evaluation runner
 */
async function main() {
  console.log('🧪 Avenai Smoke Test Harness');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`📍 Base URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
  console.log(`📊 Dataset: ${process.env.DATASET_ID || 'eu-test-dataset'}\n`);

  const cases: TestCase[] = [
    // Auth & Headers (3 tests)
    {
      id: '1-auth-headers',
      intent: 'ONE_LINE',
      question: 'Which authentication headers are required for BankID Sweden?',
      expect: { 
        exact: ['Authorization: Bearer', 'Zs-Product-Key'],
        regex: ['```http']  // Should use code blocks
      }
    },
    {
      id: '2-header-difference',
      intent: 'ONE_LINE',
      question: "What's the difference between the Authorization header and Zs-Product-Key?",
      expect: {
        exact: ['Authorization', 'Zs-Product-Key'],
        regex: ['token|JWT', 'subscription|product']
      }
    },
    {
      id: '3-bearer-token',
      intent: 'WORKFLOW',
      question: 'How do I obtain a valid Bearer token?',
      expect: {
        exact: ['POST', 'token'],
        regex: ['oauth|connect/token', 'client_credentials|client_id']
      }
    },

    // Endpoints (4 tests)
    {
      id: '4-start-sweden',
      intent: 'ENDPOINT',
      question: "What's the endpoint and HTTP method for starting BankID authentication in Sweden?",
      expect: {
        exact: ['POST', '/bankidse/auth'],
        notContain: ['/bankidno/'] // Prevent Norway bleed
      }
    },
    {
      id: '5-sign-norway',
      intent: 'ENDPOINT',
      question: "What's the endpoint and HTTP method for starting BankID signing in Norway?",
      expect: {
        exact: ['POST', '/bankidno/sign'],
        notContain: ['/bankidse/'] // Prevent Sweden bleed
      }
    },
    {
      id: '6-collect-status',
      intent: 'ENDPOINT',
      question: 'Which endpoint do I call to poll the authentication status?',
      expect: {
        exact: ['GET', '/collect', 'orderRef'],
        regex: ['parameter|identifies']
      }
    },
    {
      id: '7-cancel-endpoint',
      intent: 'ENDPOINT',
      question: "When should I call the cancel endpoint, and what's its full path?",
      expect: {
        exact: ['POST', '/cancel'],
        regex: ['user|abort|close|before complete']
      }
    },

    // JSON & Payloads (2 tests)
    {
      id: '8-sign-json',
      intent: 'JSON',
      question: 'Show me the sample JSON body for a BankID sign request (verbatim).',
      expect: {
        exact: ['personal_number', 'userVisibleData', 'endUserIp'],
        regex: ['```json', '\\{[\\s\\S]*\\}'] // Should have JSON code block
      }
    },
    {
      id: '9-collect-response',
      intent: 'JSON',
      question: 'What fields are returned in the collect response?',
      expect: {
        exact: ['orderRef', 'status', 'completionData'],
        regex: ['ocspResponse|certificate']
      }
    },

    // Parameters (1 test)
    {
      id: '10-orderref-format',
      intent: 'ONE_LINE',
      question: "What's the format of the orderRef parameter?",
      expect: {
        exact: ['UUID'],
        regex: ['session|unique|identifier']
      }
    },

    // Error Codes (2 tests)
    {
      id: '11-already-in-progress',
      intent: 'ERROR_CODE',
      question: 'What does the ALREADY_IN_PROGRESS error mean?',
      expect: {
        exact: ['ALREADY_IN_PROGRESS'],
        regex: ['session|exists|same|personal number|wait|cancel']
      }
    },
    {
      id: '12-error-codes-list',
      intent: 'ERROR_CODE',
      question: 'List three common error codes from the BankID collect endpoint.',
      expect: {
        regex: ['ALREADY_IN_PROGRESS', 'TIMEOUT|timeout', 'CANCEL.*USER|USER_CANCEL']
      }
    },

    // Workflows (1 test)
    {
      id: '13-user-cancels',
      intent: 'WORKFLOW',
      question: 'What should I do if a user cancels authentication before it completes?',
      expect: {
        regex: ['CANCELLED_BY_USER', 'inform|notify', 'try again|retry', 'new.*orderRef']
      }
    },

    // SDK (2 tests)
    {
      id: '14-android-permissions',
      intent: 'ONE_LINE',
      question: 'Which Android permissions are required for the ID & Bio Verification SDK?',
      expect: {
        exact: ['CAMERA', 'INTERNET'],
        regex: ['permission|android']
      }
    },
    {
      id: '15-liveness-modes',
      intent: 'WORKFLOW',
      question: "How do I enable liveness detection in the SDK, and what's the difference between Passive and Active modes?",
      expect: {
        exact: ['Passive', 'Active'],
        regex: ['automatic|AI', 'interaction|blink|turn']
      }
    }
  ];

  console.log(`📝 Running ${cases.length} test cases...\n`);

  let passed = 0;
  const results: Array<{ id: string; passed: boolean; answer: string; failures: string[] }> = [];

  for (const testCase of cases) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 [${testCase.id}] ${testCase.intent}`);
    
    try {
      const answer = await ask(testCase.question);
      const { passed: casePassed, details } = score(answer, testCase);
      
      const failures: string[] = [];
      if (!details.exact.passed) {
        failures.push(`Missing exact: ${details.exact.missing.join(', ')}`);
      }
      if (!details.regex.passed) {
        failures.push(`Regex failed: ${details.regex.failed.join(', ')}`);
      }
      if (!details.notContain.passed) {
        failures.push(`Hallucination: ${details.notContain.found.join(', ')}`);
      }

      if (casePassed) {
        passed++;
        console.log(`   ✅ PASS`);
      } else {
        console.log(`   ❌ FAIL`);
        failures.forEach(f => console.log(`      ${f}`));
      }

      console.log(`   📝 Answer: ${answer.substring(0, 120).replace(/\n/g, ' ')}...`);

      results.push({
        id: testCase.id,
        passed: casePassed,
        answer: answer.substring(0, 500),
        failures
      });

    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({
        id: testCase.id,
        passed: false,
        answer: '',
        failures: [`API Error: ${error.message}`]
      });
    }
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 SMOKE TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passRate = passed / cases.length;
  console.log(`✅ Passed: ${passed}/${cases.length} (${(passRate * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${cases.length - passed}/${cases.length}\n`);

  // By intent
  const byIntent = new Map<string, { total: number; passed: number }>();
  for (const result of results) {
    const testCase = cases.find(c => c.id === result.id)!;
    const intent = testCase.intent;
    
    if (!byIntent.has(intent)) {
      byIntent.set(intent, { total: 0, passed: 0 });
    }
    
    const stats = byIntent.get(intent)!;
    stats.total++;
    if (result.passed) stats.passed++;
  }

  console.log('📂 By Intent:');
  for (const [intent, stats] of byIntent) {
    const rate = (stats.passed / stats.total * 100).toFixed(0);
    console.log(`   ${intent}: ${stats.passed}/${stats.total} (${rate}%)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');

  // Pass/fail determination
  const target = 0.95; // 95% target
  if (passRate >= target) {
    console.log(`🎉 PASS - Meets ${target * 100}% target!`);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log(`⚠️  FAIL - Below ${target * 100}% target (${(passRate * 100).toFixed(1)}%)`);
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.id}: ${r.failures.join('; ')}`);
    });
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

