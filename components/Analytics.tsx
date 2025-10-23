"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface FeedbackStats {
  positive?: number
  negative?: number
  neutral?: number
}

interface PopularQuestion {
  question: string
  count: number
}

interface AnalyticsData {
  feedbackStats: FeedbackStats
  popularQuestions: PopularQuestion[]
  totalFeedback: number
  timeRange: string
}

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(7)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/feedback?days=${timeRange}`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFeedbackChartData = () => {
    if (!analyticsData?.feedbackStats) return []
    
    return Object.entries(analyticsData.feedbackStats).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: key === 'positive' ? '#10b981' : key === 'negative' ? '#ef4444' : '#6b7280'
    }))
  }

  const getPopularQuestionsData = () => {
    if (!analyticsData?.popularQuestions) return []
    
    return analyticsData.popularQuestions.map((item, index) => ({
      name: item.question.length > 30 ? item.question.substring(0, 30) + '...' : item.question,
      count: item.count,
      fullQuestion: item.question
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
          <div className="text-center py-12">
            <BarChart className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600 mb-2">No analytics data available yet</p>
            <p className="text-sm text-secondary-500">
              Start using the AI chat to generate analytics data
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            variant={timeRange === 7 ? "default" : "outline"}
            onClick={() => setTimeRange(7)}
          >
            7 Days
          </Button>
          <Button 
            variant={timeRange === 30 ? "default" : "outline"}
            onClick={() => setTimeRange(30)}
          >
            30 Days
          </Button>
          <Button 
            variant={timeRange === 90 ? "default" : "outline"}
            onClick={() => setTimeRange(90)}
          >
            90 Days
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalFeedback}</div>
            <p className="text-sm text-gray-500">Over {analyticsData.timeRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positive Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analyticsData.feedbackStats.positive || 0}
            </div>
            <p className="text-sm text-gray-500">
              {analyticsData.totalFeedback > 0 
                ? `${Math.round(((analyticsData.feedbackStats.positive || 0) / analyticsData.totalFeedback) * 100)}%`
                : '0%'
              } of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Negative Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {analyticsData.feedbackStats.negative || 0}
            </div>
            <p className="text-sm text-gray-500">
              {analyticsData.totalFeedback > 0 
                ? `${Math.round(((analyticsData.feedbackStats.negative || 0) / analyticsData.totalFeedback) * 100)}%`
                : '0%'
              } of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">Feedback Distribution</TabsTrigger>
          <TabsTrigger value="questions">Popular Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feedback Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getFeedbackChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getFeedbackChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPopularQuestionsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name, props) => [
                        value, 
                        'Count',
                        props.payload.fullQuestion ? `Question: ${props.payload.fullQuestion}` : ''
                      ]}
                    />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>AI Learning Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-semibold mb-2">Top Performing Responses</div>
              <div className="space-y-2">
                {analyticsData.feedbackStats.positive && analyticsData.feedbackStats.positive > 0 ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {analyticsData.feedbackStats.positive} positive feedback received
                  </Badge>
                ) : (
                  <p className="text-sm text-gray-500">No positive feedback yet</p>
                )}
              </div>
            </div>
            
            <div>
              <div className="font-semibold mb-2">Areas for Improvement</div>
              <div className="space-y-2">
                {analyticsData.feedbackStats.negative && analyticsData.feedbackStats.negative > 0 ? (
                  <Badge variant="destructive">
                    {analyticsData.feedbackStats.negative} negative feedback received
                  </Badge>
                ) : (
                  <p className="text-sm text-gray-500">No negative feedback yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="font-semibold mb-2">Recommendations</div>
            <div className="space-y-2 text-sm">
              {analyticsData.popularQuestions.length > 0 && (
                <p>• Consider adding documentation for frequently asked questions</p>
              )}
              {analyticsData.feedbackStats.negative && analyticsData.feedbackStats.negative > 0 && (
                <p>• Review responses that received negative feedback for improvement</p>
              )}
              {analyticsData.totalFeedback < 10 && (
                <p>• Encourage users to provide feedback on AI responses</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
