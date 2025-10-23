"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle,
  Trash2,
  ExternalLink,
  Shield,
  Activity,
  Clock,
  Download,
  RefreshCw,
  Star,
  Crown,
  Zap,
  Globe,
  Code,
  Terminal,
  BookOpen,
  Settings,
  BarChart3,
  TrendingUp,
  Users,
  Database
} from "lucide-react"

interface ApiKeyInfo {
  hasApiKey: boolean
  apiKeys: Array<{
    id: string
    keyPrefix: string
    name: string
    createdAt: string
    lastUsedAt: string | null
    createdBy: string
  }>
  organization: {
    id: string
    name: string
    slug: string
    subscriptionTier: string
  }
  limits: {
    requestsPerMinute: number
    requestsPerDay: number
    documentsMax: number
  }
  usage: {
    requestsLast30Days: number
    lastUsed: string | null
  }
}

export default function ApiKeyPage() {
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [copied, setCopied] = useState(false)

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'STARTER': return <Star className="h-5 w-5" />
      case 'PRO': return <Crown className="h-5 w-5" />
      case 'ENTERPRISE': return <Shield className="h-5 w-5" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'STARTER': return 'text-gray-600'
      case 'PRO': return 'text-blue-600'
      case 'ENTERPRISE': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  useEffect(() => {
    fetchApiKeyInfo()
  }, [])

  const fetchApiKeyInfo = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/api-key', {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch API key info')
      }

      setApiKeyInfo(data.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const generateApiKey = async () => {
    try {
      setIsGenerating(true)
      setError("")
      setMessage("")

      const response = await fetch('/api/api-key', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key')
      }

      setGeneratedApiKey(data.data.apiKey)
      setShowApiKey(true)
      setMessage('API key generated successfully!')
      fetchApiKeyInfo() // Refresh info
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const revokeApiKey = async () => {
    if (!confirm('Are you sure you want to revoke the API key? This will immediately disable all API access.')) {
      return
    }

    try {
      setIsRevoking(true)
      setError("")
      setMessage("")

      const response = await fetch('/api/api-key', {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke API key')
      }

      setGeneratedApiKey(null)
      setShowApiKey(false)
      setMessage('API key revoked successfully!')
      fetchApiKeyInfo() // Refresh info
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsRevoking(false)
    }
  }

  const copyApiKey = async () => {
    if (generatedApiKey) {
      try {
        await navigator.clipboard.writeText(generatedApiKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy API key:', err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Key className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-secondary-900">Loading API Key...</h2>
        </div>
      </div>
    )
  }

  if (!apiKeyInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Key className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Error Loading API Key</h2>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Button onClick={fetchApiKeyInfo}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Key className="h-8 w-8 text-[#7F56D9] mr-3" />
            API Key Management
          </h1>
          <p className="text-gray-600 mt-2">Manage your API access for third-party integrations</p>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-green-700">{message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* API Key Status */}
          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-[#7F56D9]" />
                  API Key Status
                </h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  apiKeyInfo.hasApiKey || generatedApiKey
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {apiKeyInfo.hasApiKey || generatedApiKey ? 'Active' : 'Not Generated'}
                </div>
              </div>

              {apiKeyInfo.hasApiKey || generatedApiKey ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-medium">API Key is active</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Your API key is ready for use in third-party integrations
                    </p>
                  </div>

                  {/* Show existing API keys */}
                  {apiKeyInfo.apiKeys && Array.isArray(apiKeyInfo.apiKeys) && apiKeyInfo.apiKeys.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900">Existing API Keys</h3>
                      {apiKeyInfo.apiKeys.map((key) => (
                        <div key={key.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm text-gray-600">{key.keyPrefix}••••••••</span>
                                <span className="text-xs text-gray-500">({key.name})</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Created {new Date(key.createdAt).toLocaleDateString()} by {key.createdBy}
                                {key.lastUsedAt && (
                                  <span> • Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => revokeApiKey()}
                              disabled={isRevoking}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show generated API key if available */}
                  {generatedApiKey && (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center mb-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="text-yellow-800 font-medium">Important</span>
                        </div>
                        <p className="text-yellow-700 text-sm">
                          This is the only time you'll see your API key. Copy it now and store it securely.
                        </p>
                      </div>

                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={generatedApiKey}
                          readOnly
                          className="pr-20 bg-gray-50 font-mono text-sm"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyApiKey}
                          >
                            {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        {copied ? "Copied to clipboard!" : "Click the copy button to copy your API key"}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="flex items-center bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] hover:opacity-90 text-white"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate New API Key"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="text-gray-800 font-medium">No API Key</span>
                    </div>
                    <p className="text-gray-700 text-sm mt-1">
                      Generate an API key to enable third-party integrations
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Use this key to connect your Avenai Copilot to your dev environment or sandbox.
                    </p>
                    <Button
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="w-full flex items-center bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] hover:opacity-90 text-white"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate API Key"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
        
        {/* Pilot Limits Info Banner */}
        <Card className="p-4 bg-gradient-to-r from-[#7F56D9]/10 to-[#9E77ED]/10 border-[#7F56D9]/20 mt-6">
          <div className="flex items-start">
            <div className="p-2 bg-[#7F56D9] rounded-lg mr-3">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">Pilot Program Limits</p>
              <p className="text-xs text-[#6B7280]">
                These limits apply during your evaluation period. Contact us if you need extended access.
              </p>
            </div>
          </div>
        </Card>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Usage Statistics */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#7F56D9]" />
              Usage Statistics
            </h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Activity className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Requests (Last 30 days)</p>
                  <p className="font-medium text-gray-900">{apiKeyInfo.usage.requestsLast30Days.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Used</p>
                  <p className="font-medium text-gray-900">
                    {apiKeyInfo.usage.lastUsed ? new Date(apiKeyInfo.usage.lastUsed).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Usage Limits */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#9E77ED]" />
              Usage Limits
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Requests per minute</span>
                <span className="font-semibold text-gray-900">{apiKeyInfo.limits.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Requests per day</span>
                <span className="font-semibold text-gray-900">{apiKeyInfo.limits.requestsPerDay.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Max documents</span>
                <span className="font-semibold text-gray-900">{apiKeyInfo.limits.documentsMax.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* API Documentation */}
        <Card className="p-6 mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
              <BookOpen className="h-5 w-5 mr-2 text-[#7F56D9]" />
              Getting Started
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Both resources help you integrate Avenai into your workflow — but they serve different purposes. 
              Use the example below to query your Copilot via API.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Chat Endpoint
              </h3>
              <code className="text-sm text-gray-700 block mb-2 bg-white p-2 rounded border">
                POST /api/v1/chat
              </code>
              <p className="text-sm text-gray-600">
                Send messages to your AI assistant with document context
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Authentication
              </h3>
              <code className="text-sm text-gray-700 block mb-2 bg-white p-2 rounded border">
                X-API-Key: your_api_key_here
              </code>
              <p className="text-sm text-gray-600">
                Include your API key in the X-API-Key header
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Terminal className="h-4 w-4 mr-2" />
                Example Request
              </h3>
              <pre className="text-xs text-gray-700 bg-white p-3 rounded border overflow-x-auto">
{`curl -X POST https://your-domain.com/api/v1/chat \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "How do I integrate your API?"}'`}
              </pre>
            </div>

            {/* Resource Links */}
            <div className="border-t pt-4 mt-6">
              <p className="text-xs text-gray-500 mb-3 font-medium">Choose your integration approach:</p>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => window.location.href = '/integration-guide'}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Quick Start Guide
                </Button>
                <Button 
                  variant="outline" 
                  className="flex items-center"
                  onClick={() => window.open('https://docs.avenai.io/api', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Documentation
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
