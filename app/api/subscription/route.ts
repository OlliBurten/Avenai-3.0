import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG, PRICING_PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { withAuth, createResponse, createErrorResponse } from '@/lib/api-utils'

// Get subscription information
async function handleGetSubscription(req: NextRequest, session: any) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    // Get current plan details - map subscription tier to plan key
    const tierToPlanKey: Record<string, keyof typeof PRICING_PLANS> = {
      'FREE': 'free',
      'PRO': 'pro'
    }
    
    const planKey = tierToPlanKey[organization.subscriptionTier] || 'free'
    const currentPlan = PRICING_PLANS[planKey]

    return createResponse({
      currentPlan: {
        tier: organization.subscriptionTier,
        status: organization.subscriptionStatus,
        stripePriceId: organization.stripePriceId,
        currentPeriodStart: organization.currentPeriodStart,
        currentPeriodEnd: organization.currentPeriodEnd,
        cancelAtPeriodEnd: organization.cancelAtPeriodEnd,
        ...currentPlan
      },
      availablePlans: Object.entries(PRICING_PLANS).map(([key, plan]) => ({
        key,
        name: plan.name,
        price: plan.price,
        priceId: plan.priceId,
        annualPrice: 'annualPrice' in plan ? plan.annualPrice : undefined,
        annualPriceId: 'annualPriceId' in plan ? plan.annualPriceId : undefined,
        annualDiscount: 'annualDiscount' in plan ? plan.annualDiscount : undefined,
        features: plan.features,
        limits: plan.limits,
        description: 'Perfect for growing SaaS companies',
        popular: key === 'pro'
      }))
    }, 'Subscription information retrieved successfully')

  } catch (error) {
    console.error('Error fetching subscription:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch subscription information',
      statusCode: 500
    })
  }
}

// Create or update subscription
async function handleCreateSubscription(req: NextRequest, session: any) {
  try {
    const { planKey, billingPeriod = 'monthly', successUrl, cancelUrl } = await req.json()

    if (!planKey || !successUrl || !cancelUrl) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Missing required fields: planKey, successUrl, cancelUrl',
        statusCode: 400
      })
    }

    const plan = PRICING_PLANS[planKey as keyof typeof PRICING_PLANS]
    if (!plan) {
      return createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Invalid plan',
        statusCode: 400
      })
    }

    // Skip checkout for free plan
    if (planKey === 'free') {
      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          stripePriceId: plan.priceId,
          cancelAtPeriodEnd: false,
        }
      })

      return createResponse({ 
        success: true, 
        message: 'Successfully upgraded to Free plan' 
      }, 'Successfully upgraded to Free plan')
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.log('Stripe not configured - simulating upgrade for testing')
      
      // For testing purposes, simulate a successful upgrade
      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: {
          subscriptionTier: planKey.toUpperCase(),
          subscriptionStatus: 'ACTIVE',
          stripePriceId: billingPeriod === 'annual' && 'annualPriceId' in plan ? plan.annualPriceId : plan.priceId,
          cancelAtPeriodEnd: false,
        }
      })

      return createResponse({ 
        success: true, 
        message: `Successfully upgraded to ${plan.name} plan (test mode - Stripe not configured)`,
        testMode: true
      }, `Successfully upgraded to ${plan.name} plan`)
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { stripeCustomerId: true, name: true }
    })

    let customerId = organization?.stripeCustomerId

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email as string,
        name: organization?.name || 'Avenai Customer',
        metadata: {
          organizationId: session.user.organizationId as string,
        }
      })
      customerId = customer.id

      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: { stripeCustomerId: customerId }
      })
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: billingPeriod === 'annual' && 'annualPriceId' in plan ? plan.annualPriceId : plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: session.user.organizationId as string,
        planKey,
        billingPeriod,
      },
    })

    return createResponse({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    }, 'Checkout session created successfully')

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create checkout session',
      statusCode: 500
    })
  }
}

// Cancel subscription
async function handleCancelSubscription(req: NextRequest, session: any) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { 
        stripeSubscriptionId: true,
        subscriptionTier: true,
        subscriptionStatus: true
      }
    })

    if (!organization) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Organization not found',
        statusCode: 404
      })
    }

    // If there's a Stripe subscription, cancel it
    if (organization.stripeSubscriptionId && stripe) {
      await stripe.subscriptions.update(organization.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: { cancelAtPeriodEnd: true }
      })

      return createResponse({ 
        success: true, 
        message: 'Subscription will be cancelled at the end of the current period' 
      }, 'Subscription will be cancelled at the end of the current period')
    } else {
      // For manual upgrades (no Stripe subscription), downgrade to Free immediately
      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: {
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          stripePriceId: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false
        }
      })

      return createResponse({ 
        success: true, 
        message: 'Subscription cancelled and downgraded to Free plan' 
      }, 'Subscription cancelled and downgraded to Free plan')
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to cancel subscription',
      statusCode: 500
    })
  }
}

export const GET = withAuth(handleGetSubscription)
export const POST = withAuth(handleCreateSubscription)
export const DELETE = withAuth(handleCancelSubscription)
