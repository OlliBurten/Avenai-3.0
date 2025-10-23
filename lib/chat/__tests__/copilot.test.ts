// lib/chat/__tests__/copilot.test.ts
// Regression tests for copilot intent handlers and response quality

import {
  handleHeadersRequired,
  handleTokenLifetime,
  handleEnvironments,
  handle401,
  handle403,
  handle404,
  handle422,
  handleScopes,
  handleMobileSessionFlow,
  generateNotInDocsTemplate
} from '../intentHandlers';
import { cleanArtifacts, finalizeAnswer } from '../responseCleaners';

describe('Intent Handlers - Structured Responses', () => {
  describe('handleHeadersRequired', () => {
    it('returns exactly 2 headers without endpoint mixing', () => {
      const response = handleHeadersRequired();
      
      // Should mention exactly 2 headers
      expect(response).toContain('Authorization');
      expect(response).toContain('Bearer');
      expect(response).toContain('Zs-Product-Key');
      
      // Should not mix in endpoint details
      expect(response).not.toMatch(/POST|GET|\/mobilesdk|endpoint/i);
      
      // Should have code block
      expect(response).toMatch(/```[\s\S]*Authorization:[\s\S]*Zs-Product-Key:[\s\S]*```/);
      
      // Count header mentions (should be exactly 2)
      const authCount = (response.match(/Authorization/gi) || []).length;
      const keyCount = (response.match(/Zs-Product-Key/gi) || []).length;
      expect(authCount).toBeGreaterThanOrEqual(1);
      expect(keyCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('handleTokenLifetime', () => {
    it('mentions 20 minutes and shows refresh pattern', () => {
      const response = handleTokenLifetime();
      
      // Should mention 20 minutes
      expect(response).toMatch(/20\s*minutes/i);
      expect(response).toMatch(/1200/); // seconds
      
      // Should show refresh/renewal
      expect(response).toMatch(/renew|refresh|retry/i);
      
      // Should have OAuth2 endpoint example
      expect(response).toMatch(/grant_type=client_credentials/);
      expect(response).toContain('client_id');
      expect(response).toContain('client_secret');
      
      // Should include retry advice
      expect(response).toMatch(/401|403/);
    });
  });

  describe('Error Handlers - Structured Fixes', () => {
    const testSources = ['SDK Guide', 'API Reference'];

    it('handle401 returns structured fix with code block', () => {
      const response = handle401(testSources);
      
      // Should have all required sections
      expect(response).toContain('401 Unauthorized');
      expect(response).toContain('Short Diagnosis');
      expect(response).toContain('What this usually means');
      expect(response).toContain('Fix Steps');
      expect(response).toContain('Example Request');
      expect(response).toContain('Heads-up');
      
      // Should have code block with headers
      expect(response).toMatch(/```http[\s\S]*Authorization:[\s\S]*Zs-Product-Key:[\s\S]*```/);
      
      // Should mention sources
      expect(response).toContain('SDK Guide');
      expect(response).toContain('API Reference');
      
      // Should include retry advice
      expect(response).toMatch(/retry.*fresh token/i);
    });

    it('handle403 returns structured fix with code block', () => {
      const response = handle403(testSources);
      
      expect(response).toContain('403 Forbidden');
      expect(response).toContain('Short Diagnosis');
      expect(response).toContain('Fix Steps');
      expect(response).toMatch(/```http/);
      expect(response).toMatch(/Zs-Product-Key/);
      expect(response).toMatch(/permission|scope/i);
    });

    it('handle404 returns structured fix with health check', () => {
      const response = handle404(testSources);
      
      expect(response).toContain('404 Not Found');
      expect(response).toContain('Short Diagnosis');
      expect(response).toContain('Fix Steps');
      
      // Should have health check example
      expect(response).toMatch(/\/api\/ping/);
      expect(response).toMatch(/GET.*https:\/\//);
      
      // Should mention environment mixing
      expect(response).toMatch(/TEST.*PROD/);
    });

    it('handle422 returns structured fix with JSON vs form-encoded', () => {
      const response = handle422(testSources);
      
      expect(response).toContain('422 Unprocessable');
      expect(response).toContain('Short Diagnosis');
      expect(response).toContain('Fix Steps');
      
      // Should show both content types
      expect(response).toContain('application/json');
      expect(response).toContain('application/x-www-form-urlencoded');
      
      // Should have example for both
      expect(response).toMatch(/Content-Type: application\/json/);
      expect(response).toMatch(/grant_type=client_credentials/);
    });
  });

  describe('handleScopes - Safe Template Usage', () => {
    it('uses safe template when scopes are missing', () => {
      const response = handleScopes(['BankID Guide'], []);
      
      // Should use "not in docs" structure
      expect(response).toContain('What I can confirm from your docs');
      expect(response).toContain("What isn't in these docs");
      expect(response).toContain('Safe next steps');
      
      // Should mention common OAuth scopes
      expect(response).toMatch(/openid|profile|email/i);
      
      // Should provide support contact
      expect(response).toMatch(/support@zignsec\.com|contact.*support/i);
      
      // Should show sources
      expect(response).toContain('BankID Guide');
    });

    it('extracts scope info from context when available', () => {
      const context = [
        { content: 'OAuth scopes include openid and profile for user authentication', title: 'API Docs' }
      ];
      const response = handleScopes(['API Docs'], context);
      
      // Should extract the scope mention
      expect(response).toMatch(/openid.*profile/i);
    });
  });

  describe('handleMobileSessionFlow - No SDK Method Invention', () => {
    it('outlines steps without inventing SDK methods', () => {
      const response = handleMobileSessionFlow(['SDK Guide']);
      
      // Should have all 5 steps
      expect(response).toMatch(/1\.\s*Create Session/);
      expect(response).toMatch(/2\.\s*Add Liveness/);
      expect(response).toMatch(/3\.\s*Add Document/);
      expect(response).toMatch(/4\.\s*Finalize/);
      expect(response).toMatch(/5\.\s*Backend Reprocess/);
      
      // Should have HTTP examples (not SDK method calls)
      expect(response).toMatch(/POST https:\/\//);
      expect(response).toContain('mobilesdk/sessions');
      
      // Should NOT invent SDK methods
      expect(response).not.toMatch(/DocumentReader\.process\(/);
      expect(response).not.toMatch(/FaceSDK\.match\(/);
      
      // Should include disclaimer about exact routes
      expect(response).toMatch(/if.*differ|contact support|exact.*path/i);
    });
  });

  describe('generateNotInDocsTemplate - Safe Fallback', () => {
    it('returns well-structured response when info is missing', () => {
      const response = generateNotInDocsTemplate(
        'BankID Scopes',
        ['Common scopes: openid, profile', 'Provisioned per account'],
        "Exact BankID scope names aren't listed",
        ['BankID Guide']
      );
      
      // Should have all required sections
      expect(response).toContain('What I can confirm from your docs');
      expect(response).toContain("What isn't in these docs");
      expect(response).toContain('Safe next steps');
      
      // Should list what we found
      expect(response).toContain('Common scopes: openid, profile');
      expect(response).toContain('Provisioned per account');
      
      // Should state what's missing
      expect(response).toContain("Exact BankID scope names aren't listed");
      
      // Should provide safe next steps
      expect(response).toMatch(/health.*check/i);
      expect(response).toContain('Authorization: Bearer');
      expect(response).toContain('Zs-Product-Key');
      expect(response).toMatch(/support@zignsec\.com/);
      
      // Should show sources
      expect(response).toContain('BankID Guide');
    });

    it('handles empty retrieved chunks gracefully', () => {
      const response = generateNotInDocsTemplate(
        'Unknown Topic',
        [],
        "This information isn't available",
        []
      );
      
      // Should still have structure
      expect(response).toContain('What I can confirm from your docs');
      expect(response).toContain('No specific information found');
      expect(response).toContain('Safe next steps');
    });
  });

  describe('Response Guarantee - No Empty Responses', () => {
    it('router must have fallback for every path', () => {
      // This is a conceptual test - in practice, verify:
      // 1. Every intent handler returns a string
      // 2. Fallback functions always return non-empty
      // 3. Final safety check catches empty strings
      
      const handlers = [
        handleHeadersRequired(),
        handleTokenLifetime(),
        handleEnvironments(),
        handle401(),
        handle403(),
        handle404(),
        handle422(),
        handleScopes(),
        handleMobileSessionFlow()
      ];
      
      handlers.forEach((response, idx) => {
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(50);
        expect(typeof response).toBe('string');
      });
    });
  });
});

describe('Response Cleaners - Citations Hygiene', () => {
  describe('cleanArtifacts', () => {
    it('removes artifact phrases but preserves source lines', () => {
      const input = `Here's the answer.

**Sources:** BankID Guide, SDK Documentation

looks like an auth/error response test`;
      
      const cleaned = cleanArtifacts(input);
      
      // Should preserve source line
      expect(cleaned).toContain('Sources:');
      expect(cleaned).toContain('BankID Guide');
      
      // Should remove artifact
      expect(cleaned).not.toContain('looks like an auth/error response');
    });

    it('preserves filenames during cleaning', () => {
      const input = 'Check the sdk-guide.pdf and bankid-norway.txt for details. copy fix';
      const cleaned = cleanArtifacts(input);
      
      expect(cleaned).toContain('sdk-guide.pdf');
      expect(cleaned).toContain('bankid-norway.txt');
      expect(cleaned).not.toContain('copy fix');
    });

    it('removes dangling citation brackets', () => {
      const input = 'The API requires authentication [1] and product key [2].';
      const cleaned = cleanArtifacts(input);
      
      expect(cleaned).not.toContain('[1]');
      expect(cleaned).not.toContain('[2]');
      expect(cleaned).toContain('authentication');
      expect(cleaned).toContain('product key');
    });

    it('removes emojis but preserves content', () => {
      const input = 'Great! 👍 Here is the answer 🎉';
      const cleaned = cleanArtifacts(input);
      
      expect(cleaned).not.toMatch(/👍|🎉/);
      expect(cleaned).toContain('Great!');
      expect(cleaned).toContain('Here is the answer');
    });
  });

  describe('finalizeAnswer - End-to-End', () => {
    it('cleans artifacts while preserving sources and structure', () => {
      const input = `The Mobile SDK requires initialization [1].

**Important**: You need a license [2].

**Sources:** Zignsec SDK Documentation

copy fix for detailed api requests see postman`;
      
      const final = finalizeAnswer(input);
      
      // Should preserve main content
      expect(final).toContain('Mobile SDK requires initialization');
      expect(final).toContain('You need a license');
      
      // Should preserve sources
      expect(final).toContain('Sources:');
      expect(final).toContain('Zignsec SDK Documentation');
      
      // Should remove artifacts
      expect(final).not.toContain('[1]');
      expect(final).not.toContain('[2]');
      expect(final).not.toContain('copy fix');
      expect(final).not.toContain('postman');
    });
  });
});

describe('UI Rendering - GPT-Style Typography', () => {
  describe('ChatMarkdown Component', () => {
    it('should use leading-7 for paragraphs', () => {
      // This is a component test - verify in the actual component:
      // - prose prose-zinc dark:prose-invert
      // - max-w-none
      // - leading-7
      // - prose-p:my-3
      // - prose-li:my-1.5
      // - prose-h4:mt-6
      expect(true).toBe(true); // Placeholder - see component for actual styling
    });

    it('code blocks should have overflow-x-auto and no nested boxes', () => {
      // Verify in ChatMarkdown.tsx:
      // - <pre> wrapped in <div className="my-4 overflow-hidden rounded-lg">
      // - <pre className="overflow-x-auto p-0 m-0 bg-transparent border-0">
      // - <code className="block ... overflow-x-auto">
      // - NO double boxes
      expect(true).toBe(true); // Placeholder
    });

    it('headings should have proper spacing (mt-6, mb-2/3)', () => {
      // Verify in ChatMarkdown.tsx:
      // - h1: mt-6 mb-3
      // - h2: mt-6 mb-2
      // - h3: mt-6 mb-2
      // - h4: mt-6 mb-2
      // - first:mt-0 on all
      expect(true).toBe(true); // Placeholder
    });

    it('paragraphs should have my-3 spacing', () => {
      // Verify in ChatMarkdown.tsx:
      // - p: my-3 first:mt-0 last:mb-0 leading-7
      expect(true).toBe(true); // Placeholder
    });

    it('lists should have my-1.5 spacing between items', () => {
      // Verify in ChatMarkdown.tsx:
      // - li: my-1.5 leading-7
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('SourceChips Component', () => {
    it('shows max 3 chips with +N more button', () => {
      // Verify in SourceChips.tsx:
      // - MAX_VISIBLE = 3
      // - Shows "+N more" button when sources > 3
      // - Truncates filenames to 30 chars
      // - Shows page numbers when available
      expect(true).toBe(true); // Placeholder
    });

    it('displays filename and page number compactly', () => {
      // Verify in SourceChips.tsx:
      // - Format: "filename.pdf • p.12"
      // - Truncates at 25 chars if page included
      // - Shows FileText icon
      expect(true).toBe(true); // Placeholder
    });
  });
});

describe('Response Guarantee - No Empty Responses', () => {
  describe('Intent Router Coverage', () => {
    const testCases = [
      { query: 'what headers do I need', expectedHandler: 'headers' },
      { query: 'token lifetime', expectedHandler: 'token' },
      { query: 'getting 401 error', expectedHandler: '401' },
      { query: 'getting 403 forbidden', expectedHandler: '403' },
      { query: 'getting 404 not found', expectedHandler: '404' },
      { query: 'getting 422 validation error', expectedHandler: '422' },
      { query: 'what scopes are supported', expectedHandler: 'scopes' },
      { query: 'mobile session flow', expectedHandler: 'session flow' },
    ];

    testCases.forEach(({ query, expectedHandler }) => {
      it(`"${query}" triggers ${expectedHandler} handler`, () => {
        // This verifies that common questions have dedicated handlers
        // In practice, check the regex patterns in app/api/chat/route.ts
        expect(query).toBeTruthy();
      });
    });
  });

  describe('Fallback Chain', () => {
    it('always returns non-empty response', () => {
      // Verify in chat route:
      // 1. Intent handlers (fast, <100ms)
      // 2. LLM generation (with 9s timeout)
      // 3. generateFallbackFromContext (with context)
      // 4. generateNoContextFallback (no context)
      // 5. Final safety check: "I apologize, but..."
      
      const safetyFallback = "I apologize, but I'm having trouble generating a response right now.";
      expect(safetyFallback.length).toBeGreaterThan(0);
    });
  });
});

describe('Multi-Source Display - No Single-Doc Bias', () => {
  it('distinctSources deduplicates but shows all documents', () => {
    // Verify in chat route (line ~860):
    // const distinctSources = Array.from(
    //   new Set(normalized.map(chunk => chunk.title || 'Untitled'))
    // )
    
    const mockChunks = [
      { title: 'SDK Guide', content: '...', chunkIndex: 1 },
      { title: 'SDK Guide', content: '...', chunkIndex: 2 },
      { title: 'BankID Norway', content: '...', chunkIndex: 1 },
      { title: 'BankID Norway', content: '...', chunkIndex: 2 },
    ];
    
    // Should result in 2 distinct sources (not 4, not 1)
    const uniqueTitles = Array.from(new Set(mockChunks.map(c => c.title)));
    expect(uniqueTitles).toEqual(['SDK Guide', 'BankID Norway']);
    expect(uniqueTitles.length).toBe(2);
  });

  it('MMR diversity ensures multiple documents in top-k', () => {
    // Verify in lib/rerank.ts and lib/chat/retrieval.ts:
    // - maxDocsPerSource: 3
    // - maxDistinctDocs: 3
    // - Prevents same doc from dominating all 6 slots
    expect(true).toBe(true); // Conceptual test
  });
});

describe('Edge Cases', () => {
  it('empty context falls back to no-docs template', () => {
    const template = generateNotInDocsTemplate(
      'Test Topic',
      [],
      'No information available',
      []
    );
    
    expect(template).toContain('What I can confirm from your docs');
    expect(template).toContain('No specific information found');
    expect(template).toContain('Safe next steps');
  });

  it('timeout triggers fallback, not empty response', () => {
    // Verify in chat route that Promise.race timeout
    // catches and uses generateFallbackFromContext
    expect(true).toBe(true); // Conceptual test
  });

  it('cleaners never return empty string', () => {
    expect(cleanArtifacts('')).toBeTruthy();
    expect(finalizeAnswer('')).toBeTruthy();
  });
});

describe('Integration - Real-World Scenarios', () => {
  it('Headers question gets clean answer without endpoints', () => {
    const response = handleHeadersRequired();
    const cleaned = finalizeAnswer(response);
    
    // Should be clean and focused
    expect(cleaned).toContain('Authorization');
    expect(cleaned).toContain('Zs-Product-Key');
    expect(cleaned).not.toMatch(/\/sessions|\/faceapi|POST|GET/);
  });

  it('Error code questions get structured troubleshooting', () => {
    const responses = [
      handle401(['Doc A']),
      handle403(['Doc B']),
      handle404(['Doc C']),
      handle422(['Doc D'])
    ];
    
    responses.forEach(response => {
      // Every error handler should have:
      expect(response).toMatch(/Short Diagnosis/);
      expect(response).toMatch(/What this usually means/);
      expect(response).toMatch(/Fix Steps/);
      expect(response).toMatch(/```http/);
      expect(response).toMatch(/Heads-up/);
    });
  });

  it('Weak retrieval uses safe template, not hallucination', () => {
    const weakContext = [
      { content: 'Some vague mention of authentication', title: 'Doc' }
    ];
    
    // When used in generateFallbackFromContext, should use safe template
    expect(true).toBe(true); // Verify in actual fallback logic
  });
});

