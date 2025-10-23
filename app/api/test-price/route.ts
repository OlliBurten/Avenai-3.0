import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const priceId = 'price_1S51ARBtqKEIPtHzYUHOBfCD'
    
    console.log('Testing specific price ID:', priceId)
    
    try {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      const price = await stripe.prices.retrieve(priceId)
      console.log('Price found:', price)
      
      return NextResponse.json({
        success: true,
        price: {
          id: price.id,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring: price.recurring,
          product: price.product
        }
      })
    } catch (stripeError) {
      console.error('Stripe price retrieval error:', stripeError)
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
