// Intelligent Code Generation System for Avenai
// Provides context-aware code examples with syntax highlighting

export interface CodeExample {
  language: string
  code: string
  explanation: string
  dependencies?: string[]
  testCommand?: string
}

export interface CodeGenerationContext {
  apiType: 'bankid-norway' | 'jobs-api' | 'generic'
  operation: 'authentication' | 'request' | 'error-handling' | 'webhook' | 'testing'
  language: 'javascript' | 'python' | 'curl' | 'typescript'
  framework?: 'react' | 'vue' | 'angular' | 'node' | 'express'
}

export class CodeGenerator {
  private static instance: CodeGenerator
  private codeTemplates: Map<string, CodeExample[]>

  constructor() {
    this.codeTemplates = new Map()
    this.initializeTemplates()
  }

  static getInstance(): CodeGenerator {
    if (!CodeGenerator.instance) {
      CodeGenerator.instance = new CodeGenerator()
    }
    return CodeGenerator.instance
  }

  private initializeTemplates() {
    // BankID Norway Templates
    this.codeTemplates.set('bankid-norway-auth-js', [
      {
        language: 'javascript',
        code: `// BankID Norway Authentication
const authenticateUser = async (apiKey) => {
  try {
    const response = await fetch('https://demo.avenai.dev/api/v1/bankidno/auth', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        login_hint: 'nnin',
        redirect_uri: 'https://your-app.com/callback',
        scopes: ['openid', 'profile']
      })
    });

    if (!response.ok) {
      throw new Error('Authentication failed: ' + response.status);
    }

    const data = await response.json();
    return {
      sessionId: data.session_id,
      redirectUrl: data.redirect_url
    };
  } catch (error) {
    console.error('BankID authentication error:', error);
    throw error;
  }
};

// Usage
const apiKey = 'your-api-key';
authenticateUser(apiKey)
  .then(result => {
    console.log('Session ID:', result.sessionId);
    if (typeof window !== 'undefined') {
      window.location.href = result.redirectUrl;
    }
  })
  .catch(error => {
    console.error('Authentication failed:', error);
  });`,
        explanation: 'This code handles BankID Norway authentication by making a POST request to the auth endpoint. It returns a session ID and redirect URL for the user to complete authentication.',
        dependencies: ['fetch API'],
        testCommand: 'node bankid-auth.js'
      }
    ])

    this.codeTemplates.set('bankid-norway-session-js', [
      {
        language: 'javascript',
        code: `// Get BankID Norway Session Details
const getSessionDetails = async (sessionId, apiKey) => {
  try {
    const response = await fetch('https://demo.avenai.dev/api/v1/bankidno/auth/' + sessionId, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Session check failed: ' + response.status);
    }

    const sessionData = await response.json();
    
    return {
      status: sessionData.status,
      userInfo: sessionData.user_info,
      expiresAt: sessionData.expires_at
    };
  } catch (error) {
    console.error('Session check error:', error);
    throw error;
  }
};

// Poll for session completion
const pollSessionStatus = async (sessionId, apiKey, maxAttempts = 30) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const sessionData = await getSessionDetails(sessionId, apiKey);
      
      if (sessionData.status === 'completed') {
        return sessionData;
      } else if (sessionData.status === 'failed') {
        throw new Error('Authentication failed');
      }
      
      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Session timeout');
};`,
        explanation: 'This code checks the status of a BankID Norway session and polls for completion. It handles different session states and provides user information when authentication is complete.',
        dependencies: ['fetch API'],
        testCommand: 'node session-check.js'
      }
    ])

    // Jobs API Templates
    this.codeTemplates.set('jobs-api-risk-js', [
      {
        language: 'javascript',
        code: `// Jobs API Risk Evaluation
const evaluateRisk = async (merchantData, apiKey) => {
  try {
    const response = await fetch('https://api-sandbox.g2netview.com/v1/risk-evaluation/boarding-case', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        merchantId: merchantData.merchantId,
        riskData: {
          businessType: merchantData.businessType,
          annualRevenue: merchantData.annualRevenue,
          transactionVolume: merchantData.transactionVolume,
          merchantAddress: merchantData.address
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error('Risk evaluation failed: ' + (errorData.message || response.statusText));
    }

    const riskData = await response.json();
    return {
      riskScore: riskData.risk_score,
      recommendation: riskData.recommendation,
      factors: riskData.risk_factors
    };
  } catch (error) {
    console.error('Risk evaluation error:', error);
    throw error;
  }
};

// Example usage
const merchantData = {
  merchantId: 'MERCHANT_123',
  businessType: 'ecommerce',
  annualRevenue: 1000000,
  transactionVolume: 50000,
  address: {
    street: '123 Main St',
    city: 'Oslo',
    country: 'Norway',
    postalCode: '0123'
  }
};

evaluateRisk(merchantData, 'your-api-key')
  .then(result => {
    console.log('Risk Score:', result.riskScore);
    console.log('Recommendation:', result.recommendation);
  })
  .catch(error => {
    console.error('Risk evaluation failed:', error);
  });`,
        explanation: 'This code performs risk evaluation using the Jobs API. It sends merchant data and receives a risk score, recommendation, and risk factors.',
        dependencies: ['fetch API'],
        testCommand: 'node risk-evaluation.js'
      }
    ])

    // Error Handling Templates
    this.codeTemplates.set('error-handling-js', [
      {
        language: 'javascript',
        code: `// Comprehensive Error Handling for API Integration
class APIError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const handleAPIError = (error, context = '') => {
  console.error('API Error [' + context + ']:', error);
  
  if (error instanceof APIError) {
    switch (error.status) {
      case 401:
        return {
          message: 'Authentication failed. Please check your API key.',
          action: 'Verify your API credentials',
          code: 'AUTH_FAILED'
        };
      case 403:
        return {
          message: 'Access denied. You may not have permission for this operation.',
          action: 'Contact your administrator',
          code: 'ACCESS_DENIED'
        };
      case 404:
        return {
          message: 'Resource not found. Please check the endpoint URL.',
          action: 'Verify the API endpoint',
          code: 'NOT_FOUND'
        };
      case 429:
        return {
          message: 'Rate limit exceeded. Please wait before retrying.',
          action: 'Implement exponential backoff',
          code: 'RATE_LIMITED'
        };
      case 500:
        return {
          message: 'Server error. Please try again later.',
          action: 'Retry after a delay',
          code: 'SERVER_ERROR'
        };
      default:
        return {
          message: 'Unexpected error: ' + error.message,
          action: 'Check API documentation',
          code: 'UNKNOWN_ERROR'
        };
    }
  }
  
  return {
    message: 'Network or unexpected error occurred',
    action: 'Check your internet connection',
    code: 'NETWORK_ERROR'
  };
};

// Retry mechanism with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const errorInfo = handleAPIError(error, 'Attempt ' + (attempt + 1));
      
      if (attempt === maxRetries - 1) {
        throw new APIError(errorInfo.message, error.status, errorInfo.code);
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log('Retrying in ' + delay + 'ms...');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};`,
        explanation: 'This comprehensive error handling system provides structured error management with retry logic and user-friendly error messages.',
        dependencies: ['Promise'],
        testCommand: 'node error-handling.js'
      }
    ])
  }

