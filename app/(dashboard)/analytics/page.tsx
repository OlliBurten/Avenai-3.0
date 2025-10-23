"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Users, 
  Share2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Activity,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Zap,
  Database,
  Globe,
  Target,
  PieChart,
  LineChart as LineChartIcon,
  Key
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

interface AnalyticsData {
  overview: {
    totalDocuments: number
    totalChatSessions: number
    totalMessages: number
    totalApiKeys: number
    // Pilot metrics (available to all users)
    satisfactionRate?: string
    totalFeedback?: number
    positiveFeedback?: number
    negativeFeedback?: number
    avgResponseTime?: number
    // Pro-only fields (optional for Free users)
    documentsInRange?: number
    documentGrowthRate?: string
    totalChunks?: number
    chunksInRange?: number
    chunkGrowthRate?: string
    chatSessionsInRange?: number
    sessionGrowthRate?: string
    messagesInRange?: number
    totalShares?: number
    sharesInRange?: number
    totalUsers?: number
  }
  // Pilot metrics
  confidenceDistribution?: Array<{
    level: string
    count: number
    percentage: string
  }>
  topQueries?: Array<{
    query: string
    count: number
  }>
  subscriptionTier: string
  isProUser: boolean
  requiresUpgrade?: boolean
  upgradeMessage?: string
  // Pro-only fields (optional for Free users)
  documentStatusBreakdown?: Array<{
    status: string
    count: number
  }>
  recentActivity?: {
    documents: Array<{
      id: string
      title: string
      status: string
      createdAt: string
      user: string
    }>
    chatSessions: Array<{
      id: string
      sessionId: string
      userIdentifier: string
      lastActivityAt: string
    }>
  }
  dailyActivity?: Array<{
    date: string
    documents: number
    sessions: number
    messages: number
  }>
  timeRange?: number
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('area')
  const [showExport, setShowExport] = useState(false)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics')
      }

      setAnalyticsData(data.data) // Extract the actual analytics data from the wrapped response
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100'
      case 'PROCESSING': return 'text-yellow-600 bg-yellow-100'
      case 'FAILED': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGrowthIcon = (rate: string) => {
    const numRate = parseFloat(rate.replace('%', ''))
    return numRate >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getGrowthColor = (rate: string) => {
    const numRate = parseFloat(rate.replace('%', ''))
    return numRate >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const exportData = () => {
    if (!analyticsData) return
    
    const csvContent = [
      ['Metric', 'Total', 'In Range', 'Growth Rate'],
      ['Documents', analyticsData.overview.totalDocuments, analyticsData.overview.documentsInRange, analyticsData.overview.documentGrowthRate],
      ['Chunks', analyticsData.overview.totalChunks, analyticsData.overview.chunksInRange, analyticsData.overview.chunkGrowthRate],
      ['Chat Sessions', analyticsData.overview.totalChatSessions, analyticsData.overview.chatSessionsInRange, analyticsData.overview.sessionGrowthRate],
      ['Messages', analyticsData.overview.totalMessages, analyticsData.overview.messagesInRange, 'N/A'],
      ['Shares', analyticsData.overview.totalShares, analyticsData.overview.sharesInRange, 'N/A'],
      ['Users', analyticsData.overview.totalUsers, 'N/A', 'N/A']
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avenai-analytics-${timeRange}days.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const chartColors = {
    documents: '#3B82F6',
    sessions: '#10B981', 
    messages: '#8B5CF6',
    shares: '#F59E0B'
  }

  const pieColors = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-secondary-900">Loading Analytics...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Error Loading Analytics</h2>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900">No Analytics Data</h2>
        </div>
      </div>
    )
  }

  // Show upgrade prompt for Free users
  if (analyticsData.requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-[#6D5EF9] mr-3" />
              Analytics Dashboard
            </h1>
            <p className="text-[#6B7280] mt-2">You're viewing live metrics for your Avenai Pilot Program</p>
            <p className="text-sm text-[#6B7280] mt-1">All analytics data helps us improve your onboarding copilot</p>
          </div>

          {/* Pilot Program Status Banner */}
          <div className="mb-8">
            <Card className="p-6 bg-gradient-to-r from-[#6D5EF9]/10 to-[#A78BFA]/10 border-[#6D5EF9]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-[#6D5EF9] rounded-full mr-4">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A1A1A]">Avenai Pilot Program</h3>
                    <p className="text-sm text-[#6B7280]">6-8 week program • Full access • Free during pilot</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#6B7280]">Program Duration</div>
                  <div className="text-lg font-semibold text-[#6D5EF9]">6-8 weeks</div>
                </div>
              </div>
            </Card>
          </div>


          {/* Pilot Metrics Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A1A] flex items-center">
                <Target className="h-6 w-6 text-[#6D5EF9] mr-2" />
                Copilot Performance
              </h2>
            </div>

            {/* Pilot KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Satisfaction Rate */}
              <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#6D5EF9]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280] font-medium">Satisfaction</p>
                    <p className="text-3xl font-bold text-[#6D5EF9] mt-1">
                      {analyticsData.overview.satisfactionRate || '0'}%
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {analyticsData.overview.positiveFeedback || 0} 👍 / {analyticsData.overview.negativeFeedback || 0} 👎
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#A78BFA]/10 to-[#6D5EF9]/10 rounded-full">
                    <TrendingUp className="h-8 w-8 text-[#6D5EF9]" />
                  </div>
                </div>
              </Card>

              {/* Total Queries */}
              <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#A78BFA]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280] font-medium">Total Queries</p>
                    <p className="text-3xl font-bold text-[#A78BFA] mt-1">
                      {formatNumber(analyticsData.overview.totalMessages)}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {formatNumber(analyticsData.overview.totalChatSessions)} sessions
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#A78BFA]/10 to-[#6D5EF9]/10 rounded-full">
                    <MessageSquare className="h-8 w-8 text-[#A78BFA]" />
                  </div>
                </div>
              </Card>

              {/* High Confidence % */}
              <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#4ADE80]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280] font-medium">High Confidence</p>
                    <p className="text-3xl font-bold text-[#4ADE80] mt-1">
                      {analyticsData.confidenceDistribution?.find(d => d.level === 'high')?.percentage || '0'}%
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {analyticsData.confidenceDistribution?.find(d => d.level === 'high')?.count || 0} responses
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#4ADE80]/10 to-[#4ADE80]/20 rounded-full">
                    <Zap className="h-8 w-8 text-[#4ADE80]" />
                  </div>
                </div>
              </Card>

              {/* Avg Response Time */}
              <Card className="p-6 hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-[#FACC15]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6B7280] font-medium">Avg Response</p>
                    <p className="text-3xl font-bold text-[#FACC15] mt-1">
                      {analyticsData.overview.avgResponseTime ? 
                        `${(analyticsData.overview.avgResponseTime / 1000).toFixed(1)}s` : 
                        '0s'
                      }
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">milliseconds</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-[#FACC15]/10 to-[#FACC15]/20 rounded-full">
                    <Clock className="h-8 w-8 text-[#FACC15]" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Confidence Distribution & Top Queries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Confidence Distribution Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center">
                  <PieChart className="h-5 w-5 text-[#6D5EF9] mr-2" />
                  Confidence Distribution
                </h3>
                {analyticsData.confidenceDistribution && analyticsData.confidenceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analyticsData.confidenceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6D5EF9" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#6B7280]">
                    No confidence data yet
                  </div>
                )}
              </Card>

              {/* Top Queries Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center">
                  <Activity className="h-5 w-5 text-[#A78BFA] mr-2" />
                  Top 10 Queries
                </h3>
                {analyticsData.topQueries && analyticsData.topQueries.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {analyticsData.topQueries.map((query, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <p className="text-sm text-[#6B7280] flex-1 truncate">{query.query}</p>
                        <span className="text-sm font-semibold text-[#6D5EF9] ml-2">{query.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#6B7280]">
                    No query data yet
                  </div>
                )}
              </Card>
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Comprehensive insights into your AI platform performance</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExport(!showExport)}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={loading}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Export Panel */}
        {showExport && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Download className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">Export Analytics Data</span>
              </div>
              <Button onClick={exportData} size="sm" className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
                Download CSV
              </Button>
            </div>
          </Card>
        )}

        {/* Time Range and Chart Type Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border">
            {['7', '30', '90'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="min-w-[60px]"
              >
                {range} days
              </Button>
            ))}
          </div>
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border">
            {[
              { type: 'area', icon: AreaChart, label: 'Area' },
              { type: 'line', icon: LineChartIcon, label: 'Line' },
              { type: 'bar', icon: BarChart3, label: 'Bar' }
            ].map(({ type, icon: Icon, label }) => (
              <Button
                key={type}
                variant={chartType === type ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType(type as any)}
                className="flex items-center"
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Charts Section - Only for Pro users */}
        {analyticsData.dailyActivity && analyticsData.documentStatusBreakdown && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Activity Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Daily Activity
              </h3>
              <div className="text-sm text-gray-500">
                Last {timeRange} days
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      stroke="#666"
                    />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="documents" 
                      stackId="1" 
                      stroke={chartColors.documents} 
                      fill={chartColors.documents}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stackId="1" 
                      stroke={chartColors.sessions} 
                      fill={chartColors.sessions}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="messages" 
                      stackId="1" 
                      stroke={chartColors.messages} 
                      fill={chartColors.messages}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                ) : chartType === 'line' ? (
                  <LineChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      stroke="#666"
                    />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="documents" stroke={chartColors.documents} strokeWidth={3} />
                    <Line type="monotone" dataKey="sessions" stroke={chartColors.sessions} strokeWidth={3} />
                    <Line type="monotone" dataKey="messages" stroke={chartColors.messages} strokeWidth={3} />
                  </LineChart>
                ) : (
                  <BarChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      stroke="#666"
                    />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="documents" fill={chartColors.documents} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sessions" fill={chartColors.sessions} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="messages" fill={chartColors.messages} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: chartColors.documents }}></div>
                Documents
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: chartColors.sessions }}></div>
                Sessions
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: chartColors.messages }}></div>
                Messages
              </div>
            </div>
          </Card>

          {/* Document Status Pie Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-green-600" />
                Document Status
              </h3>
              <div className="text-sm text-gray-500">
                {analyticsData.documentStatusBreakdown.reduce((sum, item) => sum + item.count, 0)} total
              </div>
            </div>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.documentStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count, percent }) => `${status}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.documentStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        )}

        {/* Recent Activity - Only for Pro users */}
        {analyticsData.recentActivity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Recent Documents
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/datasets'}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {analyticsData.recentActivity.documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-sm text-gray-600">by {doc.user}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                Recent Chat Sessions
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/datasets'}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {analyticsData.recentActivity.chatSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {session.userIdentifier || 'Anonymous User'}
                    </p>
                    <p className="text-sm text-gray-600 font-mono text-xs">{session.sessionId}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500">
                      {new Date(session.lastActivityAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(session.lastActivityAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        )}

        {/* Additional Metrics - Only for Pro users */}
        {analyticsData.overview.totalChunks !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Data Chunks</div>
            <p className="text-3xl font-bold text-blue-600 mb-2">
              {formatNumber(analyticsData.overview.totalChunks || 0)}
            </p>
            <p className="text-sm text-gray-600">
              {analyticsData.overview.chunksInRange || 0} processed this period
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="p-3 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Share2 className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Document Shares</div>
            <p className="text-3xl font-bold text-yellow-600 mb-2">
              {formatNumber(analyticsData.overview.totalShares || 0)}
            </p>
            <p className="text-sm text-gray-600">
              {analyticsData.overview.sharesInRange || 0} shared this period
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="p-3 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900 mb-2">Engagement Rate</div>
            <p className="text-3xl font-bold text-purple-600 mb-2">
              {analyticsData.overview.totalChatSessions > 0 
                ? Math.round((analyticsData.overview.totalMessages / analyticsData.overview.totalChatSessions) * 10) / 10
                : 0
              }
            </p>
            <p className="text-sm text-gray-600">
              Avg messages per session
            </p>
          </Card>
        </div>
        )}
      </div>
    </div>
  )
}