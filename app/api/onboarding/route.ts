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

// Get onboarding status
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      include: {
        organization: {
          include: {
            datasets: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            },
            documents: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check onboarding completion status
    const hasCreatedDataset = (user.organization?.datasets?.length || 0) > 0
    const hasUploadedDocument = (user.organization?.documents?.length || 0) > 0
    const hasUsedChat = await prisma.chatSession.count({
      where: {
        organizationId: user.organizationId!,
        userIdentifier: user.email!
      }
    }) > 0

    const hasGeneratedApiKey = !!user.organization?.apiKeyHash
    const hasCompletedEmbed = await prisma.analyticsEvent.count({
      where: {
        organizationId: user.organizationId!,
        eventType: 'onboarding_step_completed',
        eventData: {
          path: ['stepId'],
          equals: 'embed-widget'
        }
      }
    }) > 0

    const onboardingSteps = [
      {
        id: 'welcome',
        title: 'Welcome to Avenai',
        description: 'Get started with your AI documentation assistant',
        completed: true,
        icon: '👋'
      },
      {
        id: 'create-dataset',
        title: 'Create Your First Dataset',
        description: 'Organize your content by creating a dataset (e.g., API docs, product guides)',
        completed: hasCreatedDataset,
        icon: '📁'
      },
      {
        id: 'upload-document',
        title: 'Upload Document to Dataset',
        description: 'Add your first document to the dataset you created',
        completed: hasUploadedDocument,
        icon: '📄'
      },
      {
        id: 'try-chat',
        title: 'Test AI Chat',
        description: 'Ask questions about your uploaded documents',
        completed: hasUsedChat,
        icon: '💬'
      },
      {
        id: 'generate-api-key',
        title: 'Generate API Key',
        description: 'Create an API key for integrations and automation',
        completed: hasGeneratedApiKey,
        icon: '🔑'
      },
      {
        id: 'embed-widget',
        title: 'Embed Chat Widget',
        description: 'Add the AI chat widget to your website',
        completed: hasCompletedEmbed,
        icon: '🌐'
      }
    ]

    const completedSteps = onboardingSteps.filter(step => step.completed).length
    const totalSteps = onboardingSteps.length
    const isComplete = completedSteps === totalSteps

    return NextResponse.json({
      isComplete,
      progress: {
        completed: completedSteps,
        total: totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100)
      },
      steps: onboardingSteps,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        organization: user.organization?.name || 'Unknown'
      }
    })

  } catch (error) {
    console.error('Onboarding status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Complete onboarding step
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stepId, completed = true } = body

    if (!stepId) {
      return NextResponse.json(
        { error: 'Step ID is required' },
        { status: 400 }
      )
    }

    // Log onboarding step completion
    await prisma.analyticsEvent.create({
      data: {
        organizationId: session.user.organizationId as string,
        eventType: 'onboarding_step_completed',
        eventData: {
          stepId,
          completed,
          timestamp: new Date().toISOString()
        },
        userIdentifier: session.user.email as string
      }
    })

    return NextResponse.json({
      message: 'Onboarding step updated successfully',
      stepId,
      completed
    })

  } catch (error) {
    console.error('Onboarding step error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Skip onboarding
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log onboarding skip
    await prisma.analyticsEvent.create({
      data: {
        organizationId: session.user.organizationId as string,
        eventType: 'onboarding_skipped',
        eventData: {
          timestamp: new Date().toISOString()
        },
        userIdentifier: session.user.email as string
      }
    })

    return NextResponse.json({
      message: 'Onboarding skipped successfully'
    })

  } catch (error) {
    console.error('Skip onboarding error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
