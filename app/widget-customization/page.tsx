'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Palette, 
  Eye, 
  Save, 
  RefreshCw, 
  Crown,
  Lock,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react'

interface WidgetSettings {
  title: string
  subtitle: string
  primaryColor: string
  showBranding: boolean
  position: string
  welcomeMessage: string
  customLogo: string
  customDomain: string
  // Enterprise white-label settings
  whiteLabel: boolean
  customCss: string
  customJs: string
  hideAvenaiFooter: boolean
  customApiEndpoint: string
}

export default function WidgetCustomization() {
  const { user, loading } = useAuth()
  const [settings, setSettings] = useState<WidgetSettings>({
    title: 'AI Assistant',
    subtitle: 'How can I help you today?',
    primaryColor: '#3B82F6',
    showBranding: false,
    position: 'bottom-right',
    welcomeMessage: 'Hello! I\'m here to help with your questions.',
    customLogo: '',
    customDomain: '',
    // Enterprise white-label settings
    whiteLabel: false,
    customCss: '',
    customJs: '',
    hideAvenaiFooter: false,
    customApiEndpoint: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('FREE')

  useEffect(() => {
    if (user) {
      fetchWidgetSettings()
    }
  }, [user])

  const fetchWidgetSettings = async () => {
    try {
      const response = await fetch('/api/widget-settings', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.settings)
        setSubscriptionTier(data.subscriptionTier)
      }
    } catch (error) {
      console.error('Error fetching widget settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/widget-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settings })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const canCustomizeBranding = subscriptionTier === 'PRO' || subscriptionTier === 'ENTERPRISE'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to customize your widget.</p>
          <a href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Palette className="h-8 w-8 mr-3 text-blue-600" />
                Widget Customization
              </h1>
              <p className="text-gray-600 mt-2">
                Customize your AI chat widget appearance and branding
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {subscriptionTier === 'PRO' && (
                <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Crown className="h-4 w-4 mr-1" />
                  Pro
                </div>
              )}
              {subscriptionTier === 'ENTERPRISE' && (
                <div className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Crown className="h-4 w-4 mr-1" />
                  Enterprise
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Warning */}
        {!canCustomizeBranding && (
          <Card className="p-6 mb-8 border-orange-200 bg-orange-50">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-orange-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900 mb-2">
                  Custom Branding Requires Pro or Enterprise
                </h3>
                <p className="text-orange-700 mb-4">
                  Remove Avenai branding and customize your widget with Pro or Enterprise subscription.
                </p>
                <Button 
                  onClick={() => window.location.href = '/billing'}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Settings Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Widget Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Widget Title
                  </label>
                  <Input
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    placeholder="AI Assistant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle
                  </label>
                  <Input
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    placeholder="How can I help you today?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <Textarea
                    value={settings.welcomeMessage}
                    onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                    placeholder="Hello! I'm here to help with your questions."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <select
                    value={settings.position}
                    onChange={(e) => setSettings({ ...settings, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>

                {canCustomizeBranding && (
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!settings.showBranding}
                        onChange={(e) => setSettings({ ...settings, showBranding: !e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Remove Avenai Branding
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Hide "Powered by Avenai" and use your own branding
                    </p>
                  </div>
                )}

                {/* Enterprise White-Label Settings */}
                {subscriptionTier === 'ENTERPRISE' && (
                  <>
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Crown className="h-5 w-5 mr-2 text-purple-600" />
                        Enterprise White-Label Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.whiteLabel}
                              onChange={(e) => setSettings({ ...settings, whiteLabel: e.target.checked })}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Enable White-Label Mode
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Complete rebranding with zero Avenai references
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={settings.hideAvenaiFooter}
                              onChange={(e) => setSettings({ ...settings, hideAvenaiFooter: e.target.checked })}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Hide Avenai Footer
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Remove "Powered by Avenai" footer completely
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Domain
                          </label>
                          <Input
                            value={settings.customDomain}
                            onChange={(e) => setSettings({ ...settings, customDomain: e.target.value })}
                            placeholder="yourdomain.com"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Domain where the white-label widget will be hosted
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom CSS
                          </label>
                          <Textarea
                            value={settings.customCss}
                            onChange={(e) => setSettings({ ...settings, customCss: e.target.value })}
                            placeholder="/* Custom CSS styles */"
                            rows={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Add custom CSS to completely customize the widget appearance
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom JavaScript
                          </label>
                          <Textarea
                            value={settings.customJs}
                            onChange={(e) => setSettings({ ...settings, customJs: e.target.value })}
                            placeholder="// Custom JavaScript code"
                            rows={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Add custom JavaScript for advanced functionality
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom API Endpoint
                          </label>
                          <Input
                            value={settings.customApiEndpoint}
                            onChange={(e) => setSettings({ ...settings, customApiEndpoint: e.target.value })}
                            placeholder="https://yourdomain.com/api/chat"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Optional: Use your own API endpoint for chat requests
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
                
                {saved && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Saved!</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Live Preview
              </h2>
              
              <div className="bg-gray-100 rounded-lg p-4 min-h-[400px] relative">
                <div className="text-center text-gray-500 mb-4">
                  Widget Preview
                </div>
                
                {/* Simulated Widget */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm mx-auto">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        {settings.customLogo || '✨'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {settings.title}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {settings.showBranding ? 'Powered by Avenai' : settings.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="p-4 space-y-3">
                    <div className="bg-gray-100 rounded-lg p-3 text-sm">
                      {settings.welcomeMessage}
                    </div>
                    <div className="text-right">
                      <div 
                        className="inline-block rounded-lg p-3 text-sm text-white"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        How do I get started?
                      </div>
                    </div>
                  </div>
                  
                  {/* Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled
                      />
                      <button
                        className="px-4 py-2 rounded-lg text-sm text-white font-medium"
                        style={{ backgroundColor: settings.primaryColor }}
                        disabled
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Integration Code */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Integration Code</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/integration-guide'}
                  className="text-xs"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Full Guide
                </Button>
              </div>
              <p className="text-gray-600 mb-4">
                {subscriptionTier === 'ENTERPRISE' && settings.whiteLabel 
                  ? 'White-label widget integration options:'
                  : 'Add this script to your website to embed your customized widget:'
                }
              </p>
              
              {subscriptionTier === 'ENTERPRISE' && settings.whiteLabel ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Option 1: White-Label Widget</h3>
                    <p className="text-gray-600 mb-2">Complete white-label widget with zero Avenai branding:</p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                      <div className="text-green-400 mb-2">// White-label widget (no Avenai branding)</div>
                      <div className="text-blue-300 break-all">
                        {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://avenai.io'}/api/widget-white-label?org=${user.organizationId}"></script>`}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Option 2: Custom Domain</h3>
                    <p className="text-gray-600 mb-2">Host the widget on your own domain:</p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                      <div className="text-green-400 mb-2">// Custom domain widget</div>
                      <div className="text-blue-300 break-all">
                        {`<script src="${settings.customDomain || 'yourdomain.com'}/api/widget-white-label?org=${user.organizationId}"></script>`}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Option 3: Standard Widget</h3>
                    <p className="text-gray-600 mb-2">Standard widget with Pro customization:</p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                      <div className="text-green-400 mb-2">// Standard widget</div>
                      <div className="text-blue-300 break-all">
                        {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://avenai.io'}/api/widget?org=${user.organizationId}"></script>`}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                  <div className="text-green-400 mb-2">// Add this to your website</div>
                  <div className="text-blue-300 break-all">
                    {`<script src="${process.env.NEXT_PUBLIC_APP_URL || 'https://avenai.io'}/api/widget?org=${user.organizationId}"></script>`}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
