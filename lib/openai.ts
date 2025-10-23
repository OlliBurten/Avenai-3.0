import OpenAI from 'openai'
import { generateCodeExample, CodeExample } from './code-generator'

// Lazy initialization to avoid "self is not defined" errors during build
let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build'
    });
  }
  return _openaiClient;
}

// For backward compatibility - lazy getter
export const openai = new Proxy({} as OpenAI, {
  get: (target, prop) => {
    const client = getOpenAIClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// optional: a simple embeddings helper used by lib/pinecone.ts
export async function getEmbedding(text: string) {
  const client = getOpenAIClient();
  const res = await client.embeddings.create({
    model: 'text-embedding-3-large',
    input: text
  })
  return res.data[0].embedding
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('⚠️  No API key found, using fallback embedding')
      return createFallbackEmbedding(text)
    }

    // Estimate token count (extremely conservative: 1 token ≈ 1.5 characters for safety)
    const estimatedTokens = Math.ceil(text.length / 1.5)
    if (estimatedTokens > 3000) { // Very conservative limit
      console.log(`⚠️  Text too long for embedding (${estimatedTokens} tokens), truncating...`)
      // Truncate to approximately 3000 tokens worth of characters
      const maxChars = 3000 * 1.5
      text = text.substring(0, maxChars)
      // Find the last complete word
      const lastSpace = text.lastIndexOf(' ')
      if (lastSpace > maxChars * 0.8) { // Only if we don't lose too much content
        text = text.substring(0, lastSpace)
      }
      console.log(`✂️  Truncated to ${text.length} characters (~${Math.ceil(text.length / 1.5)} tokens)`)
    }

    const openai = new OpenAI({ apiKey })
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    })
    
    return response.data[0].embedding
  } catch (error: any) {
    console.error('Embedding creation error:', error)
    return createFallbackEmbedding(text)
  }
}

// Simple fallback embedding function
function createFallbackEmbedding(text: string): number[] {
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  
  const embedding = new Array(1536).fill(0)
  for (let i = 0; i < 1536; i++) {
    embedding[i] = Math.sin(hash + i) * 0.1
  }
  
  return embedding
}

export function chunkText(text: string, chunkSize: number = 1400, overlap: number = 250): string[] {
  const chunks: string[] = []
  let start = 0
  
  // Safety check to prevent infinite loops
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0
  
  while (start < text.length && iterations < maxIterations) {
    let end = Math.min(start + chunkSize, text.length)
    
    if (end < text.length) {
      const nextPeriod = text.indexOf('.', end - 100)
      const nextNewline = text.indexOf('\n', end - 100)
      
      if (nextPeriod !== -1 && nextPeriod < end + 100) {
        end = nextPeriod + 1
      } else if (nextNewline !== -1 && nextNewline < end + 100) {
        end = nextNewline + 1
      }
    }
    
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    
    // Ensure we always advance
    const newStart = end - overlap
    if (newStart <= start) {
      // Force advancement to prevent infinite loop
      start = end
    } else {
      start = newStart
    }
    
    iterations++
  }
  
  return chunks
}

// Streaming response generator for real-time feedback
export async function* generateStreamingResponse(
  message: string,
  context: string = '',
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): AsyncGenerator<string, void, unknown> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('⚠️  No API key found, using fallback streaming response')
      yield* generateFallbackStreamingResponse(message, context)
      return
    }

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are Avenai, an intelligent AI assistant specialized in helping developers with API documentation and integration questions. You have access to the following uploaded documentation: ${context}

Key Capabilities:
- Provide clear, step-by-step explanations
- Generate code examples with proper syntax highlighting
- Format responses in structured, readable ways
- Answer questions about APIs, authentication, error handling
- Offer best practices and troubleshooting guidance
- Maintain a helpful, professional tone
- Automatically detect when code examples are needed and provide them

Response Guidelines:
- Use markdown formatting for code blocks, lists, and emphasis
- Provide practical, actionable advice
- Include relevant code examples when appropriate
- Structure complex answers with clear sections
- Be conversational but professional
- Reference specific parts of the documentation when relevant
- When users ask for code examples, provide complete, working code with explanations

Code Generation:
- Always include syntax highlighting in code blocks
- Provide working examples that can be copy-pasted
- Include error handling in code examples
- Add comments explaining key parts
- Mention any required dependencies or setup

