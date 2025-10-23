"use client"

import { useState, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  Home, 
  MessageSquare, 
  Database, 
  BarChart3, 
  Key, 
  CreditCard, 
  Users, 
  User, 
  LogOut,
  Bot,
  Settings,
  Activity,
  FileText,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'AI Copilot', href: '/datasets', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'API Keys', href: '/api-keys', icon: Key },
  { name: 'Settings', href: '/profile', icon: Settings },
]

interface SidebarProps {
  className?: string
}

const Sidebar = memo(function Sidebar({ className }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const user = session?.user as any
  const organization = user?.organization

  return (
    <>
      {/* Overlay for mobile */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          isExpanded ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-16",
          className
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo/Avatar */}
          <div className="flex items-center px-4 py-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-avenai rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow">
                <img src="/logo-mark-white.svg" alt="Avenai" className="h-5 w-5" />
              </div>
              {isExpanded && (
                <div className="flex flex-col min-w-0">
                  <div className="text-[15px] font-semibold text-charcoal truncate leading-tight">
                    {organization?.name || 'Avenai'}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {user?.email}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-3 text-[15px] font-medium rounded-lg transition-all duration-200",
                    "hover:bg-brand-50 hover:text-charcoal",
                    isActive
                      ? "bg-brand-50 text-brand-600 border-r-2 border-brand-500"
                      : "text-gray-600"
                  )}
                  title={!isExpanded ? item.name : undefined}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-200",
                      isActive ? "text-brand-600" : "text-gray-400 group-hover:text-charcoal"
                    )} 
                  />
                  {isExpanded && (
                    <div className="ml-3 flex items-center justify-between flex-1 min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-brand-600" />
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer with Sign Out */}
          <div className="px-2 py-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="group flex items-center w-full px-3 py-3 text-[15px] font-medium text-gray-600 rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-700"
              title={!isExpanded ? 'Sign Out' : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
              {isExpanded && (
                <span className="ml-3 truncate">Sign Out</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle sidebar"
      >
        <div className="w-5 h-5 flex flex-col justify-center space-y-1">
          <div className={cn(
            "h-0.5 bg-gray-600 transition-all duration-200",
            isExpanded && "rotate-45 translate-y-1.5"
          )} />
          <div className={cn(
            "h-0.5 bg-gray-600 transition-all duration-200",
            isExpanded && "opacity-0"
          )} />
          <div className={cn(
            "h-0.5 bg-gray-600 transition-all duration-200",
            isExpanded && "-rotate-45 -translate-y-1.5"
          )} />
        </div>
      </button>
    </>
  )
})

export default Sidebar
