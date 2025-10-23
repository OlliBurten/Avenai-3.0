import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Scale, Shield, AlertTriangle, CheckCircle, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using Avenai's AI documentation assistant platform, you agree to be bound by 
              these Terms of Service. If you disagree with any part of these terms, you may not access the service.
            </p>
          </Card>

          {/* Service Description */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Service Description</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Avenai provides an AI-powered documentation assistant that helps organizations:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li>• Upload and process documents using AI</li>
              <li>• Chat with AI about document content</li>
              <li>• Embed AI chat widgets on websites</li>
              <li>• Access analytics and usage insights</li>
              <li>• Integrate via API for automation</li>
            </ul>
          </Card>

          {/* User Responsibilities */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">User Responsibilities</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Security</h3>
                <p className="text-gray-600">You are responsible for maintaining the confidentiality of your account credentials.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Compliance</h3>
                <p className="text-gray-600">You must ensure all uploaded content complies with applicable laws and doesn't infringe on third-party rights.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage Limits</h3>
                <p className="text-gray-600">You agree to respect usage limits based on your subscription plan and not abuse the service.</p>
              </div>
            </div>
          </Card>

          {/* Account Eligibility */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Account Eligibility</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Authentication Required</h3>
                <p className="text-gray-600 mb-4">
                  Avenai is designed for professional organizations. Account creation requires authentication through enterprise-grade identity providers to ensure security and maintain service quality.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Accepted Account Types:</h4>
                  <ul className="space-y-1 text-gray-600 text-sm">
                    <li>• Google Workspace business accounts (@company.com domains)</li>
                    <li>• Microsoft Azure AD organizational accounts (@company.com domains)</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Eligibility Restrictions</h3>
                <p className="text-gray-600">
                  Personal accounts (@gmail.com, @outlook.com, @hotmail.com, etc.) are not permitted. 
                  This restriction helps prevent spam, ensures professional usage, and maintains platform security.
                </p>
              </div>
            </div>
          </Card>

          {/* Prohibited Uses */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Prohibited Uses</h2>
            </div>
            <p className="text-gray-600 mb-4">You may not use Avenai for:</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Illegal activities or content that violates laws</li>
              <li>• Harassment, abuse, or harmful content</li>
              <li>• Attempting to gain unauthorized access</li>
              <li>• Reverse engineering or copying our technology</li>
              <li>• Spam, phishing, or malicious activities</li>
              <li>• Content that infringes intellectual property rights</li>
            </ul>
          </Card>

          {/* Intellectual Property */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Intellectual Property</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Avenai's Rights</h3>
                <p className="text-gray-600">Avenai retains all rights to the platform, including software, algorithms, and proprietary technology.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Content</h3>
                <p className="text-gray-600">You retain ownership of your uploaded content while granting Avenai necessary rights to provide the service.</p>
              </div>
            </div>
          </Card>

          {/* Service Availability */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Service Availability</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service. 
                We may perform maintenance, updates, or modifications that temporarily affect availability.
              </p>
              <p className="text-gray-600">
                We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </div>
          </Card>

          {/* Limitation of Liability */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              Avenai provides the service "as is" without warranties. We are not liable for indirect, 
              incidental, or consequential damages. Our total liability is limited to the amount you 
              paid for the service in the 12 months preceding the claim.
            </p>
          </Card>

          {/* Changes to Terms */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these terms from time to time. We will notify users of significant changes 
              via email or platform notification. Continued use of the service constitutes acceptance 
              of updated terms.
            </p>
          </Card>

          {/* Contact */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-gray-600">
              <p>Email: legal@avenai.io</p>
              <p>Support: support@avenai.io</p>
              <p>Address: Avenai Legal Department</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
