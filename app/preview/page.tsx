'use client'

import Link from 'next/link'
import { ArrowLeft, MessageSquare, BarChart3, Shield, Sparkles, X, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import SharedChatState from '@/components/workspace/SharedChatState'

export default function WidgetDemoPage() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9F5FF] via-white to-[#EEF4FF]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo-mark-black.svg" alt="Avenai" className="h-8 w-8" />
              <span className="text-2xl font-semibold text-gray-900">
                Avenai
              </span>
            </div>

            {/* Back to Guide */}
            <Link 
              href="/integration-guide" 
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium no-underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Guide
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-2xl mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI Copilot Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            This is exactly how your AI copilot will appear to your customers. Try it out below!
          </p>
        </div>

        {/* Live Demo Card */}
        <div className="bg-white border-2 border-[#E9D7FE] rounded-2xl p-8 mb-8 text-center shadow-lg">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Interactive Demo</h2>
          <p className="text-gray-600 mb-6">
            This is the same widget your customers will use. Click the chat button below to try it!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-[#7F56D9] bg-[#F9F5FF] px-4 py-2 rounded-lg inline-flex">
            <Sparkles className="w-4 h-4" />
            <span>Try asking: "How do I get started with the API?"</span>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Responses</h3>
            <p className="text-gray-600 text-sm">
              Get immediate, accurate answers powered by your documentation.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Analytics</h3>
            <p className="text-gray-600 text-sm">
              Track questions, satisfaction rates, and user behavior.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">
              Your data stays private with enterprise-grade security.
            </p>
          </div>
        </div>

        {/* Integration Note */}
        <div className="mt-12 bg-gradient-to-r from-[#F9F5FF] to-[#EEF4FF] border border-[#E9D7FE] rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to integrate?</h3>
          <p className="text-gray-600 mb-4">
            Add this copilot to your site with just a few lines of code. Check out the Quick Start Guide for details.
          </p>
          <Link 
            href="/integration-guide" 
            className="inline-flex items-center gap-2 bg-[#7F56D9] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#6941C6] transition-colors no-underline"
          >
            View Integration Guide
          </Link>
        </div>
      </main>

      {/* Floating Widget Button */}
      {!isWidgetOpen && (
        <button
          onClick={() => setIsWidgetOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white pl-3 pr-5 py-3 rounded-full shadow-2xl hover:shadow-[#7F56D9]/50 hover:scale-105 transition-all flex items-center gap-3 font-medium"
          aria-label="Open AI Copilot"
        >
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center p-1.5">
            <img src="/logo-mark-white.svg" alt="Avenai" className="w-full h-full" />
          </div>
          <span>Ask AI</span>
        </button>
      )}

      {/* Widget Panel - Expanded View */}
      {isWidgetOpen && isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm grid place-items-center">
          <div className="relative w-[920px] max-w-[95vw] h-[85vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#F9F5FF] to-[#EEF4FF]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-xl flex items-center justify-center p-2">
                  <img src="/logo-mark-white.svg" alt="Avenai" className="w-full h-full" />
                </div>
                <span className="text-lg font-semibold text-gray-900">AI Copilot</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                  aria-label="Exit fullscreen"
                >
                  <Minimize2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    setIsExpanded(false)
                    setIsWidgetOpen(false)
                  }}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden">
              <SharedChatState 
                datasetId="demo"
              />
            </div>
          </div>
        </div>
      )}

      {/* Widget Panel - Compact View */}
      {isWidgetOpen && !isExpanded && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-6rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#F9F5FF] to-[#EEF4FF]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#7F56D9] to-[#9E77ED] rounded-lg flex items-center justify-center p-1.5">
                <img src="/logo-mark-white.svg" alt="Avenai" className="w-full h-full" />
              </div>
              <span className="font-semibold text-gray-900">AI Copilot</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                aria-label="Expand"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsWidgetOpen(false)}
                className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden">
            <SharedChatState 
              datasetId="demo"
            />
          </div>
        </div>
      )}
    </div>
  )
}
