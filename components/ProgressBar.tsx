"use client"

import React from 'react'
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'

interface ProgressBarProps {
  progress: number
  message: string
  stage: string
  isProcessing: boolean
  isCompleted: boolean
  isFailed: boolean
  className?: string
}

export function ProgressBar({
  progress,
  message,
  stage,
  isProcessing,
  isCompleted,
  isFailed,
  className = ''
}: ProgressBarProps) {
  const getStageIcon = () => {
    if (isFailed) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (isProcessing) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    }
    return <Clock className="h-4 w-4 text-gray-500" />
  }

  const getProgressColor = () => {
    if (isFailed) return 'bg-red-500'
    if (isCompleted) return 'bg-green-500'
    if (isProcessing) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  const getStageColor = () => {
    if (isFailed) return 'text-red-600'
    if (isCompleted) return 'text-green-600'
    if (isProcessing) return 'text-blue-600'
    return 'text-gray-600'
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStageIcon()}
          <span className={`text-sm font-medium ${getStageColor()}`}>
            {stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase()}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 truncate flex-1">
          {message}
        </span>
        {isProcessing && (
          <div className="flex items-center gap-1 ml-2">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function CompactProgressBar({
  progress,
  message,
  stage,
  isProcessing,
  isCompleted,
  isFailed,
  className = ''
}: ProgressBarProps) {
  const getProgressColor = () => {
    if (isFailed) return 'bg-red-500'
    if (isCompleted) return 'bg-green-500'
    if (isProcessing) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Progress Bar */}
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {Math.round(progress)}%
      </span>
      
      {/* Status Indicator */}
      {isProcessing && (
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

// Processing stages with descriptions
export const PROCESSING_STAGES = {
  UPLOADED: { 
    stage: 'uploaded', 
    progress: 10, 
    message: 'Document uploaded successfully',
    description: 'File has been received and validated'
  },
  EXTRACTING: { 
    stage: 'extracting', 
    progress: 25, 
    message: 'Extracting text content...',
    description: 'Reading and parsing document content'
  },
  CHUNKING: { 
    stage: 'chunking', 
    progress: 50, 
    message: 'Creating semantic chunks...',
    description: 'Splitting content into meaningful sections'
  },
  EMBEDDING: { 
    stage: 'embedding', 
    progress: 75, 
    message: 'Generating embeddings...',
    description: 'Creating vector representations for search'
  },
  STORING: { 
    stage: 'storing', 
    progress: 90, 
    message: 'Storing in database...',
    description: 'Saving processed data'
  },
  COMPLETED: { 
    stage: 'completed', 
    progress: 100, 
    message: 'Processing completed!',
    description: 'Document is ready for use'
  },
  FAILED: { 
    stage: 'failed', 
    progress: 0, 
    message: 'Processing failed',
    description: 'An error occurred during processing'
  }
} as const

export type ProcessingStage = keyof typeof PROCESSING_STAGES