  generateCode(context: CodeGenerationContext, userQuery: string): CodeExample[] {
    const key = this.generateTemplateKey(context)
    const templates = this.codeTemplates.get(key) || []
    
    // If no specific template found, generate generic code
    if (templates.length === 0) {
      return this.generateGenericCode(context, userQuery)
    }
    
    return templates
  }

  private generateTemplateKey(context: CodeGenerationContext): string {
    return context.apiType + '-' + context.operation + '-' + context.language
  }

  private generateGenericCode(context: CodeGenerationContext, userQuery: string): CodeExample[] {
    const baseCode = this.getBaseTemplate(context.language)
    
    return [{
      language: context.language,
      code: baseCode,
      explanation: 'Generic ' + context.language + ' code example for ' + context.operation + ' operation.',
      dependencies: this.getDependencies(context.language)
    }]
  }

  private getBaseTemplate(language: string): string {
    const templates = {
      javascript: `// Generic JavaScript API call
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};`,
      python: `# Generic Python API call
import requests
import json

def api_call(endpoint, headers=None, data=None):
    try:
        response = requests.get(
            endpoint,
            headers=headers or {},
            json=data
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"API call failed: {e}")
        raise`,
      curl: `# Generic cURL command
curl -X GET \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://api.example.com/endpoint"`
    }
    
    return (templates as any)[language] || templates.javascript
  }

  private getDependencies(language: string): string[] {
    const dependencies = {
      javascript: ['fetch API'],
      python: ['requests'],
      curl: ['curl'],
      typescript: ['fetch API', '@types/node']
    }
    
    return (dependencies as any)[language] || ['fetch API']
  }

  // Detect code generation intent from user query
  static detectCodeIntent(query: string): CodeGenerationContext | null {
    const lowerQuery = query.toLowerCase()
    
    // Detect API type
    let apiType: 'bankid-norway' | 'jobs-api' | 'generic' = 'generic'
    if (lowerQuery.includes('bankid') || lowerQuery.includes('norway')) {
      apiType = 'bankid-norway'
    } else if (lowerQuery.includes('jobs api') || lowerQuery.includes('g2netview') || lowerQuery.includes('risk evaluation')) {
      apiType = 'jobs-api'
    }
    
    // Detect operation
    let operation: 'authentication' | 'request' | 'error-handling' | 'webhook' | 'testing' = 'request'
    if (lowerQuery.includes('auth') || lowerQuery.includes('login') || lowerQuery.includes('token')) {
      operation = 'authentication'
    } else if (lowerQuery.includes('error') || lowerQuery.includes('exception') || lowerQuery.includes('handling')) {
      operation = 'error-handling'
    } else if (lowerQuery.includes('webhook') || lowerQuery.includes('callback')) {
      operation = 'webhook'
    } else if (lowerQuery.includes('test') || lowerQuery.includes('debug')) {
      operation = 'testing'
    }
    
    // Detect language preference
    let language: 'javascript' | 'python' | 'curl' | 'typescript' = 'javascript'
    if (lowerQuery.includes('python') || lowerQuery.includes('py')) {
      language = 'python'
    } else if (lowerQuery.includes('curl') || lowerQuery.includes('command line')) {
      language = 'curl'
    } else if (lowerQuery.includes('typescript') || lowerQuery.includes('ts')) {
      language = 'typescript'
    }
    
    return {
      apiType,
      operation,
      language
    }
  }
}

// Export convenience function
export function generateCodeExample(userQuery: string): CodeExample[] {
  const context = CodeGenerator.detectCodeIntent(userQuery)
  if (!context) return []
  
  const generator = CodeGenerator.getInstance()
  return generator.generateCode(context, userQuery)
}