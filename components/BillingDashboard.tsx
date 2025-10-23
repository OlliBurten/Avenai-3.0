"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  Star, 
  Crown, 
  Shield, 
  Calendar, 
  Download, 
  RefreshCw,
  ArrowUpRight,
  Zap,
  Users,
  Database,
  Clock,
  TrendingUp,
  FileText,
  Settings,
  X,
  Plus
} from 'lucide-react'

interface PricingPlan {
  key: string
  name: string
  price: number
  priceId: string
  annualPrice?: number
  annualPriceId?: string
  annualDiscount?: number
  features: string[]
  limits: {
    documents: number
    questionsPerMonth: number
    storageGB: number
  }
  description: string
  popular?: boolean
}

interface Subscription {
  currentPlan: {
    tier: string
    status: string
    priceId: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    name: string
    price: number
    features: string[]
    limits: {
      documents: number
      questionsPerMonth: number
      storageGB: number
    }
  }
  availablePlans: PricingPlan[]
}

export default function BillingDashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'FREE': return <Star className="h-5 w-5" />
      case 'PRO': return <Crown className="h-5 w-5" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FREE': return 'text-gray-600'
      case 'PRO': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to sign-in page if not authenticated
          window.location.href = '/auth/signin?redirect=/billing'
          return
        }
        // During pilot, billing API may not exist - this is expected
        console.log('Billing API not available (pilot mode)')
        setSubscription(null)
        return
      }
      
      const data = await response.json()
      console.log('Subscription data received:', data)
      setSubscription(data.data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planKey: string) => {
    console.log('Upgrade clicked for plan:', planKey)
    console.log('Current plan tier:', subscription?.currentPlan.tier)
    console.log('Current plan tier lowercase:', subscription?.currentPlan.tier?.toLowerCase())
    console.log('Billing period:', billingPeriod)
    
    if (planKey === subscription?.currentPlan.tier.toLowerCase()) {
      console.log('Already on this plan, skipping upgrade')
      return
    }

    console.log('Starting upgrade process...')
    setUpgrading(planKey)
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planKey,
          billingPeriod,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
        }),
      })

      const data = await response.json()
      
      console.log('Upgrade response:', response.status, data)
      
      if (!response.ok) {
        console.error('Upgrade failed:', data.error)
        setError(`Upgrade failed: ${data.error}`)
        return
      }
      
      if (data.data.checkoutUrl) {
        console.log('Redirecting to Stripe checkout:', data.data.checkoutUrl)
        window.location.href = data.data.checkoutUrl
      } else if (data.data.success) {
        // Free plan upgrade or test mode upgrade
        console.log('Upgrade successful:', data.data.message)
        await fetchSubscription()
        setMessage(data.data.message || 'Successfully upgraded!')
      } else {
        console.error('Unexpected response:', data)
        setError('Unexpected response from server')
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error)
      alert('Error upgrading subscription. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    try {
      const response = await fetch('/api/subscription', {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()
      if (data.data.success) {
        await fetchSubscription()
        setMessage(data.data.message || 'Subscription will be cancelled at the end of your billing period.')
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert('Error cancelling subscription. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">
              Please sign in to view your subscription information.
            </p>
            <button
              onClick={() => window.location.href = '/auth/signin?redirect=/billing'}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { currentPlan, availablePlans } = subscription

  // Add safety check for currentPlan
  if (!currentPlan) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: No current plan information available</p>
        <p className="text-sm text-gray-600 mt-2">Please contact support if this issue persists.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={() => setError("")}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
          <span className="text-green-700">{message}</span>
          <button 
            onClick={() => setMessage("")}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className={`p-2 rounded-full bg-gray-100 ${getTierColor(currentPlan.tier)}`}>
                  {getTierIcon(currentPlan.tier)}
                </div>
                <span className="ml-3">Current Plan</span>
              </h2>
              <Badge variant={currentPlan.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {currentPlan.status}
              </Badge>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-2xl font-semibold text-gray-900">{currentPlan.name}</div>
                <p className="text-3xl font-bold text-blue-600">
                  ${currentPlan.price}
                  <span className="text-lg font-normal text-gray-600">/month</span>
                </p>
              </div>

              {currentPlan.currentPeriodEnd && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Billing Period</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(currentPlan.currentPeriodStart).toLocaleDateString()} - {new Date(currentPlan.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  {currentPlan.cancelAtPeriodEnd && (
                    <p className="text-orange-700 font-medium text-sm mt-2">
                      Subscription will be cancelled at the end of this period
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="font-medium text-gray-900">Plan Features:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-medium text-gray-900">Usage Limits:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Documents</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {currentPlan.limits.documents === -1 ? 'Unlimited' : currentPlan.limits.documents}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Zap className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Questions/Month</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {currentPlan.limits.questionsPerMonth === -1 ? 'Unlimited' : currentPlan.limits.questionsPerMonth}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Database className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Storage</span>
                    </div>
                    <p className="font-semibold text-gray-900">{currentPlan.limits.storageGB}GB</p>
                  </div>
                </div>
              </div>

              {currentPlan.tier !== 'FREE' && !currentPlan.cancelAtPeriodEnd && (
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="text-red-600 border-red-600 hover:bg-red-50 flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/api/billing/invoice', '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open('/api/billing/portal', '_blank')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Payment Methods
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setMessage('Billing history feature coming soon!')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Billing History
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={fetchSubscription}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Available Plans */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Available Plans
          </h2>
          <div className="flex items-center space-x-4">
            {/* Billing Period Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'annual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className="ml-1 bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">
                  Save 17%
                </span>
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubscription}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {availablePlans.map((plan) => {
            const isCurrentPlan = plan.key === currentPlan.tier.toLowerCase()
            const isUpgrading = upgrading === plan.key
            
            return (
              <Card key={plan.key} className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${isCurrentPlan ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white' : 'hover:ring-1 hover:ring-gray-200'}`}>
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Current Plan
                  </div>
                )}
                
                <div className="p-6 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-full bg-gray-100 ${getTierColor(plan.key.toUpperCase())} mb-4`}>
                      {getTierIcon(plan.key.toUpperCase())}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</div>
                    <div className="mb-4">
                      {billingPeriod === 'annual' && plan.annualPrice ? (
                        <>
                          <span className="text-4xl font-bold text-gray-900">${plan.annualPrice}</span>
                          <span className="text-gray-600 ml-1">/year</span>
                          <div className="mt-1">
                            <span className="text-lg text-gray-500 line-through">${plan.price * 12}</span>
                            <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                              Save ${plan.annualDiscount}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-gray-600 ml-1">/month</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-grow space-y-6">
                    <div className="space-y-3">
                      <div className="font-semibold text-gray-900 text-center">Features</div>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <div className="font-semibold text-gray-900 text-center">Limits</div>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Documents:</span>
                          <span className="font-medium text-gray-900">{plan.limits.documents === -1 ? 'Unlimited' : plan.limits.documents}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Questions/month:</span>
                          <span className="font-medium text-gray-900">{plan.limits.questionsPerMonth === -1 ? 'Unlimited' : plan.limits.questionsPerMonth}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Storage:</span>
                          <span className="font-medium text-gray-900">{plan.limits.storageGB}GB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={isCurrentPlan || isUpgrading}
                      className={`w-full py-3 font-semibold transition-all duration-200 ${
                        isCurrentPlan 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                      }`}
                      variant={isCurrentPlan ? 'outline' : 'default'}
                    >
                      {isCurrentPlan ? 'Current Plan' : isUpgrading ? 'Processing...' : 'Upgrade Now'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
