"use client"

import { Bot, Globe, Code, AlertTriangle, BookOpen } from 'lucide-react'

interface EmptyStateProps {
  onQuickPrompt: (prompt: string) => void
  previewMode: 'testing' | 'customer'
}

export default function EmptyState({ onQuickPrompt, previewMode }: EmptyStateProps) {
  const quickStartTiles = [
    {
      id: 'auth',
      title: 'API Authentication',
      description: 'Learn about API keys and auth',
      icon: Globe,
      prompt: 'How do I authenticate with the API?'
    },
    {
      id: 'endpoints',
      title: 'API Endpoints',
      description: 'Explore available endpoints',
      icon: Code,
      prompt: 'What endpoints are available?'
    },
    {
      id: 'errors',
      title: 'Error Handling',
      description: 'Best practices for errors',
      icon: AlertTriangle,
      prompt: 'How do I handle API errors?'
    },
    {
      id: 'examples',
      title: 'Code Examples',
      description: 'Get implementation examples',
      icon: BookOpen,
      prompt: 'Show me a code example'
    }
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {/* Assistant Avatar */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <Bot className="h-8 w-8 text-white" />
        </div>
      </div>
      
      {/* Title and Subtitle */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          AI Assistant
        </h2>
        <p className="text-gray-600">
          Ask me anything about our product
        </p>
      </div>
      
      {/* Quick Start Tiles */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {quickStartTiles.map((tile) => {
          const IconComponent = tile.icon
          return (
            <button
              key={tile.id}
              onClick={() => onQuickPrompt(tile.prompt)}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left group"
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center transition-colors">
                  <IconComponent className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-tight">
                    {tile.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Help Text */}
      <div className="mt-6 text-xs text-gray-500">
        {previewMode === 'testing' ? (
          <>Click any tile above or type your question below</>
        ) : (
          <>Choose a topic above or ask your own question</>
        )}
      </div>
    </div>
  )
}

