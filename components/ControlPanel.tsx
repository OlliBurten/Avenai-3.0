"use client"

import { MessageSquare, RotateCcw, X, Play, Image } from 'lucide-react'
import { useState, useEffect } from 'react'

// Widget Config Type
interface WidgetConfig {
  mode: "widget" | "drawer" | "fullpage"
  datasetId: "all" | string
  logoUrl?: string
  primaryColor?: string
  welcomeMessage?: string
  defaultLanguage: "python" | "node" | "curl" | "json"
  defaultOpenMode: "widget" | "drawer" | "fullpage"
  theme: "light" | "dark" | "auto"
}

// Session Type
interface Session {
  sessionId: string
  isOpen: boolean
  messages: any[]
  languagePref: string
}

// Dataset Type
interface Dataset {
  id: string
  name: string
  description?: string
  type: string
  tags: string[]
  createdAt: string
  _count: {
    documents: number
  }
}

interface ControlPanelProps {
  config: WidgetConfig
  setConfig: (config: WidgetConfig) => void
  session: Session
  onNewChat: () => void
  onClearChat: () => void
  onToggleWidget: () => void
  onQuickPrompt: (prompt: string) => void
  onDatasetChange?: (datasetId: string) => void
  quickPrompts: string[]
}

export default function ControlPanel({ 
  config, 
  setConfig, 
  session, 
  onNewChat, 
  onClearChat, 
  onToggleWidget, 
  onQuickPrompt, 
  onDatasetChange,
  quickPrompts 
}: ControlPanelProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch datasets from API
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch('/api/datasets/dev')
        if (response.ok) {
          const data = await response.json()
          setDatasets(data.items || [])
        } else {
          console.error('Failed to fetch datasets:', response.statusText)
          // For development, use mock datasets if API fails
          if (response.status === 401) {
            setDatasets([
              {
                id: 'test-dataset',
                name: 'test',
                description: 'Test dataset for development',
                type: 'SERVICE',
                tags: ['test', 'development'],
                createdAt: new Date().toISOString(),
                _count: { documents: 5 }
              }
            ])
          }
        }
      } catch (error) {
        console.error('Error fetching datasets:', error)
        // Fallback to mock data for development
        setDatasets([
          {
            id: 'test-dataset',
            name: 'test',
            description: 'Test dataset for development',
            type: 'SERVICE',
            tags: ['test', 'development'],
            createdAt: new Date().toISOString(),
            _count: { documents: 5 }
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchDatasets()
  }, [])
  return (
    <div className="p-6 space-y-6">
      {/* Widget Mode */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Widget Mode</h3>
        <div className="space-y-2">
          {[
            { 
              value: 'widget', 
              label: 'Standard Widget', 
              desc: 'Floating panel, anchored bottom-right' 
            },
            { 
              value: 'fullpage', 
              label: 'Full Page', 
              desc: 'Fills the preview canvas' 
            }
          ].map((option) => (
            <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={option.value}
                checked={config.mode === option.value}
                onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Dataset */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Dataset</h3>
        <select
          value={config.datasetId}
          onChange={(e) => {
            const newDatasetId = e.target.value;
            setConfig({ ...config, datasetId: newDatasetId });
            if (onDatasetChange) {
              onDatasetChange(newDatasetId);
            }
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="all">All Datasets</option>
          {loading ? (
            <option disabled>Loading datasets...</option>
          ) : (
            datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name} ({dataset._count.documents} docs)
              </option>
            ))
          )}
        </select>
        
        <div className="mt-3">
          <p className="text-xs text-gray-600 mb-2">Quick Test Prompts</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onQuickPrompt(prompt)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Branding & Customization */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Branding & Customization</h3>
        
        <div className="space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center space-x-3">
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={config.logoUrl || ''}
                onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Image className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Welcome Message</label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter welcome message for new users..."
            />
          </div>
        </div>
      </div>

      {/* Behavior & Defaults */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Behavior & Defaults</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Default Language</label>
            <select
              value={config.defaultLanguage}
              onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="python">Python</option>
              <option value="node">Node.js</option>
              <option value="curl">cURL</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Theme</label>
            <select
              value={config.theme}
              onChange={(e) => setConfig({ ...config, theme: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onToggleWidget}
            className="flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{session.isOpen ? 'Close' : 'Open'}</span>
          </button>
          <button
            onClick={onNewChat}
            className="flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RotateCcw className="h-4 w-4" />
            <span>New Chat</span>
          </button>
          <button
            onClick={onClearChat}
            className="flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </button>
          <button
            onClick={() => onQuickPrompt("How do I authenticate?")}
            className="flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Play className="h-4 w-4" />
            <span>Test</span>
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Analytics</h3>
        <p className="text-xs text-gray-600">
          Onboarding analytics: time-to-first-call, common errors, deflection.
          <span className="block mt-1 text-gray-500">Coming Soon</span>
        </p>
      </div>

      {/* Widget Preview Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Widget Preview</span>
        </div>
        <p className="text-xs text-blue-800 mb-2">
          This preview shows how your chat widget will appear to your customers. Use the settings panel above to customize the appearance.
        </p>
        <div className="text-xs text-blue-700 space-y-1">
          <div>Mode: {config.mode === 'widget' ? 'Standard Widget' : 'Full Page'}</div>
          <div>Color: {config.primaryColor}</div>
          <div>Position: bottom-right</div>
        </div>
      </div>
    </div>
  )
}