Current conversation context: ${conversationHistory.length > 0 ? 'Previous messages provide context for this conversation.' : 'This is a new conversation.'}`

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      // GPT-5 only supports default temperature (1)
      top_p: 0.95,
      max_completion_tokens: 2000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error: any) {
    console.error('Streaming response error:', error)
    yield* generateFallbackStreamingResponse(message, context)
  }
}

export async function generateResponse(
  message: string,
  context: string = '',
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('⚠️  No API key found, using fallback response')
      return generateEnhancedFallbackResponse(message, context)
    }

    const openai = new OpenAI({ apiKey })

    const systemPrompt = `You are Avenai, an intelligent AI assistant specialized in helping developers with API documentation and integration questions. You have access to the following uploaded documentation: ${context}

Key Capabilities:
- Provide clear, step-by-step explanations
- Generate code examples with proper syntax highlighting
- Format responses in structured, readable ways
- Answer questions about APIs, authentication, error handling
- Offer best practices and troubleshooting guidance
- Maintain a helpful, professional tone
- Automatically detect when code examples are needed and provide them

Response Guidelines:
- Use markdown formatting for code blocks, lists, and emphasis
- Provide practical, actionable advice
- Include relevant code examples when appropriate
- Structure complex answers with clear sections
- Be conversational but professional
- Reference specific parts of the documentation when relevant
- When users ask for code examples, provide complete, working code with explanations

Code Generation:
- Always include syntax highlighting in code blocks
- Provide working examples that can be copy-pasted
- Include error handling in code examples
- Add comments explaining key parts
- Mention any required dependencies or setup

Current conversation context: ${conversationHistory.length > 0 ? 'Previous messages provide context for this conversation.' : 'This is a new conversation.'}`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      // GPT-5 only supports default temperature (1)
      top_p: 0.95,
      max_completion_tokens: 2000,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    return response.choices[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.'
  } catch (error: any) {
    console.error('Response generation error:', error)
    return generateEnhancedFallbackResponse(message, context)
  }
}

// Fallback streaming response generator
async function* generateFallbackStreamingResponse(message: string, context: string = ''): AsyncGenerator<string, void, unknown> {
  const fallbackResponse = `# Welcome to Avenai! 🤖

I'm your AI assistant for API documentation and integration help. I can assist with:

## My Capabilities
- **Code Generation**: Working examples in multiple languages
- **Documentation**: Clear explanations of complex concepts
- **Troubleshooting**: Debug common integration issues
- **Best Practices**: Industry-standard recommendations
- **Step-by-step Guides**: Complete integration workflows

## How to Use Me
Ask me specific questions like:
- "How do I authenticate with the API?"
- "Show me a code example for user registration"
- "What are the common error codes?"
- "Explain the webhook setup process"

## Current Status
⚠️ **Note**: I'm currently running in fallback mode due to API key configuration issues. For full functionality with your specific documentation, please ensure your OpenAI API key is properly set up.

To fix this:
1. Run: \`./scripts/setup-env.sh\`
2. Enter your valid OpenAI API key
3. Restart the development server

I'm here to help you succeed with your API integrations! 🚀`

  // Stream the response in chunks to simulate real streaming
  const words = fallbackResponse.split(' ')
  for (let i = 0; i < words.length; i++) {
    yield words[i] + (i < words.length - 1 ? ' ' : '')
    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

function generateEnhancedFallbackResponse(message: string, context: string = ''): string {
  return `# Welcome to Avenai! 🤖

I'm your AI assistant for API documentation and integration help. I can assist with:

## My Capabilities
- **Code Generation**: Working examples in multiple languages
- **Documentation**: Clear explanations of complex concepts
- **Troubleshooting**: Debug common integration issues
- **Best Practices**: Industry-standard recommendations
- **Step-by-step Guides**: Complete integration workflows

## How to Use Me
Ask me specific questions like:
- "How do I authenticate with the API?"
- "Show me a code example for user registration"
- "What are the common error codes?"
- "Explain the webhook setup process"

## Current Status
⚠️ **Note**: I'm currently running in fallback mode due to API key configuration issues. For full functionality with your specific documentation, please ensure your OpenAI API key is properly set up.

To fix this:
1. Run: \`./scripts/setup-env.sh\`
2. Enter your valid OpenAI API key
3. Restart the development server

I'm here to help you succeed with your API integrations! 🚀`
}