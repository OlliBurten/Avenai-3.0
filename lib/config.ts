/**
 * Application Configuration
 * 
 * Centralized configuration for feature flags, environment variables,
 * and application settings.
 */

export const flags = {
  UNIFIED_WORKSPACE: process.env.UNIFIED_WORKSPACE === 'true',
};

export const config = {
  // App URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  
  // NextAuth
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  
  // Email Service
  resendApiKey: process.env.RESEND_API_KEY,
  
  // Pinecone
  pineconeApiKey: process.env.PINECONE_API_KEY,
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'avenai-docs',
  
  // Stripe
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Feature Flags
  flags,
};

// Type-safe feature flag access
export const isFeatureEnabled = (flag: keyof typeof flags): boolean => {
  return flags[flag];
};

// Development helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Export individual flags for convenience
export const { UNIFIED_WORKSPACE } = flags;