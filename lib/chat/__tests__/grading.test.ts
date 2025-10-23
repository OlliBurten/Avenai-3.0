// lib/chat/__tests__/grading.test.ts
// Unit tests for key identity-verification topics

import { 
  handleHeadersRequired, 
  handleTokenLifetime, 
  handleScenarioDefinitions, 
  handleSdkInit,
  handleCreateSession,
  handleAddTransactions,
  handleLivenessDetection,
  handleErrorCodes
} from '../intentHandlers';
import { finalizeAnswer, cleanArtifacts, normalizePdfText, addCompactCitation } from '../responseCleaners';
import { generateEndpointResponse, filterEndpointsToBrand } from '../answerGenerators';

describe('Identity Verification Answer Quality', () => {
  
  test('Headers answer must contain exactly two headers, no endpoints, no emoji', () => {
    const response = handleHeadersRequired();
    
    expect(response).toContain('Authorization');
    expect(response).toContain('Zs-Product-Key');
    expect(response).toContain('Bearer <access_token>');
    expect(response).toContain('subscription/product key');
    // Should not contain endpoints
    expect(response).not.toContain('https://');
    expect(response).not.toContain('/mobilesdk/');
    // Should not contain emojis
    expect(response).not.toMatch(/[\u{1F600}-\u{1F64F}]/u);
  });
  
  test('Token lifetime must mention 20 minutes and token refresh with correct example', () => {
    const response = handleTokenLifetime();
    
    expect(response).toContain('20 minutes');
    expect(response).toContain('expires_in: 1200');
    expect(response).toContain('OAuth2 client-credentials');
    expect(response).toContain('test-gateway.zignsec.com');
    expect(response).toContain('grant_type=client_credentials');
    expect(response).toContain('401/403');
  });
  
  test('FullProcess vs FullAuth must be clean, no PDF noise', () => {
    const response = handleScenarioDefinitions();
    
    expect(response).toContain('FullProcess');
    expect(response).toContain('FullAuth');
    expect(response).toContain('authentication checks');
    expect(response).toContain('security features/holograms');
    // Should not contain PDF artifacts
    expect(response).not.toContain('uracy');
    expect(response).not.toContain('authenti-');
    expect(response).not.toContain('-\n');
  });
  
  test('Initialize DocumentReader must mention license', () => {
    const response = handleSdkInit();
    
    expect(response).toContain('DocumentReader');
    expect(response).toContain('license required');
    expect(response).toContain('YOUR_LICENSE_KEY');
    expect(response).toContain('FaceSDK');
    expect(response).toContain('Core Basic');
    expect(response).toContain('no license param');
  });
  
  test('Create session handler returns HTTP-only endpoints', () => {
    const response = handleCreateSession();
    
    expect(response).toContain('POST https://test-gateway.zignsec.com/mobilesdk/sessions');
    expect(response).toContain('Zs-Product-Key');
    expect(response).toContain('Authorization: Bearer');
    expect(response).toContain('sessionId');
    // Should not contain invented client methods
    expect(response).not.toContain('DocumentReaderApi');
    expect(response).not.toContain('.reprocessTransaction');
  });
  
  test('Add transactions handler returns HTTP-only endpoints', () => {
    const response = handleAddTransactions();
    
    expect(response).toContain('POST https://test-gateway.zignsec.com/mobilesdk/sessions');
    expect(response).toContain('liveness/transactions');
    expect(response).toContain('204 No Content');
    // Should not contain invented client methods
    expect(response).not.toContain('DocumentReaderApi');
    expect(response).not.toContain('.reprocessTransaction');
  });
  
  test('finalizeAnswer removes Copy fix and auth/error response artifacts', () => {
    const dirtyResponse = 'Some content here. Looks like an auth/error response — here\'s the corrected request Copy fix More content.';
    const clean = finalizeAnswer(dirtyResponse);
    
    expect(clean).not.toContain('Copy fix');
    expect(clean).not.toContain('Looks like an auth/error response');
    expect(clean).toContain('Some content here');
    expect(clean).toContain('_Source: API Documentation_');
  });
  
  test('normalizePdfText fixes hyphenated line breaks', () => {
    const hyphenatedText = 'authenti-\ncation and verifi-\ncation';
    const normalized = normalizePdfText(hyphenatedText);
    
    expect(normalized).toContain('authentication');
    expect(normalized).toContain('verification');
    expect(normalized).not.toContain('authenti-\n');
    expect(normalized).not.toContain('verifi-\n');
  });
  
  test('cleanArtifacts removes dangling citations', () => {
    const textWithCitations = 'Some content [1], [2], [3] and more text';
    const cleaned = cleanArtifacts(textWithCitations);
    
    expect(cleaned).toContain('Some content');
    expect(cleaned).toContain('more text');
    expect(cleaned).not.toContain('[1]');
    expect(cleaned).not.toContain('[2]');
    expect(cleaned).not.toContain('[3]');
  });
  
  test('filterEndpointsToBrand only returns API endpoints', () => {
    const mixedText = 'https://test-gateway.zignsec.com/mobilesdk/sessions and https://regulaforensics.com/docs and /mobilesdk/faceapi';
    const filtered = filterEndpointsToBrand(mixedText, 'zignsec');
    
    expect(filtered).toContain('https://test-gateway.zignsec.com/mobilesdk/sessions');
    expect(filtered).toContain('/mobilesdk/faceapi');
    expect(filtered).not.toContain('regulaforensics.com');
  });
  
  test('Endpoint response handles missing endpoints gracefully', () => {
    const emptyContext = '';
    const response = generateEndpointResponse(emptyContext, 'zignsec');
    
    expect(response).toContain('This document does not list specific API endpoints for this topic');
  });
  
  test('No emojis in any handler responses', () => {
    const responses = [
      handleHeadersRequired(),
      handleTokenLifetime(),
      handleScenarioDefinitions(),
      handleSdkInit(),
      handleCreateSession(),
      handleAddTransactions()
    ];
    
    responses.forEach(response => {
      // Check for common emojis using Unicode ranges
      expect(response).not.toMatch(/[\u{1F600}-\u{1F64F}]/u); // Emoticons
      expect(response).not.toMatch(/[\u{1F300}-\u{1F5FF}]/u); // Misc Symbols
      expect(response).not.toMatch(/[\u{2600}-\u{26FF}]/u);   // Misc symbols
    });
  });
  
  test('Enterprise tone - no casual language', () => {
    const responses = [
      handleHeadersRequired(),
      handleTokenLifetime(),
      handleScenarioDefinitions(),
      handleSdkInit(),
      handleCreateSession(),
      handleAddTransactions(),
      handleLivenessDetection(),
      handleErrorCodes()
    ];
    
    responses.forEach(response => {
      expect(response).not.toContain('Hey there');
      expect(response).not.toContain('😊');
      expect(response).not.toContain('awesome');
      expect(response).not.toContain('cool');
      expect(response).not.toContain('Hey!');
    });
  });
  
  test('Liveness detection handler provides clear UX vs security trade-offs', () => {
    const response = handleLivenessDetection();
    
    expect(response).toContain('Passive');
    expect(response).toContain('Active');
    expect(response).toContain('Seamless user experience');
    expect(response).toContain('Higher security assurance');
    expect(response).toContain('Single selfie');
    expect(response).toContain('Guided motion');
  });
  
  test('Error codes handler includes header reminder and specific fixes', () => {
    const response = handleErrorCodes();
    
    expect(response).toContain('401 Unauthorized');
    expect(response).toContain('403 Forbidden');
    expect(response).toContain('422 Validation Error');
    expect(response).toContain('Required headers reminder');
    expect(response).toContain('Authorization: Bearer');
    expect(response).toContain('Zs-Product-Key');
    expect(response).toContain('OAuth2 client-credentials flow');
  });
  
  test('Duplicate text cleanup removes repeated headers and lines', () => {
    const textWithDuplicates = `Feature Details:
Some content here
Feature Details:
More content
Feature Details:
Final content`;
    
    const normalized = normalizePdfText(textWithDuplicates);
    
    // Should preserve content and handle duplicates
    expect(normalized).toContain('Some content here');
    expect(normalized).toContain('More content');
    expect(normalized).toContain('Final content');
    expect(normalized).toContain('Feature Details:');
  });
  
  test('Header isolation prevents endpoint mixing in header responses', () => {
    const headerResponse = handleHeadersRequired();
    
    // Should contain headers
    expect(headerResponse).toContain('Authorization');
    expect(headerResponse).toContain('Zs-Product-Key');
    
    // Should NOT contain endpoints
    expect(headerResponse).not.toContain('https://');
    expect(headerResponse).not.toContain('/mobilesdk/');
    expect(headerResponse).not.toContain('gateway.zignsec.com');
    expect(headerResponse).not.toContain('Documented API Endpoints');
  });
  
  test('Compact citation replaces placeholder tokens with source reference', () => {
    const textWithCitations = 'Some content [1] and more [2, 3] with citations';
    const withCitation = addCompactCitation(textWithCitations);
    
    expect(withCitation).not.toContain('[1]');
    expect(withCitation).not.toContain('[2, 3]');
    expect(withCitation).toContain('_Source: API Documentation_');
    expect(withCitation).toContain('Some content and more with citations');
    expect(withCitation).not.toContain('  '); // No double spaces
  });
});
