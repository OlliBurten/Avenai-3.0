import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG, PRICING_PLANS } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Stripe configuration...')
    
    // Test Stripe configuration
    const config = {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) || 'NOT_SET',
      publishableKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 10) || 'NOT_SET',
      proPriceId: process.env.STRIPE_PRO_PRICE_ID || 'NOT_SET',
    }
    
    console.log('Stripe config:', config)
    
    // Test PRICING_PLANS
    console.log('PRICING_PLANS:', PRICING_PLANS)
    
    // Test Stripe API call
    try {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      const prices = await stripe.prices.list({ limit: 1 })
      console.log('Stripe API test successful, found', prices.data.length, 'prices')
      
      return NextResponse.json({
        success: true,
        config,
        pricingPlans: PRICING_PLANS,
        stripeTest: {
          success: true,
          pricesFound: prices.data.length
        }
      })
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError)
      return NextResponse.json({
        success: false,
        config,
        pricingPlans: PRICING_PLANS,
        stripeTest: {
          success: false,
          error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'
        }
      })
    }
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
