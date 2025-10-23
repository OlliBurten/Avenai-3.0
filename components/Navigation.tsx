"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AvenaiLogo from '@/components/brand/AvenaiLogo'
import { 
  Bot, 
  Upload, 
  MessageSquare, 
  BarChart3, 
  LogOut, 
  User, 
  Key, 
  CreditCard,
  Home,
  Shield,
  Settings,
  BookOpen
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: string
  organizationId: string
  organization: {
    id: string
    name: string
  }
}

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
      } else {
        // Only redirect if on protected pages (dashboard, profile, etc.)
        const protectedPages = ['/dashboard', '/profile', '/api-keys', '/integration-guide', '/usage', '/billing', '/admin']
        const isProtectedPage = protectedPages.some(page => pathname.startsWith(page))
        
        if (isProtectedPage) {
          router.push('/auth/signin')
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      // Only redirect if on protected pages
      const protectedPages = ['/dashboard', '/profile', '/api-keys', '/integration-guide', '/usage', '/billing', '/admin']
      const isProtectedPage = protectedPages.some(page => pathname.startsWith(page))
      
      if (isProtectedPage) {
        router.push('/auth/signin')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/signin')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Don't show navigation on auth pages or marketing homepage when not logged in
  if (pathname.startsWith('/auth/') || (pathname === '/' && !user)) {
    return null
  }

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="inline-flex items-center leading-none [translate-y:0.5px]">
              <AvenaiLogo 
                variant="lockup" 
                gradient={false}
                className="h-24 md:h-28 text-neutral-900 dark:text-white"
                title="Avenai"
              />
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  if (!user) {
    return null
  }

  const navigationTabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'datasets', name: 'Documents', icon: Upload, path: '/datasets' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'api-keys', name: 'API Keys', icon: Key, path: '/api-keys' },
    { id: 'settings', name: 'Settings', icon: Settings, path: '/profile' },
    // Admin-only tabs
    ...(user.role === 'SUPER_ADMIN' ? [
      { id: 'admin', name: 'Admin', icon: Shield, path: '/admin' }
    ] : [])
  ]

  const getCurrentTab = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname.startsWith('/datasets')) return 'datasets'
    if (pathname.startsWith('/analytics')) return 'analytics'
    if (pathname === '/api-keys') return 'api-keys'
    if (pathname === '/profile' || pathname === '/settings') return 'settings'
    if (pathname.startsWith('/admin')) return 'admin'
    return 'dashboard'
  }

  const currentTab = getCurrentTab()

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="inline-flex items-center leading-none [translate-y:0.5px]">
              <AvenaiLogo 
                variant="lockup" 
                gradient={false}
                className="h-24 md:h-28 text-neutral-900 dark:text-white"
                title="Avenai"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secondary-900">
                  {user.name}
                </p>
                <p className="text-xs text-secondary-500">
                  {user.organization.name}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-full border-2 hover:bg-gradient-to-r hover:from-[#7F56D9] hover:to-[#9E77ED] hover:text-white flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.path)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
