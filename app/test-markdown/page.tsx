import React from 'react';
import Markdown from '@/components/ui/Markdown';

export default function TestMarkdownPage() {
  const testContent = `### 1. **Obtain Your Subscription Key**
First, you need to register with ZignSec to receive your subscription key. This key is essential for authenticating your API requests. Make sure to keep this key secure and rotate it regularly, as recommended.

### 2. **Set Up Your Environment**
You can choose between two environments for testing and production:
- **Test Environment:** [https://test-gateway.zignsec.com/api/v5/sessions](https://test-gateway.zignsec.com/api/v5/sessions)
- **Production Environment:** [https://gateway.zignsec.com/api/v5/sessions](https://gateway.zignsec.com/api/v5/sessions)

### 3. **API Request Headers**
When making API requests, include the following headers:

\`\`\`http
Authorization: 123456add0cff22873c428e987654321  # Replace with your actual subscription key
Content-Type: application/json
\`\`\`

### 4. **Choose the Right Endpoint**
Depending on your use case, you can use different endpoints:

- **Register a New User:**
  \`\`\`http
  POST /bankidno/auth/register
  \`\`\`
  This endpoint is used to onboard a new user and request their National Identification Number (NNIN).

- **Authenticate an Existing User:**
  \`\`\`http
  POST /bankidno/auth/member
  \`\`\`
  Use this if you already have the user's NNIN and do not need their consent.`;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Markdown Component Test</h1>
        
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Raw Content:</h2>
          <pre className="text-sm overflow-x-auto bg-gray-100 p-4 rounded">{testContent}</pre>
        </div>
        
        <div className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Rendered Output:</h2>
          <div className="prose prose-sm max-w-none text-gray-900 font-normal [&_pre]:!bg-gray-50 [&_pre]:!text-gray-800 [&_code]:!bg-gray-200 [&_code]:!text-gray-800">
            <Markdown>{testContent}</Markdown>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Expected Behavior:</h3>
          <p className="text-blue-800">
            The markdown should render with proper headers (h3), bold text, bullet points, and code blocks. 
            If you see raw markdown syntax like ### and **, then there's an issue with the Markdown component.
          </p>
        </div>
      </div>
    </div>
  );
}
