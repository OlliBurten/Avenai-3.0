"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  Upload, 
  MessageSquare, 
  Key, 
  Users,
  X,
  Rocket,
  Sparkles,
  Target,
  Zap,
  Globe,
  Share2
} from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  icon: string
}

interface OnboardingData {
  isComplete: boolean
  progress: {
    completed: number
    total: number
    percentage: number
  }
  steps: OnboardingStep[]
  user: {
    id: string
    name: string
    email: string
    organization: string
  }
}

interface OnboardingProps {
  onComplete?: () => void
  onSkip?: () => void
}

const stepIcons = {
  '👋': Rocket,
  '📄': Upload,
  '💬': MessageSquare,
  '🔑': Key,
  '🌐': Globe,
  '👥': Share2
}

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchOnboardingData()
  }, [])

  const fetchOnboardingData = async () => {
    try {
      const response = await fetch('/api/onboarding', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setOnboardingData(data)
        // Find the first incomplete step
        const firstIncomplete = data.steps.findIndex((step: OnboardingStep) => !step.completed)
        setCurrentStep(firstIncomplete >= 0 ? firstIncomplete : 0)
      }
    } catch (error) {
      console.error('Error fetching onboarding data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = async (stepId: string) => {
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ stepId })
      })

      if (response.ok) {
        await fetchOnboardingData()
      }
    } catch (error) {
      console.error('Error completing step:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < onboardingData!.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    onComplete?.()
  }

  const handleSkip = () => {
    onSkip?.()
  }

  const getStepAction = (stepId: string) => {
    switch (stepId) {
      case 'create-dataset':
        return () => router.push('/datasets')
      case 'upload-document':
        return () => router.push('/datasets')
      case 'try-chat':
        return () => router.push('/datasets')
      case 'generate-api-key':
        return () => router.push('/api-keys')
      case 'embed-widget':
        return () => router.push('/embed-instructions')
      default:
        return handleNext
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  if (!onboardingData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load onboarding data</p>
        <Button onClick={handleSkip} className="mt-4 rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90">
          Skip Onboarding
        </Button>
      </div>
    )
  }

  const currentStepData = onboardingData.steps[currentStep]
  const IconComponent = stepIcons[currentStepData.icon as keyof typeof stepIcons] || Circle

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Avenai!
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Let's get you started with your AI documentation assistant
        </p>

        {/* Progress Bar */}
        <div className="bg-gray-100 rounded-full h-3 w-full max-w-md mx-auto mb-6 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${onboardingData.progress.percentage}%` }}
          />
        </div>
        
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <span className="font-semibold">{onboardingData.progress.completed}</span>
          <span>of</span>
          <span className="font-semibold">{onboardingData.progress.total}</span>
          <span>steps completed</span>
        </div>
      </div>

      {/* Current Step Card */}
      <Card className="p-8 mb-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <IconComponent className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {currentStepData.title}
          </h2>
          
          <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
            {currentStepData.description}
          </p>

          {/* Step Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {currentStepData.completed ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-600 font-semibold">Completed!</span>
              </>
            ) : (
              <>
                <Circle className="w-5 h-5 text-blue-500" />
                <span className="text-blue-600 font-semibold">Ready to start</span>
              </>
            )}
          </div>

          {/* Action Button */}
          <div className="flex gap-3 justify-center">
            {currentStepData.completed ? (
              <Button 
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {currentStep === onboardingData.steps.length - 1 ? 'Finish Setup' : 'Next Step'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={getStepAction(currentStepData.id)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                {currentStepData.id === 'create-dataset' && 'Create Dataset'}
                {currentStepData.id === 'upload-document' && 'Upload Document'}
                {currentStepData.id === 'try-chat' && 'Try Chat'}
                {currentStepData.id === 'generate-api-key' && 'Generate API Key'}
                {currentStepData.id === 'embed-widget' && 'Setup Widget'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Steps Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {onboardingData.steps.map((step, index) => {
          const StepIcon = stepIcons[step.icon as keyof typeof stepIcons] || Circle
          const isActive = index === currentStep
          const isCompleted = step.completed
          
          return (
            <div
              key={step.id}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                isActive 
                  ? 'border-blue-300 bg-blue-50 shadow-md' 
                  : isCompleted 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : isActive 
                      ? 'bg-blue-500' 
                      : 'bg-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <StepIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs truncate ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <Button 
          onClick={handleSkip}
          variant="outline"
          className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
        >
          Skip for now
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Target className="w-4 h-4" />
          <span>Step {currentStep + 1} of {onboardingData.steps.length}</span>
        </div>
      </div>
    </div>
  )
}