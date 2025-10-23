import Link from 'next/link'
import { 
  Shield, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  Key, 
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2 bg-white/80 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <Link href="/" className="flex items-center gap-3 h-10">
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 grid place-items-center">
                <Shield className="size-5 text-white" />
              </div>
              <span className="text-2xl font-semibold text-gray-900 leading-[1] translate-y-[0.5px]">
                Avenai Security
              </span>
            </Link>
            <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium no-underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Security & Trust Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your data security is our top priority. Learn about our security measures, 
            compliance standards, and how to contact our security team.
          </p>
        </div>

        {/* Security Contact */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
            <Mail className="w-8 h-8 text-blue-600 mr-3" />
            Security Contact Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">General Security Questions</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">security@avenai.io</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">24-hour response time</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Protection Officer</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-gray-700">dpo@avenai.io</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">48-hour response time</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-xl">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Security Incident Reporting
            </h3>
            <p className="text-blue-800 mb-4">
              If you discover a security vulnerability or have concerns about data security, 
              please report it immediately to our security team.
            </p>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-blue-600 mr-3" />
              <span className="text-blue-900 font-semibold">security-incident@avenai.io</span>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Shield className="w-7 h-7 text-green-600 mr-3" />
              Security Measures
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">256-bit Encryption</h3>
                  <p className="text-gray-600 text-sm">All data encrypted in transit and at rest</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Multi-tenant Isolation</h3>
                  <p className="text-gray-600 text-sm">Complete data separation between organizations</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Regular Security Audits</h3>
                  <p className="text-gray-600 text-sm">Third-party security assessments</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">24/7 Monitoring</h3>
                  <p className="text-gray-600 text-sm">Continuous security monitoring and threat detection</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Eye className="w-7 h-7 text-purple-600 mr-3" />
              Compliance & Privacy
            </h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">GDPR Compliant</h3>
                  <p className="text-gray-600 text-sm">Full data privacy compliance</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">SOC 2 Ready</h3>
                  <p className="text-gray-600 text-sm">Security controls and audits</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Data Export/Deletion</h3>
                  <p className="text-gray-600 text-sm">Complete data portability and deletion</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Zero-Knowledge Architecture</h3>
                  <p className="text-gray-600 text-sm">We cannot access your data</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white" style={{color: 'white'}}>
          <h2 className="text-3xl font-bold mb-6" style={{color: 'white'}}>Trusted by Enterprise Teams</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center text-white" style={{color: 'white'}}>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Server className="w-8 h-8" style={{color: 'white'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white" style={{color: 'white'}}>99.9% Uptime SLA</h3>
              <p className="text-white/90" style={{color: 'rgba(255, 255, 255, 0.9)'}}>Enterprise-grade reliability</p>
            </div>
            <div className="text-center text-white" style={{color: 'white'}}>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" style={{color: 'white'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white" style={{color: 'white'}}>HTTPS Everywhere</h3>
              <p className="text-white/90" style={{color: 'rgba(255, 255, 255, 0.9)'}}>Secure data transmission</p>
            </div>
            <div className="text-center text-white" style={{color: 'white'}}>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8" style={{color: 'white'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white" style={{color: 'white'}}>PostgreSQL Enterprise</h3>
              <p className="text-white/90" style={{color: 'rgba(255, 255, 255, 0.9)'}}>Industry-standard database</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600">
          <p>Questions about security? Contact us at <a href="mailto:security@avenai.io" className="text-blue-600 hover:text-blue-500">security@avenai.io</a></p>
        </div>
      </div>
    </div>
  )
}
