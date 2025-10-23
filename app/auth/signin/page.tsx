"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import { Bot, Github } from 'lucide-react'

export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<Record<string, any>>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session?.user) {
        // Redirect based on onboarding status
        const org = (session.user as any)?.organization;
        if (org) {
          // User has completed onboarding, go to dashboard
          router.push('/dashboard');
        } else {
          // New user, go to onboarding
          router.push('/onboarding');
        }
      }
    }).catch((error) => {
      console.error('Error getting session:', error)
    })
    
    // Check available providers
    fetch('/api/auth/providers')
      .then(res => res.json())
      .then(providers => {
        setProviders(providers);
      })
      .catch((error) => {
        console.error('Error fetching providers:', error)
      })
  }, [router])

  const handleProviderSignIn = async (providerId: string) => {
    setLoading(providerId)
    setError('')
    
    try {
      const result = await signIn(providerId, { 
        callbackUrl,
        redirect: false 
      })
      
      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh(); // Force refresh to get updated session
      } else if (result?.error) {
        setError(`Sign-in failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Sign-in exception:', error)
      setError(`Sign-in error. Please try again.`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Floating Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="relative mx-auto w-16 h-16 mb-6">
            {/* Static glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl blur-lg opacity-30"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Avenai
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your documentation. Instantly searchable. Always accurate.
          </p>
          <p className="text-sm text-purple-600 font-medium">
            For professional teams • Enterprise-ready
          </p>
        </div>

        {/* Security Message */}
        <div className="text-center mb-8">
          <p className="text-xs text-gray-500">
            No password required. Secure SSO via Google or Microsoft.
          </p>
        </div>

        {/* Development Bypass */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Mode</h3>
            <p className="text-xs text-yellow-700 mb-3">
              OAuth credentials not configured. Use the bypass to access the dashboard.
            </p>
            <button
              onClick={() => window.location.href = '/dev-bypass'}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors"
            >
              🚀 Development Bypass
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Sign In Buttons */}
        <div className="space-y-4">
          {/* Google Sign In */}
          {providers.google && (
            <button
              onClick={() => handleProviderSignIn('google')}
              disabled={loading === 'google'}
              className="w-full flex items-center justify-center py-6 px-8 border-2 border-gray-200 rounded-2xl shadow-sm bg-white hover:border-purple-300 hover:bg-purple-50 hover:shadow-xl hover:shadow-purple-100/50 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300 disabled:opacity-50 transition-all duration-300 text-gray-800 font-semibold text-lg"
            >
              <svg className="w-6 h-6 mr-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC04"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>
          )}

          {/* Microsoft Sign In */}
          {providers['azure-ad'] && (
            <button
              onClick={() => handleProviderSignIn('azure-ad')}
              disabled={loading === 'azure-ad'}
              className="w-full flex items-center justify-center py-6 px-8 border-2 border-gray-200 rounded-2xl shadow-sm bg-white hover:border-purple-300 hover:bg-purple-50 hover:shadow-xl hover:shadow-purple-100/50 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300 disabled:opacity-50 transition-all duration-300 text-gray-800 font-semibold text-lg"
            >
              <svg className="w-6 h-6 mr-4" viewBox="0 0 24 24">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#7fba00" d="M12 1h10v10H12z"/>
                <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              <span>
                {loading === 'azure-ad' ? 'Signing in...' : 'Continue with Microsoft'}
              </span>
            </button>
          )}

          {/* GitHub Sign In (fallback if Microsoft not configured) */}
          {providers.github && !providers['azure-ad'] && (
            <button
              onClick={() => handleProviderSignIn('github')}
              disabled={loading === 'github'}
              className="w-full flex items-center justify-center py-6 px-8 border-2 border-gray-200 rounded-2xl shadow-sm bg-white hover:border-purple-300 hover:bg-purple-50 hover:shadow-xl hover:shadow-purple-100/50 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-300 disabled:opacity-50 transition-all duration-300 text-gray-800 font-semibold text-lg"
            >
              <Github className="w-5 h-5 mr-3" />
              <span>
                {loading === 'github' ? 'Signing in...' : 'Continue with GitHub'}
              </span>
            </button>
          )}
        </div>

          {/* Social Proof */}
          <div className="text-center mt-8">
            <p className="text-xs text-gray-400">
              Trusted by API-first companies
            </p>
          </div>

        </div>
      </div>

      {/* Footer positioned at center bottom */}
      <div className="fixed bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-gray-500/80">
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-purple-600 hover:text-purple-500 font-medium">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-purple-600 hover:text-purple-500 font-medium">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}