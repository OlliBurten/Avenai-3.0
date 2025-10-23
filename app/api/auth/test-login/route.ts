// app/api/auth/test-login/route.ts
// Temporary test endpoint to bypass authentication for development

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    // Check if we have any authentication
    const token = await getToken({ req });
    
    if (token) {
      return NextResponse.json({ 
        message: 'Already authenticated',
        user: token,
        redirect: '/dashboard'
      });
    }

    // For development, create a mock session
    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@avenai.local',
      name: 'Development User',
      organizationId: 'dev-org-123'
    };

    return NextResponse.json({ 
      message: 'Development mode - no authentication required',
      mockUser,
      instructions: [
        'This is a temporary bypass for development',
        'In production, proper authentication will be required',
        'You can access the dashboard directly'
      ]
    });

  } catch (error) {
    console.error('Test login error:', error);
    return NextResponse.json({ 
      error: 'Test login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

