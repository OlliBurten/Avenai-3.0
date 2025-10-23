import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching all prices from Stripe...')
    
    try {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      const prices = await stripe.prices.list({ limit: 10 })
      console.log('Found', prices.data.length, 'prices')
      
      return NextResponse.json({
        success: true,
        prices: prices.data.map(price => ({
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring: price.recurring,
          product: price.product,
          created: price.created
        }))
      })
    } catch (stripeError) {
      console.error('Stripe prices list error:', stripeError)
      return NextResponse.json({
        success: false,
        error: stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error',
        code: (stripeError as any)?.code || 'unknown'
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
