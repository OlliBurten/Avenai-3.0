import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId
  const planKey = session.metadata?.planKey

  if (!organizationId || !planKey) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  // Update organization with subscription details
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionTier: planKey.toUpperCase() as any,
      subscriptionStatus: 'ACTIVE',
      stripeSubscriptionId: session.subscription as string,
      stripePriceId: session.metadata?.priceId,
      cancelAtPeriodEnd: false,
    }
  })

  console.log(`Checkout completed for organization ${organizationId}, plan: ${planKey}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const planKey = getPlanKeyFromPriceId(priceId)

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionTier: planKey.toUpperCase() as any,
      subscriptionStatus: subscription.status.toUpperCase() as any,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    }
  })

  console.log(`Subscription updated for organization ${organization.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'CANCELLED',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  })

  console.log(`Subscription cancelled for organization ${organization.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: 'ACTIVE',
    }
  })

  console.log(`Payment succeeded for organization ${organization.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const organization = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId }
  })

  if (!organization) {
    console.error('Organization not found for customer:', customerId)
    return
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
    }
  })

  console.log(`Payment failed for organization ${organization.id}`)
}

function getPlanKeyFromPriceId(priceId: string): string {
  if (priceId === STRIPE_CONFIG.priceIds.free) return 'free'
  if (priceId === STRIPE_CONFIG.priceIds.pro) return 'pro'
  return 'free'
}
