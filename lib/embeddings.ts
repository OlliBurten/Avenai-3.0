// lib/embeddings.ts
import { getOpenAIClient } from './openai'

export async function getEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-placeholder') {
    console.warn('OpenAI API key not configured, returning dummy embedding')
    // Return a dummy embedding vector (1536 dimensions for text-embedding-3-small)
    return new Array(1536).fill(0).map(() => Math.random() - 0.5)
  }
  
  try {
    const openai = getOpenAIClient()
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small', // fast + cheap
      input
    })
    return res.data[0].embedding as number[]
  } catch (error) {
    console.error('OpenAI embedding error:', error)
    // Return dummy embedding on error
    return new Array(1536).fill(0).map(() => Math.random() - 0.5)
  }
}

// chunk-wise helper to batch
export async function getEmbeddings(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-placeholder') {
    console.warn('OpenAI API key not configured, returning dummy embeddings')
    // Return dummy embeddings
    return inputs.map(() => new Array(1536).fill(0).map(() => Math.random() - 0.5))
  }
  
  try {
    const openai = getOpenAIClient()
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: inputs
    })
    return res.data.map(d => d.embedding as number[])
  } catch (error) {
    console.error('OpenAI embeddings error:', error)
    // Return dummy embeddings on error
    return inputs.map(() => new Array(1536).fill(0).map(() => Math.random() - 0.5))
  }
}
