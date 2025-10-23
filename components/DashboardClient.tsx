"use client"

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bot, Upload, MessageSquare, BarChart3, Plus, FileText, Users, TrendingUp, Clock, Activity, Zap, Key, HardDrive, ArrowRight } from 'lucide-react'
import DocumentList from '@/components/DocumentList'
import { SharedChatState } from '@/components/workspace'
import Analytics from '@/components/Analytics'
import Onboarding from '@/components/Onboarding'
import ProductTour from '@/components/tour/ProductTour'
import { useDashboardTour } from '@/components/tour/useTour'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function DashboardContent() {
  const { data: session, status } = useSession()
  const user = session?.user
  const loading = status === 'loading'
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    // Check localStorage on initial load
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-dismissed') === 'true'
    }
    return false
  })
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab') || 'overview'

  // Tour system
  const { open: tourOpen, close: closeTour, replay: replayTour } = useDashboardTour()

  const tourSteps = useMemo(() => ([
    {
      id: 'create-dataset',
      title: 'Create your first dataset',
      body: 'Organize your documentation by product, project, or team. Click "New Dataset" to get started.',
      target: '#new-dataset-btn',
      placement: 'bottom' as const,
    },
    {
      id: 'upload-docs',
      title: 'Upload your docs',
      body: 'Supported formats: PDF, Markdown, TXT, and OpenAPI specs up to 10MB. Drag & drop or click to upload.',
      target: '#upload-docs-btn',
      placement: 'bottom' as const,
    },
    {
      id: 'test-chat',
      title: 'Test the chat',
      body: 'Ask questions about your docs! Try: "What endpoints require OAuth?" or "How do I authenticate?"',
      target: '#open-chat-btn',
      placement: 'bottom' as const,
    },
  ]), [])

  // Handle authentication redirect and onboarding check
  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth/signin')
    } else if (user && !loading) {
      // Check if user needs onboarding
      checkOnboardingStatus()
    }
  }, [user, loading, router])

  // Clean up onboarding completion cookie on dashboard load
  useEffect(() => {
    try { 
      document.cookie = "avenai_onb=; Max-Age=0; Path=/"; 
    } catch {}
  }, [])

  useEffect(() => {
    if (!loading && user) {
      // Check if user needs onboarding (only if not dismissed)
      if (!onboardingDismissed) {
        checkOnboardingStatus()
      }
      // Fetch analytics data
      fetchAnalyticsData()
    }
  }, [user, loading, onboardingDismissed])

  const fetchAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true)
      const response = await fetch('/api/analytics/overview', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.warn('Analytics fetch non-OK:', response.status)
        setAnalyticsData({
          overview: {
            totalDocuments: 0,
            totalChatSessions: 0,
            totalMessages: 0,
            totalApiKeys: 0,
            totalSize: 0
          },
          requiresUpgrade: true,
          error: 'Unable to load analytics data',
          degraded: true
        })
        setAnalyticsLoading(false)
        return
      }
      
      const data = await response.json()
      console.log('Analytics data received:', data)
      
      // Map the new API response format to the expected dashboard format
      setAnalyticsData({
        overview: {
          totalDocuments: data.documents ?? 0,
          totalChatSessions: data.chats ?? 0,
          totalMessages: data.responses ?? 0,
          totalApiKeys: data.apiKeys ?? 0,
          totalSize: data.storageBytes ?? 0
        },
        requiresUpgrade: data.documents === 0 && data.chats === 0, // Show upgrade prompt if everything is zero (likely new account)
        degraded: !!data.degraded
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      // Set fallback data to prevent showing 0s
      setAnalyticsData({
        overview: {
          totalDocuments: 0,
          totalChatSessions: 0,
          totalMessages: 0,
          totalApiKeys: 0,
          totalSize: 0
        },
        requiresUpgrade: true,
        error: 'Failed to load analytics data',
        degraded: true
      })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok && !data.completed) {
        // Redirect to onboarding instead of showing modal
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('Onboarding check error:', error)
      // Don't redirect if there's an error
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setOnboardingDismissed(true)
    // Save dismissal to localStorage
    localStorage.setItem('onboarding-dismissed', 'true')
    // Refresh analytics data to update progress
    fetchAnalyticsData()
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
    setOnboardingDismissed(true)
    // Save dismissal to localStorage
    localStorage.setItem('onboarding-dismissed', 'true')
    // Refresh analytics data to update progress
    fetchAnalyticsData()
  }

  const handleOnboardingClose = () => {
    setShowOnboarding(false)
    setOnboardingDismissed(true)
    // Save dismissal to localStorage
    localStorage.setItem('onboarding-dismissed', 'true')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user && !loading) {
    return null
  }

  // Ensure user exists before rendering
  if (!user) {
    return null
  }

  return (
    <>
      <ProductTour open={tourOpen} onClose={closeTour} steps={tourSteps} />
      <div className="p-6">
        {/* Content */}
        <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.name?.split(' ')[0] || 'there'}.
                </h1>
                <p className="text-gray-600">Here's what's happening with your AI documentation.</p>
                {analyticsData?.degraded && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-2">
                    📊 Analytics in reduced mode
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={replayTour}
                  className="text-sm"
                >
                  Replay Tour
                </Button>
                <Button
                  id="new-dataset-btn"
                  onClick={() => router.push('/datasets/new')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Dataset
                </Button>
                <Button
                  id="upload-docs-btn"
                  variant="outline"
                  onClick={() => router.push('/datasets')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
                <Button
                  id="open-chat-btn"
                  variant="outline"
                  onClick={() => router.push('/datasets')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Chat
                </Button>
              </div>
            </div>
            
            {/* Pro Upgrade Prompt for Analytics */}
            {analyticsData?.requiresUpgrade && (
              <Card className="p-6 mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg mr-4">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Unlock Advanced Analytics
                      </h3>
                      <p className="text-gray-600">
                        {analyticsData?.upgradeMessage || 'Get detailed insights into your widget performance, user engagement, and popular questions.'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => router.push('/billing')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Quick Stats Grid */}
            <div id="dashboard-main" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Documents</p>
                    {analyticsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-blue-600 mt-2">
                          {analyticsData?.overview?.totalDocuments || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Total uploaded</p>
                        {analyticsData?.overview?.documentGrowthRate && !analyticsData?.requiresUpgrade && (
                          <div className="flex items-center mt-2">
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600">
                              +{analyticsData.overview.documentGrowthRate} this month
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Chat Sessions</p>
                    {analyticsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          {analyticsData?.overview?.totalChatSessions || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Conversations</p>
                        {analyticsData?.overview?.sessionGrowthRate && !analyticsData?.requiresUpgrade && (
                          <div className="flex items-center mt-2">
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-xs text-green-600">
                              +{analyticsData.overview.sessionGrowthRate} this month
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Responses</p>
                    {analyticsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-purple-600 mt-2">
                          {analyticsData?.overview?.totalMessages || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Questions answered</p>
                        {analyticsData?.overview?.messagesInRange && !analyticsData?.requiresUpgrade && (
                          <div className="flex items-center mt-2">
                            <Activity className="h-4 w-4 text-purple-600 mr-1" />
                            <span className="text-xs text-purple-600">
                              {analyticsData.overview.messagesInRange} this month
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Bot className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">API Keys</p>
                    {analyticsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-orange-700 mt-2">
                          {analyticsData?.overview?.totalApiKeys || 0}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Active keys</p>
                        <div className="flex items-center mt-2">
                          <Key className="h-4 w-4 text-orange-700 mr-1" />
                          <span className="text-xs text-orange-700">
                            {(session.user as any)?.organization?.name || 'Loading...'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Key className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Storage Used</p>
                    {analyticsLoading ? (
                      <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-indigo-600 mt-2">
                          {analyticsData?.overview?.totalSize ? 
                            (analyticsData.overview.totalSize / 1024 / 1024).toFixed(1) : '0.0'
                          }MB
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Total size</p>
                        <div className="flex items-center mt-2">
                          <HardDrive className="h-4 w-4 text-indigo-600 mr-1" />
                          <span className="text-xs text-indigo-600">
                            {analyticsData?.overview?.totalDocuments || 0} files
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <HardDrive className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Empty State for New Users */}
            {analyticsData?.overview?.totalDocuments === 0 && (
              <Card className="p-8 text-center border-purple-200 bg-purple-50">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create your first dataset to start chatting with your docs.
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Upload PDFs, Markdown, or text files to build your AI knowledge base.
                  </p>
                  <Button
                    onClick={() => router.push('/datasets')}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Dataset
                  </Button>
                </div>
              </Card>
            )}

            {/* Next Steps Cards - Cursor Style */}
            {analyticsData?.overview?.totalDocuments === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Next Steps</h2>
                  <p className="text-gray-600">Complete these steps to get the most out of Avenai</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Step 1: Upload Documents */}
                  <Card className="p-6 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => router.push('/datasets')}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-200">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-full">Step 1</span>
                          <span className="text-sm text-purple-600">Required</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h3>
                        <p className="text-sm text-gray-600 mb-4">Drop PDFs, Markdown, or OpenAPI specs to build your knowledge base</p>
                        <div className="flex items-center text-sm text-purple-600 font-medium group-hover:text-purple-700">
                          Get started <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Step 2: Test Chat */}
                  <Card className="p-6 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => router.push('/datasets')}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-200">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">Step 2</span>
                          <span className="text-sm text-blue-600">After upload</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Your AI Chat</h3>
                        <p className="text-sm text-gray-600 mb-4">Ask questions about your docs and see how the AI responds</p>
                        <div className="flex items-center text-sm text-blue-600 font-medium group-hover:text-blue-700">
                          Try it out <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Step 3: Embed Widget */}
                  <Card className="p-6 border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => router.push('/widget-customization')}>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-600 rounded-xl text-white group-hover:scale-110 transition-transform duration-200">
                        <Zap className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-green-700 bg-green-200 px-2 py-1 rounded-full">Step 3</span>
                          <span className="text-sm text-green-600">Optional</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Embed AI Widget</h3>
                        <p className="text-sm text-gray-600 mb-4">Add the AI chat to your docs or website for your users</p>
                        <div className="flex items-center text-sm text-green-600 font-medium group-hover:text-green-700">
                          Customize <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <div className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/datasets/new')}
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50 hover:border-purple-300"
                >
                  <Plus className="h-6 w-6 text-purple-600" />
                  <span className="text-sm font-medium">Create Dataset</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/datasets')}
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-green-50 hover:border-green-300"
                >
                  <Upload className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">Upload Document</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/datasets')}
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-300"
                >
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Test Chat</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/api-keys')}
                  className="h-20 flex flex-col items-center justify-center space-y-2 hover:bg-orange-50 hover:border-orange-300"
                >
                  <Zap className="h-6 w-6 text-orange-700" />
                  <span className="text-sm font-medium">API Keys</span>
                </Button>
              </div>
            </Card>

            {/* Recent Activity - Pro users only */}
            {analyticsData?.recentActivity && !analyticsData?.requiresUpgrade && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/datasets')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {analyticsData.recentActivity.documents.slice(0, 5).map((doc: any) => (
                      <div key={doc.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-500">by {doc.user} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          doc.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {doc.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Chat Sessions</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/datasets')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {analyticsData.recentActivity.chatSessions.slice(0, 5).map((session: any) => (
                      <div key={session.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Session {session.sessionId.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.userIdentifier} • {new Date(session.lastActivityAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(session.lastActivityAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}


        {activeTab === 'chat-widget' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Chat Widget</h1>
              <p className="text-gray-600">Test your AI chat functionality and configure the widget.</p>
            </div>
            <SharedChatState datasetId={selectedDataset?.id || ''} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
              <p className="text-gray-600">Track usage and performance metrics for your AI documentation.</p>
            </div>
            <Analytics />
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleOnboardingClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close onboarding"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Onboarding 
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default function DashboardClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
