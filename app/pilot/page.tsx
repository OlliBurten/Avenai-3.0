"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  CheckCircle, 
  Users, 
  FileText, 
  MessageSquare, 
  BarChart3,
  ArrowRight,
  Target,
  Zap
} from "lucide-react"

export default function PilotPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactEmail: '',
    apiType: '',
    docsUrl: '',
    monthlyIntegrations: '',
    pilotGoals: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitted(true)
    setIsSubmitting(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Card className="p-12 text-center">
            <CheckCircle className="h-20 w-20 text-[#4ADE80] mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">
              Application Submitted!
            </h1>
            <p className="text-lg text-[#6B7280] mb-8">
              Thanks for applying to the Avenai Pilot Program. Our team will reach out within 24 hours to schedule your onboarding session.
            </p>
            <div className="bg-gradient-to-r from-[#A78BFA]/10 to-[#6D5EF9]/10 rounded-2xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-4">What happens next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="flex items-start">
                  <div className="p-2 bg-[#6D5EF9] rounded-full mr-3 mt-1">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">1. Review</h4>
                    <p className="text-sm text-[#6B7280]">We'll review your application and API documentation</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-2 bg-[#6D5EF9] rounded-full mr-3 mt-1">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">2. Onboard</h4>
                    <p className="text-sm text-[#6B7280]">Schedule a 30-minute onboarding session</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-2 bg-[#6D5EF9] rounded-full mr-3 mt-1">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1A1A1A]">3. Launch</h4>
                    <p className="text-sm text-[#6B7280]">Get full access to your pilot program</p>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = '/'}
              className="rounded-full bg-gradient-to-r from-[#6D5EF9] to-[#A78BFA] text-white hover:opacity-90 px-8 py-3"
            >
              Return to Homepage
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#6D5EF9] to-[#A78BFA] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Join the Avenai Pilot Program
          </h1>
          <p className="text-xl opacity-90 mb-8">
            We're partnering with a small number of API-first companies to refine the next generation of onboarding copilots.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm opacity-80">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span>Limited spots available</span>
            </div>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              <span>6-8 week program</span>
            </div>
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span>Full analytics access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Pilot Package Details */}
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
              Pilot Package Includes
            </h2>
            
            <div className="space-y-6">
              <Card className="p-6 border-l-4 border-l-[#6D5EF9]">
                <div className="flex items-start">
                  <div className="p-2 bg-[#6D5EF9]/10 rounded-full mr-4">
                    <FileText className="h-5 w-5 text-[#6D5EF9]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Document Management</h3>
                    <p className="text-[#6B7280] text-sm">Up to 3 datasets with 20 docs each</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-[#A78BFA]">
                <div className="flex items-start">
                  <div className="p-2 bg-[#A78BFA]/10 rounded-full mr-4">
                    <MessageSquare className="h-5 w-5 text-[#A78BFA]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Onboarding Copilot</h3>
                    <p className="text-[#6B7280] text-sm">Up to 5,000 queries per month</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-[#4ADE80]">
                <div className="flex items-start">
                  <div className="p-2 bg-[#4ADE80]/10 rounded-full mr-4">
                    <BarChart3 className="h-5 w-5 text-[#4ADE80]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Analytics Dashboard</h3>
                    <p className="text-[#6B7280] text-sm">Full access to performance metrics</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-[#FACC15]">
                <div className="flex items-start">
                  <div className="p-2 bg-[#FACC15]/10 rounded-full mr-4">
                    <Users className="h-5 w-5 text-[#FACC15]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] mb-2">Team Access</h3>
                    <p className="text-[#6B7280] text-sm">Up to 5 team members</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-[#6D5EF9]/10 to-[#A78BFA]/10 rounded-2xl">
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Program Duration</h3>
              <p className="text-[#6B7280] text-sm mb-4">6-8 weeks of full access</p>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">Investment</h3>
              <p className="text-[#6B7280] text-sm">Completely free during pilot phase</p>
              <p className="text-xs text-[#6B7280] mt-2">Valued at $499/month post-pilot</p>
            </div>
          </div>

          {/* Application Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
              Apply for Pilot Access
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Company Name *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Your company name"
                  required
                  className="border-[#E5E7EB] focus:border-[#6D5EF9]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Contact Email *
                </label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="your.email@company.com"
                  required
                  className="border-[#E5E7EB] focus:border-[#6D5EF9]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  API Type *
                </label>
                <select
                  value={formData.apiType}
                  onChange={(e) => handleInputChange('apiType', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:border-[#6D5EF9] focus:outline-none"
                >
                  <option value="">Select your API type</option>
                  <option value="payment">Payment API</option>
                  <option value="banking">Banking/Financial</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="saas">SaaS Platform</option>
                  <option value="developer">Developer Tools</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Documentation URL
                </label>
                <Input
                  value={formData.docsUrl}
                  onChange={(e) => handleInputChange('docsUrl', e.target.value)}
                  placeholder="https://docs.yourcompany.com"
                  className="border-[#E5E7EB] focus:border-[#6D5EF9]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Monthly Integrations
                </label>
                <select
                  value={formData.monthlyIntegrations}
                  onChange={(e) => handleInputChange('monthlyIntegrations', e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E7EB] rounded-md focus:border-[#6D5EF9] focus:outline-none"
                >
                  <option value="">How many developers integrate monthly?</option>
                  <option value="1-10">1-10 developers</option>
                  <option value="11-50">11-50 developers</option>
                  <option value="51-200">51-200 developers</option>
                  <option value="200+">200+ developers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Pilot Goals
                </label>
                <Textarea
                  value={formData.pilotGoals}
                  onChange={(e) => handleInputChange('pilotGoals', e.target.value)}
                  placeholder="What do you hope to achieve with the pilot program? (e.g., reduce support tickets, improve developer onboarding, etc.)"
                  rows={4}
                  className="border-[#E5E7EB] focus:border-[#6D5EF9]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-[#6D5EF9] to-[#A78BFA] text-white hover:opacity-90 py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Apply for Pilot Access
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
