// app/dev-bypass/page.tsx
// Development bypass page to skip authentication

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DevBypassPage() {
  const router = useRouter()

  useEffect(() => {
    // Set a bypass cookie for the middleware
    document.cookie = 'av_onb=1; path=/; max-age=3600'
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Development Mode
        </h2>
        <p className="text-gray-600 mb-4">
          Bypassing authentication and redirecting to dashboard...
        </p>
        <p className="text-sm text-gray-500">
          Setting bypass cookie and redirecting in 1 second...
        </p>
      </div>
    </div>
  )
}
