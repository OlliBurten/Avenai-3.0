'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import components with SSR disabled to avoid framer-motion SSR issues
const Header = dynamic(() => import('@/components/Header'), { ssr: false })
const Hero = dynamic(() => import('@/components/Hero'), { ssr: false })
const ProblemSection = dynamic(() => import('@/components/ProblemSection'), { ssr: false })
const SectionActionAndLive = dynamic(() => import('@/components/SectionActionAndLive'), { ssr: false })
const RoadmapTrack = dynamic(() => import('@/components/RoadmapTrack'), { ssr: false })
const SectionShines = dynamic(() => import('@/components/SectionShines'), { ssr: false })
const SectionProofResults = dynamic(() => import('@/components/SectionProofResults'), { ssr: false })
const SectionPricingWrapper = dynamic(() => import('@/components/SectionPricingWrapper'), { ssr: false })
const SectionSecurityTrust = dynamic(() => import('@/components/SectionSecurityTrust'), { ssr: false })
const SiteFooter = dynamic(() => import('@/components/SiteFooter'), { ssr: false })
const DifferentiationBand = dynamic(() => import('@/components/DifferentiationBand'), { ssr: false })
import { 
  Bot, 
  Zap, 
  Shield, 
  BarChart3, 
  FileText, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Star,
  Globe,
  Lock,
  Sparkles,
  MessageSquare,
  Database,
  Cpu,
  TrendingUp,
  Eye,
  Key,
  Server,
  BookOpen,
  Code,
  Target,
  Clock,
  AlertTriangle,
  Building,
  Mail,
  ChevronRight,
  Play,
  Upload
} from 'lucide-react'

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className="marketing min-h-screen bg-white">
      <Header />
      <main id="main">

      {/* 1. Value */}
      <Hero />

        {/* 2. Tension */}
        <div data-next>
          <ProblemSection />
        </div>

        {/* 3. What's live today (id="get-started") */}
        <SectionActionAndLive />

        {/* 4. ICPs / use cases */}
        <SectionShines />

        {/* 5. Social proof */}
        <SectionProofResults />

        {/* 6. Differentiation */}
        <DifferentiationBand />

        {/* 7. Pricing (id="pricing") */}
        <SectionPricingWrapper />

        {/* 8. Trust/Security (id="security") */}
        <SectionSecurityTrust />

        {/* 9. Vision (roadmap) */}
        <RoadmapTrack />

        {/* Final CTA Section */}
        <section className="py-28 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              If you run an API-first business, you run onboarding on Avenai.
            </h2>
            <p className="text-xl text-blue-100 mb-12">
              Start with AI chat and analytics today — grow into the full Onboarding OS tomorrow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9E77ED] text-white hover:opacity-90 px-8 py-4 text-lg font-semibold transition" aria-label="Get Started Free - Start your free trial now">
                Get Started Free
                </button>
              <button className="rounded-full border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 text-lg font-semibold transition" aria-label="Book a Demo - Schedule a personalized demo">
                Book a Demo
                </button>
            </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
      </main>
    </div>
  )
}