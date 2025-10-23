// scripts/smoke.ts
// Automated smoke test harness for Copilot accuracy

const DATASET_ID = process.env.TEST_DATASET_ID || 'cmgrhya8z0001ynm3zr7n69xl';
const API_URL = process.env.API_URL || 'http://localhost:3001';

interface TestCase {
  id: string;
  query: string;
  expect: RegExp;
  mustHave?: string[];
  mustNotHave?: string[];
  description: string;
}

const tests: TestCase[] = [
  {
    id: 'Q3',
    query: 'What is the contact email for G2RS?',
    expect: /clientservices@g2risksolutions\.com/i,
    description: 'Contact email retrieval from footer'
  },
  {
    id: 'Q11',
    query: 'Give me three Terminated reasons with their IDs and labels from the sample',
    expect: /"?reasonId"?\s*:\s*(26|27|31|131|132|133)/i,
    mustHave: ['27', '131', '133'],
    description: 'Terminated reason IDs verbatim'
  },
  {
    id: 'Q12',
    query: 'Provide the exact JSON request body to approve a merchant with correct field casing',
    expect: /"destinationMerchantGroupId"\s*:\s*6000001/i,
    mustHave: ['reasonId', 'actionId', 'destinationMerchantGroupId'],
    description: 'APPROVED JSON payload verbatim'
  },
  {
    id: 'Q_WORKFLOW',
    query: 'Explain the async polling cadence after multi-component POST',
    expect: /(60-?90|60 to 90)\s*seconds/i,
    mustHave: ['5 minutes', '25 minutes'],
    description: 'Workflow timing details'
  }
];

async function ask(query: string): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/api/chat?datasetId=${DATASET_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed:`, error);
    return { response: '', error: error instanceof Error ? error.message : String(error) };
  }
}

async function runTests() {
  console.log('🧪 Running Copilot Smoke Tests');
  console.log('=' .repeat(60));
  console.log('');
  
  let passed = 0;
  let failed = 0;
  const results: { id: string; pass: boolean; reason?: string }[] = [];
  
  for (const test of tests) {
    console.log(`\n📝 ${test.id}: ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    
    const answer = await ask(test.query);
    const responseText = answer.response || answer.content || '';
    
    // Check main regex
    const regexPass = test.expect.test(responseText);
    
    // Check must-have strings
    let mustHavePass = true;
    if (test.mustHave) {
      for (const required of test.mustHave) {
        if (!responseText.includes(required)) {
          mustHavePass = false;
          console.log(`   ❌ Missing required: "${required}"`);
        }
      }
    }
    
    // Check must-not-have strings
    let mustNotHavePass = true;
    if (test.mustNotHave) {
      for (const forbidden of test.mustNotHave) {
        if (responseText.includes(forbidden)) {
          mustNotHavePass = false;
          console.log(`   ❌ Contains forbidden: "${forbidden}"`);
        }
      }
    }
    
    const testPass = regexPass && mustHavePass && mustNotHavePass;
    
    if (testPass) {
      console.log(`   ✅ PASS`);
      passed++;
    } else {
      console.log(`   ❌ FAIL`);
      console.log(`   Response preview: ${responseText.substring(0, 300)}...`);
      failed++;
    }
    
    results.push({
      id: test.id,
      pass: testPass,
      reason: !regexPass ? 'regex_mismatch' : !mustHavePass ? 'missing_required' : !mustNotHavePass ? 'contains_forbidden' : undefined
    });
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log(`\n📊 Results: ${passed}/${tests.length} passed`);
  console.log('');
  
  results.forEach(r => {
    console.log(`${r.pass ? '✅' : '❌'} ${r.id}${r.reason ? ` (${r.reason})` : ''}`);
  });
  
  console.log('');
  
  if (passed === tests.length) {
    console.log('🎉 All tests passed! Copilot is MVP-ready.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

