"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function UpdateFounderPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateFounderTier = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/update-founder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ Success! Oliver's account has been updated to FOUNDER tier with unlimited access.`)
      } else {
        setError(data.error || 'Failed to update founder tier')
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Update Founder Tier
          </h1>
          <p className="text-gray-600 mb-6">
            This will update Oliver's account (oliver@avenai.io) to FOUNDER tier with unlimited access.
          </p>
          
          <Button 
            onClick={updateFounderTier}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Updating...' : 'Update to FOUNDER Tier'}
          </Button>

          {result && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm">{result}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
