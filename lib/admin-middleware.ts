import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

// Middleware to protect admin routes
export function adminMiddleware(handler: Function) {
  return withAuth(async (req: NextRequest, session: any) => {
    // Check if user is super admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }
    
    return handler(req, session)
  })
}
