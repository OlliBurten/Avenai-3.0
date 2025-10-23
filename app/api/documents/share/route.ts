import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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
    console.error('Session error:', error)
    return null
  }
}

// Share document with user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, userEmail, permission = 'READ' } = body

    if (!documentId || !userEmail) {
      return NextResponse.json(
        { error: 'Document ID and user email are required' },
        { status: 400 }
      )
    }

    // Validate permission
    if (!['READ', 'WRITE', 'ADMIN'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission level' },
        { status: 400 }
      )
    }

    // Check if document exists and user owns it
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id as string
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Find the user to share with
    const targetUser = await prisma.user.findFirst({
      where: {
        email: userEmail,
        isActive: true
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already shared
    const existingShare = await prisma.documentShare.findFirst({
      where: {
        documentId: documentId,
        userId: targetUser.id
      }
    })

    if (existingShare) {
      // Update existing share
      const updatedShare = await prisma.documentShare.update({
        where: { id: existingShare.id },
        data: { permission }
      })

      return NextResponse.json({
        message: 'Document sharing updated successfully',
        share: updatedShare
      })
    }

    // Create new share
    const share = await prisma.documentShare.create({
      data: {
        documentId: documentId,
        userId: targetUser.id,
        permission,
        sharedBy: session.user.id as string
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Document shared successfully',
      share
    })
  } catch (error) {
    console.error('Share document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get shared documents for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'received' or 'shared'

    if (type === 'received') {
      // Documents shared with current user
      const sharedDocuments = await prisma.documentShare.findMany({
        where: {
          userId: session.user.id as string
        },
        include: {
          document: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          sharedByUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({ sharedDocuments })
    } else if (type === 'shared') {
      // Documents shared by current user
      const sharedDocuments = await prisma.documentShare.findMany({
        where: {
          sharedBy: session.user.id as string
        },
        include: {
          document: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({ sharedDocuments })
    } else {
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Get shared documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update or remove document share
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shareId, permission } = body

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      )
    }

    // Check if user owns the document being shared
    const share = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        document: {
          userId: session.user.id as string
        }
      }
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or access denied' },
        { status: 404 }
      )
    }

    if (permission) {
      // Update permission
      if (!['READ', 'WRITE', 'ADMIN'].includes(permission)) {
        return NextResponse.json(
          { error: 'Invalid permission level' },
          { status: 400 }
        )
      }

      const updatedShare = await prisma.documentShare.update({
        where: { id: shareId },
        data: { permission }
      })

      return NextResponse.json({
        message: 'Share permission updated successfully',
        share: updatedShare
      })
    } else {
      // Remove share
      await prisma.documentShare.delete({
        where: { id: shareId }
      })

      return NextResponse.json({
        message: 'Document share removed successfully'
      })
    }
  } catch (error) {
    console.error('Update share error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
