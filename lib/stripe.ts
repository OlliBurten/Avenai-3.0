import Stripe from 'stripe'

// Check if Stripe is properly configured
const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY

export const stripe = isStripeConfigured 
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  : null

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  priceIds: {
    free: process.env.STRIPE_FREE_PRICE_ID || 'price_free_tier',
    pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_tier',
    proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual_tier',
  }
}

export const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: STRIPE_CONFIG.priceIds.free,
    features: [
      'Up to 5 documents',
      '500 questions per month',
      'Basic widget with Avenai branding',
      'Community support'
    ],
    limits: {
      documents: 5,
      questionsPerMonth: 500,
      storageGB: 0.05 // 50MB
    }
  },
  pro: {
    name: 'Pro',
    price: 99,
    priceId: STRIPE_CONFIG.priceIds.pro,
    annualPrice: 990,
    annualPriceId: STRIPE_CONFIG.priceIds.proAnnual,
    annualDiscount: 198,
    features: [
      'Up to 50 documents',
      '10,000 questions per month',
      'Custom branding (remove Avenai branding)',
      'Analytics dashboard',
      'Priority email support',
      'Advanced widget customization'
    ],
    limits: {
      documents: 50,
      questionsPerMonth: 10000,
      storageGB: 1
    }
  }
}

export type PlanType = keyof typeof PRICING_PLANS
