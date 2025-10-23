import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Lock, Eye, Database, Globe, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
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
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              At Avenai, we are committed to protecting your privacy and ensuring the security of your data. 
              This Privacy Policy explains how we collect, use, and protect your information when you use 
              our AI documentation assistant platform.
            </p>
          </Card>

          {/* Data Collection */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Data We Collect</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Information</h3>
                <p className="text-gray-600">Name, email address, organization details, and authentication credentials.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Data</h3>
                <p className="text-gray-600">Files you upload, including PDFs, text documents, and other content for AI processing.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage Data</h3>
                <p className="text-gray-600">Chat interactions, API usage, analytics, and platform activity logs.</p>
              </div>
            </div>
          </Card>

          {/* Data Usage */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">How We Use Your Data</h2>
            </div>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <span>Provide AI-powered document analysis and chat functionality</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <span>Improve our AI models and platform performance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <span>Provide customer support and technical assistance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <span>Ensure platform security and prevent abuse</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <span>Comply with legal obligations and enforce our terms</span>
              </li>
            </ul>
          </Card>

          {/* Data Security */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                We implement enterprise-grade security measures to protect your data:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• AES-256 encryption for data at rest and in transit</li>
                <li>• Multi-tenant architecture with row-level security</li>
                <li>• Regular security audits and penetration testing</li>
                <li>• SOC 2 compliance and GDPR adherence</li>
                <li>• Access controls and audit logging</li>
              </ul>
            </div>
          </Card>

          {/* Data Rights */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Your Rights</h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">You have the right to:</p>
              <ul className="space-y-2 text-gray-600">
                <li>• Access and download your data</li>
                <li>• Request data deletion or anonymization</li>
                <li>• Correct inaccurate information</li>
                <li>• Object to certain data processing</li>
                <li>• Data portability and export</li>
                <li>• Withdraw consent at any time</li>
              </ul>
            </div>
          </Card>

          {/* Contact */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-orange-700" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy or your data rights, please contact us:
            </p>
            <div className="space-y-2 text-gray-600">
              <p>Email: privacy@avenai.io</p>
              <p>Support: support@avenai.io</p>
              <p>Data Protection Officer: dpo@avenai.io</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
