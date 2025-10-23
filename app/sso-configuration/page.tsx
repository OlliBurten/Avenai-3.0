'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Shield, 
  Save, 
  RefreshCw, 
  Crown,
  Lock,
  CheckCircle,
  AlertCircle,
  Key,
  Users,
  Settings
} from 'lucide-react'

interface SsoSettings {
  enabled: boolean
  provider: string
  saml: {
    entityId: string
    ssoUrl: string
    x509Certificate: string
    nameIdFormat: string
  }
  oauth: {
    clientId: string
    clientSecret: string
    authorizationUrl: string
    tokenUrl: string
    userInfoUrl: string
    scope: string
  }
  custom: {
    loginUrl: string
    logoutUrl: string
    userInfoUrl: string
    apiKey: string
  }
  autoProvisioning: boolean
  roleMapping: {
    defaultRole: string
    attributeMappings: {
      email: string
      name: string
      role: string
    }
  }
}

export default function SsoConfiguration() {
  const { user, loading } = useAuth()
  const [settings, setSettings] = useState<SsoSettings>({
    enabled: false,
    provider: 'saml',
    saml: {
      entityId: '',
      ssoUrl: '',
      x509Certificate: '',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    },
    oauth: {
      clientId: '',
      clientSecret: '',
      authorizationUrl: '',
      tokenUrl: '',
      userInfoUrl: '',
      scope: 'openid email profile'
    },
    custom: {
      loginUrl: '',
      logoutUrl: '',
      userInfoUrl: '',
      apiKey: ''
    },
    autoProvisioning: true,
    roleMapping: {
      defaultRole: 'MEMBER',
      attributeMappings: {
        email: 'email',
        name: 'name',
        role: 'role'
      }
    }
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<string>('FREE')

  useEffect(() => {
    if (user) {
      fetchSsoSettings()
    }
  }, [user])

  const fetchSsoSettings = async () => {
    try {
      const response = await fetch('/api/sso-settings', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.settings)
        setSubscriptionTier(data.subscriptionTier)
      }
    } catch (error) {
      console.error('Error fetching SSO settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/sso-settings', {
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

  const testSsoConnection = async () => {
    if (!user?.organizationId) return
    
    try {
      const response = await fetch(`/api/sso/${settings.provider}?org=${user.organizationId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        alert('SSO connection test successful!')
      } else {
        const error = await response.json()
        alert(`SSO test failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error testing SSO:', error)
      alert('Failed to test SSO connection')
    }
  }

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
          <p className="text-gray-600 mb-6">Please sign in to configure SSO.</p>
          <a href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  if (subscriptionTier !== 'ENTERPRISE') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Crown className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Enterprise Feature</h1>
          <p className="text-gray-600 mb-6">
            SSO integration requires Enterprise subscription for security and compliance.
          </p>
          <a href="/billing" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg">
            Upgrade to Enterprise
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
                <Shield className="h-8 w-8 mr-3 text-purple-600" />
                SSO Configuration
              </h1>
              <p className="text-gray-600 mt-2">
                Configure Single Sign-On for your organization
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                <Crown className="h-4 w-4 mr-1" />
                Enterprise
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SSO Settings Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">SSO Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable SSO
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable Single Sign-On for your organization
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SSO Provider
                  </label>
                  <select
                    value={settings.provider}
                    onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="saml">SAML 2.0</option>
                    <option value="oauth">OAuth 2.0 / OpenID Connect</option>
                    <option value="custom">Custom Provider</option>
                  </select>
                </div>

                {/* SAML Configuration */}
                {settings.provider === 'saml' && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900">SAML Configuration</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entity ID
                      </label>
                      <Input
                        value={settings.saml.entityId}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          saml: { ...settings.saml, entityId: e.target.value }
                        })}
                        placeholder="https://yourcompany.com/saml"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SSO URL
                      </label>
                      <Input
                        value={settings.saml.ssoUrl}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          saml: { ...settings.saml, ssoUrl: e.target.value }
                        })}
                        placeholder="https://yourcompany.com/sso"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        X.509 Certificate
                      </label>
                      <Textarea
                        value={settings.saml.x509Certificate}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          saml: { ...settings.saml, x509Certificate: e.target.value }
                        })}
                        placeholder="-----BEGIN CERTIFICATE-----..."
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* OAuth Configuration */}
                {settings.provider === 'oauth' && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900">OAuth Configuration</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client ID
                      </label>
                      <Input
                        value={settings.oauth.clientId}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          oauth: { ...settings.oauth, clientId: e.target.value }
                        })}
                        placeholder="your-client-id"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Secret
                      </label>
                      <Input
                        type="password"
                        value={settings.oauth.clientSecret}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          oauth: { ...settings.oauth, clientSecret: e.target.value }
                        })}
                        placeholder="your-client-secret"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Authorization URL
                      </label>
                      <Input
                        value={settings.oauth.authorizationUrl}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          oauth: { ...settings.oauth, authorizationUrl: e.target.value }
                        })}
                        placeholder="https://yourprovider.com/oauth/authorize"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Token URL
                      </label>
                      <Input
                        value={settings.oauth.tokenUrl}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          oauth: { ...settings.oauth, tokenUrl: e.target.value }
                        })}
                        placeholder="https://yourprovider.com/oauth/token"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Info URL
                      </label>
                      <Input
                        value={settings.oauth.userInfoUrl}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          oauth: { ...settings.oauth, userInfoUrl: e.target.value }
                        })}
                        placeholder="https://yourprovider.com/oauth/userinfo"
                      />
                    </div>
                  </div>
                )}

                {/* Role Mapping */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Mapping</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Role
                    </label>
                    <select
                      value={settings.roleMapping.defaultRole}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        roleMapping: { ...settings.roleMapping, defaultRole: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoProvisioning}
                        onChange={(e) => setSettings({ ...settings, autoProvisioning: e.target.checked })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Auto-provision users
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically create user accounts for new SSO users
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-3">
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
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
                  
                  <Button
                    onClick={testSsoConnection}
                    disabled={!settings.enabled}
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
                
                {saved && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Saved!</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* SSO Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                SSO Information
              </h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">SAML 2.0</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    Industry standard for enterprise SSO. Supports most identity providers including:
                  </p>
                  <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
                    <li>Microsoft Azure AD</li>
                    <li>Okta</li>
                    <li>Ping Identity</li>
                    <li>OneLogin</li>
                    <li>Google Workspace</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">OAuth 2.0 / OpenID Connect</h3>
                  <p className="text-green-800 text-sm mb-2">
                    Modern authentication protocol. Supports providers like:
                  </p>
                  <ul className="text-green-800 text-sm list-disc list-inside space-y-1">
                    <li>Google</li>
                    <li>Microsoft</li>
                    <li>GitHub</li>
                    <li>Auth0</li>
                    <li>Custom OAuth providers</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 mb-2">Custom Provider</h3>
                  <p className="text-purple-800 text-sm">
                    Integrate with any custom authentication system using API endpoints.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Integration URLs
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SAML SSO URL
                  </label>
                  <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                    {process.env.NEXT_PUBLIC_APP_URL}/api/sso/saml?org={user.organizationId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OAuth Callback URL
                  </label>
                  <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                    {process.env.NEXT_PUBLIC_APP_URL}/api/sso/oauth?org={user.organizationId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity ID (for SAML)
                  </label>
                  <div className="bg-gray-100 p-2 rounded text-sm font-mono break-all">
                    {process.env.NEXT_PUBLIC_APP_URL}/api/sso/saml?org={user.organizationId}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
