"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Zap, 
  HardDrive,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  Database,
  Target,
  ArrowUpRight,
  Crown,
  Star,
  Shield
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface UsageData {
  subscription: {
    tier: string
    status: string
    startDate: string
  }
  limits: {
    documents: number
    chatSessions: number
    messages: number
    apiRequests: number
    storage: bigint
    price: number
  }
  usage: {
    documents: {
      total: number
      thisPeriod: number
      percentage: number
    }
    chatSessions: {
      total: number
      thisPeriod: number
      percentage: number
    }
    messages: {
      total: number
      thisPeriod: number
      percentage: number
    }
    apiRequests: {
      total: number
      thisPeriod: number
      percentage: number
    }
    storage: {
      total: bigint
      thisPeriod: bigint
      percentage: number
    }
  }
  dailyUsage: Array<{
    date: string
    documents: number
    sessions: number
    messages: number
    apiRequests: number
  }>
  timeRange: number
}

export default function UsagePage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const fetchUsage = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/usage?timeRange=${timeRange}`, {
        credentials: 'include'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data')
      }

      setUsageData(data.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [timeRange])

  const formatBytes = (bytes: bigint) => {
    const size = Number(bytes)
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited'
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getUsageIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4" />
    if (percentage >= 75) return <TrendingUp className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  const chartColors = {
    documents: '#3B82F6',
    sessions: '#10B981', 
    messages: '#8B5CF6',
    apiRequests: '#F59E0B'
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'FREE': return <Star className="h-5 w-5" />
      case 'PRO': return <Crown className="h-5 w-5" />
      case 'FOUNDER': return <Crown className="h-5 w-5" />
      default: return <Star className="h-5 w-5" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FREE': return 'text-gray-600'
      case 'PRO': return 'text-blue-600'
      case 'FOUNDER': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const exportUsageData = () => {
    if (!usageData) return
    
    const csvContent = [
      ['Metric', 'Used', 'Limit', 'Percentage', 'This Period'],
      ['Documents', usageData.usage.documents.total, usageData.limits.documents, `${usageData.usage.documents.percentage.toFixed(1)}%`, usageData.usage.documents.thisPeriod],
      ['Chat Sessions', usageData.usage.chatSessions.total, usageData.limits.chatSessions, `${usageData.usage.chatSessions.percentage.toFixed(1)}%`, usageData.usage.chatSessions.thisPeriod],
      ['Messages', usageData.usage.messages.total, usageData.limits.messages, `${usageData.usage.messages.percentage.toFixed(1)}%`, usageData.usage.messages.thisPeriod],
      ['API Requests', usageData.usage.apiRequests.total, usageData.limits.apiRequests, `${usageData.usage.apiRequests.percentage.toFixed(1)}%`, usageData.usage.apiRequests.thisPeriod],
      ['Storage', formatBytes(BigInt(usageData.usage.storage.total)), formatBytes(BigInt(usageData.limits.storage)), `${usageData.usage.storage.percentage.toFixed(1)}%`, formatBytes(BigInt(usageData.usage.storage.thisPeriod))]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avenai-usage-${timeRange}days.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-secondary-900">Loading Usage Data...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Error Loading Usage</h2>
          <p className="text-secondary-600 mb-4">{error}</p>
          <Button onClick={fetchUsage}>Try Again</Button>
        </div>
      </div>
    )
  }

  if (!usageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-900">No Usage Data</h2>
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
                Usage & Billing
              </h1>
              <p className="text-gray-600 mt-2">Track your usage and manage your subscription</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={exportUsageData}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsage}
                disabled={loading}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Time Range and Chart Type Selectors */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
            {['7', '30', '90'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range} days
              </Button>
            ))}
          </div>
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
            {[
              { type: 'area', label: 'Area', icon: BarChart3 },
              { type: 'line', label: 'Line', icon: TrendingUp },
              { type: 'bar', label: 'Bar', icon: BarChart3 }
            ].map(({ type, label, icon: Icon }) => (
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

        {/* Enhanced Subscription Info */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-3 rounded-full bg-white shadow-sm mr-4 ${getTierColor(usageData.subscription.tier)}`}>
                {getTierIcon(usageData.subscription.tier)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  {usageData.subscription.tier} Plan
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    usageData.subscription.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {usageData.subscription.status}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">
                  Started {new Date(usageData.subscription.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-gray-900">
                ${usageData.limits.price}/month
              </p>
              <p className="text-sm text-gray-600">
                {usageData.limits.price === 0 ? 'Free plan' : 'Billed monthly'}
              </p>
              {usageData.limits.price > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.location.href = '/billing'}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Enhanced Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageData.usage.documents.percentage)}`}>
                {getUsageIcon(usageData.usage.documents.percentage)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Documents</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(usageData.usage.documents.total)}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                of {formatNumber(usageData.limits.documents)} limit
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usageData.usage.documents.percentage >= 90 ? 'bg-red-500' : 
                    usageData.usage.documents.percentage >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usageData.usage.documents.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usageData.usage.documents.thisPeriod} this period
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageData.usage.chatSessions.percentage)}`}>
                {getUsageIcon(usageData.usage.chatSessions.percentage)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Chat Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(usageData.usage.chatSessions.total)}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                of {formatNumber(usageData.limits.chatSessions)} limit
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usageData.usage.chatSessions.percentage >= 90 ? 'bg-red-500' : 
                    usageData.usage.chatSessions.percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usageData.usage.chatSessions.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usageData.usage.chatSessions.thisPeriod} this period
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageData.usage.messages.percentage)}`}>
                {getUsageIcon(usageData.usage.messages.percentage)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(usageData.usage.messages.total)}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                of {formatNumber(usageData.limits.messages)} limit
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usageData.usage.messages.percentage >= 90 ? 'bg-red-500' : 
                    usageData.usage.messages.percentage >= 75 ? 'bg-yellow-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(usageData.usage.messages.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usageData.usage.messages.thisPeriod} this period
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="h-6 w-6 text-orange-700" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageData.usage.apiRequests.percentage)}`}>
                {getUsageIcon(usageData.usage.apiRequests.percentage)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">API Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(usageData.usage.apiRequests.total)}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                of {formatNumber(usageData.limits.apiRequests)} limit
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usageData.usage.apiRequests.percentage >= 90 ? 'bg-red-500' : 
                    usageData.usage.apiRequests.percentage >= 75 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(usageData.usage.apiRequests.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {usageData.usage.apiRequests.thisPeriod} this period
              </p>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-indigo-600" />
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usageData.usage.storage.percentage)}`}>
                {getUsageIcon(usageData.usage.storage.percentage)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Storage</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(BigInt(usageData.usage.storage.total))}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                of {formatBytes(BigInt(usageData.limits.storage))} limit
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usageData.usage.storage.percentage >= 90 ? 'bg-red-500' : 
                    usageData.usage.storage.percentage >= 75 ? 'bg-yellow-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(usageData.usage.storage.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(BigInt(usageData.usage.storage.thisPeriod))} this period
              </p>
            </div>
          </Card>
        </div>

        {/* Enhanced Usage Alerts */}
        {Object.values(usageData.usage).some(usage => usage.percentage >= 90) && (
          <Card className="p-6 mb-8 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Usage Limit Warning</h3>
                <p className="text-red-700">
                  You're approaching your usage limits. Consider upgrading your plan to avoid service interruption.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => window.location.href = '/billing'}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Interactive Usage Chart */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Daily Usage Trend ({timeRange} days)
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                Documents
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                Sessions
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
                Messages
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded mr-1"></div>
                API Requests
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={usageData.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name]}
                  />
                  <Area type="monotone" dataKey="documents" stackId="1" stroke={chartColors.documents} fill={chartColors.documents} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="sessions" stackId="1" stroke={chartColors.sessions} fill={chartColors.sessions} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="messages" stackId="1" stroke={chartColors.messages} fill={chartColors.messages} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="apiRequests" stackId="1" stroke={chartColors.apiRequests} fill={chartColors.apiRequests} fillOpacity={0.6} />
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={usageData.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name]}
                  />
                  <Line type="monotone" dataKey="documents" stroke={chartColors.documents} strokeWidth={2} />
                  <Line type="monotone" dataKey="sessions" stroke={chartColors.sessions} strokeWidth={2} />
                  <Line type="monotone" dataKey="messages" stroke={chartColors.messages} strokeWidth={2} />
                  <Line type="monotone" dataKey="apiRequests" stroke={chartColors.apiRequests} strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={usageData.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name]}
                  />
                  <Bar dataKey="documents" fill={chartColors.documents} />
                  <Bar dataKey="sessions" fill={chartColors.sessions} />
                  <Bar dataKey="messages" fill={chartColors.messages} />
                  <Bar dataKey="apiRequests" fill={chartColors.apiRequests} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  )
}
