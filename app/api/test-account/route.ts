import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Stripe account connection...')
    
    try {
      // Get account info to verify which account we're connected to
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
      }
      const account = await stripe.accounts.retrieve()
      console.log('Account ID:', account.id)
      
      // Try to list products to see what's available
      const products = await stripe.products.list({ limit: 5 })
      console.log('Found', products.data.length, 'products')
      
      // Try to list prices
      const prices = await stripe.prices.list({ limit: 5 })
      console.log('Found', prices.data.length, 'prices')
      
      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          country: account.country,
          default_currency: account.default_currency,
          type: account.type
        },
        products: products.data.map(p => ({
          id: p.id,
          name: p.name,
          active: p.active
        })),
        prices: prices.data.map(p => ({
          id: p.id,
          active: p.active,
          unit_amount: p.unit_amount,
          currency: p.currency
        }))
      })
    } catch (stripeError) {
      console.error('Stripe account test error:', stripeError)
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
