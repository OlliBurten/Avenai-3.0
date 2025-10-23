"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Copy, 
  Check, 
  Code, 
  Globe, 
  Settings, 
  Play, 
  ArrowLeft,
  Bot,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

export default function EmbedInstructionsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'html' | 'react' | 'vue'>('html')
  const [testUrl, setTestUrl] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img src="/logo-mark-black.svg" alt="Loading..." className="h-16 w-16 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading embed instructions...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const organizationId = user.organizationId
  const embedCode = `<script src="https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}"></script>`
  
  const htmlCode = `<!-- Add this to your HTML <head> section -->
<script src="https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}"></script>

<!-- Or add it before closing </body> tag -->
<script src="https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}"></script>`

  const reactCode = `// Add to your React app's public/index.html
<script src="https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}"></script>

// Or use useEffect in your main component
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}'
    script.async = true
    document.head.appendChild(script)
    
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  )
}`

  const vueCode = `// Add to your Vue app's public/index.html
<script src="https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}"></script>

// Or use mounted hook in your main component
export default {
  mounted() {
    const script = document.createElement('script')
    script.src = 'https://avenai-3-0-9z2452haf-avenai.vercel.app/api/widget?org=${organizationId}'
    script.async = true
    document.head.appendChild(script)
  }
}`

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const testEmbed = () => {
    if (testUrl.trim()) {
      window.open(testUrl, '_blank')
    } else {
      alert('Please enter a URL to test your embed')
    }
  }

  const markAsComplete = async () => {
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ stepId: 'embed-widget', completed: true }),
      })
      
      // Redirect back to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to mark embed as complete:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center gap-3 h-10">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 grid place-items-center">
                <Bot className="size-5 text-white" />
              </div>
              <span className="text-2xl font-semibold text-gray-900 leading-[1]">
                Avenai
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Embed Your Chat Widget
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Add Avenai's AI chat widget to your website with just one line of code. 
            Your customers will get instant, intelligent support.
          </p>
        </div>

        {/* Organization Info */}
        <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Your Organization</h3>
              <p className="text-blue-700">
                Organization ID: <code className="bg-blue-100 px-2 py-1 rounded text-sm font-mono">{organizationId}</code>
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Embed */}
        <Card className="p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Quick Embed</h2>
            <Button
              onClick={() => copyToClipboard(embedCode)}
              className="flex items-center space-x-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </Button>
          </div>
          
          <div className="bg-gray-900 text-gray-100 p-6 rounded-xl font-mono text-sm overflow-x-auto">
            <div className="text-green-400 mb-2">// Add this to your website</div>
            <div className="text-blue-300">{embedCode}</div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">That's it! The widget will automatically appear on your website.</span>
            </div>
          </div>
        </Card>

        {/* Platform-Specific Instructions */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform-Specific Instructions</h2>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'html', label: 'HTML', icon: Code },
              { id: 'react', label: 'React', icon: Settings },
              { id: 'vue', label: 'Vue', icon: Globe }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-gray-900 text-gray-100 p-6 rounded-xl font-mono text-sm overflow-x-auto">
            <pre className="whitespace-pre-wrap">
              {activeTab === 'html' && htmlCode}
              {activeTab === 'react' && reactCode}
              {activeTab === 'vue' && vueCode}
            </pre>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => copyToClipboard(
                activeTab === 'html' ? htmlCode :
                activeTab === 'react' ? reactCode : vueCode
              )}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </Button>
          </div>
        </Card>

        {/* Test Your Embed */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Test Your Embed</h2>
          <p className="text-gray-600 mb-6">
            Enter your website URL to test how the widget will appear to your customers.
          </p>
          
          <div className="flex space-x-4">
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={testEmbed}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Test Embed</span>
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800">
                This will open your website with the Avenai widget embedded for testing.
              </span>
            </div>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Troubleshooting</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900">Widget not appearing?</h4>
                <p className="text-gray-600">
                  Make sure the script is placed in the &lt;head&gt; section or before the closing &lt;/body&gt; tag.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900">Script blocked by ad blockers?</h4>
                <p className="text-gray-600">
                  Some ad blockers may block the widget. Consider adding a fallback or informing users to whitelist your site.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900">Need help?</h4>
                <p className="text-gray-600">
                  Contact our support team or check our documentation for more detailed integration guides.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Complete Step */}
        <div className="text-center">
          <Button
            onClick={markAsComplete}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Mark Embed Step as Complete
          </Button>
          <p className="text-gray-600 mt-4">
            This will complete your onboarding and return you to the dashboard.
          </p>
        </div>
      </main>
    </div>
  )
}
