import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { 
  CollaborationManager, 
  detectCollaborationIntent,
  formatCollaborationResult,
  formatTeamMembers,
  formatSharedDocuments,
  formatCollaborationAnalytics,
  ShareRequest
} from '@/lib/collaboration'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'avenai-secret-key-2024')

async function getSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return null
    }
    
    const { payload } = await jwtVerify(token.value, JWT_SECRET)
    return { user: payload }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'shared-documents':
        const sharedDocs = await CollaborationManager.getSharedDocuments(session.user.id as string)
        return NextResponse.json({ 
          success: true, 
          data: sharedDocs,
          formatted: formatSharedDocuments(sharedDocs)
        })

      case 'team-members':
        const teamMembers = await CollaborationManager.getTeamMembers(session.user.organizationId as string)
        return NextResponse.json({ 
          success: true, 
          data: teamMembers,
          formatted: formatTeamMembers(teamMembers)
        })

      case 'active-sessions':
        const documentId = searchParams.get('documentId')
        if (!documentId) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }
        const sessions = await CollaborationManager.getActiveSessions(documentId)
        return NextResponse.json({ 
          success: true, 
          data: sessions
        })

      case 'analytics':
        const analytics = await CollaborationManager.getCollaborationAnalytics(session.user.organizationId as string)
        return NextResponse.json({ 
          success: true, 
          data: analytics,
          formatted: formatCollaborationAnalytics(analytics)
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Collaboration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'share-document':
        const shareRequest: ShareRequest = {
          documentId: data.documentId,
          emails: data.emails,
          permissions: data.permissions || 'view',
          message: data.message,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
        }

        const shareResult = await CollaborationManager.shareDocument(
          shareRequest.documentId,
          session.user.id as string,
          shareRequest
        )

        return NextResponse.json({
          success: shareResult.success,
          data: shareResult,
          formatted: formatCollaborationResult(shareResult)
        })

      case 'start-session':
        const sessionResult = await CollaborationManager.startCollaborationSession(
          data.documentId,
          session.user.id as string,
          data.sessionType || 'chat'
        )

        if (sessionResult) {
          return NextResponse.json({
            success: true,
            data: sessionResult,
            formatted: `✅ **Collaboration Session Started**\n\nSession ID: ${sessionResult.sessionId}\nParticipants: ${sessionResult.participants.length}`
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to start collaboration session'
          })
        }

      case 'join-session':
        const joinResult = await CollaborationManager.joinCollaborationSession(
          data.sessionId,
          session.user.id as string
        )

        return NextResponse.json({
          success: joinResult,
          message: joinResult ? 'Successfully joined session' : 'Failed to join session'
        })

      case 'update-session':
        await CollaborationManager.updateSessionActivity(
          data.sessionId,
          session.user.id as string
        )

        return NextResponse.json({
          success: true,
          message: 'Session activity updated'
        })

      case 'revoke-access':
        const revokeResult = await CollaborationManager.revokeAccess(
          data.shareId,
          session.user.id as string
        )

        return NextResponse.json({
          success: revokeResult,
          message: revokeResult ? 'Access revoked successfully' : 'Failed to revoke access'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Collaboration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
