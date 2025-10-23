import { NextRequest, NextResponse } from 'next/server'
import { 
  getDocumentVersionHistory, 
  compareDocumentVersions, 
  restoreDocumentVersion,
  analyzeDocumentChangeImpact 
} from '@/lib/version-control'
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

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")
    const action = searchParams.get("action")

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    switch (action) {
      case 'history':
        const history = await getDocumentVersionHistory(documentId)
        return NextResponse.json({
          success: true,
          documentId,
          history: history.map(version => ({
            id: version.id,
            version: version.version,
            createdAt: version.metadata.createdAt,
            createdBy: version.metadata.createdBy,
            changeType: version.metadata.changeType,
            changeDescription: version.metadata.changeDescription,
            fileSize: version.metadata.fileSize,
            chunkCount: version.metadata.chunkCount,
            semanticScore: version.metadata.semanticScore,
            tags: version.metadata.tags
          }))
        })

      case 'compare':
        const versionA = searchParams.get("versionA")
        const versionB = searchParams.get("versionB")
        
        if (!versionA || !versionB) {
          return NextResponse.json(
            { error: "Both versionA and versionB are required for comparison" },
            { status: 400 }
          )
        }

        const diff = await compareDocumentVersions(documentId, versionA, versionB)
        return NextResponse.json({
          success: true,
          documentId,
          diff
        })

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'history' or 'compare'" },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error("Version control error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve version information" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, documentId, version, content, changeDescription, tags } = body

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    switch (action) {
      case 'restore':
        if (!version) {
          return NextResponse.json(
            { error: "Version is required for restore" },
            { status: 400 }
          )
        }

        const restoredVersion = await restoreDocumentVersion(
          documentId, 
          version, 
          session.user.id as string
        )

        return NextResponse.json({
          success: true,
          message: `Document restored to version ${version}`,
          restoredVersion: {
            id: restoredVersion.id,
            version: restoredVersion.version,
            createdAt: restoredVersion.metadata.createdAt,
            createdBy: restoredVersion.metadata.createdBy,
            changeType: restoredVersion.metadata.changeType,
            changeDescription: restoredVersion.metadata.changeDescription
          }
        })

      case 'analyze-impact':
        if (!content) {
          return NextResponse.json(
            { error: "Content is required for impact analysis" },
            { status: 400 }
          )
        }

        const impact = await analyzeDocumentChangeImpact(documentId, content)
        
        return NextResponse.json({
          success: true,
          documentId,
          impact: {
            affectedChunks: impact.affectedChunks,
            affectedEndpoints: impact.affectedEndpoints,
            breakingChanges: impact.breakingChanges,
            migrationRequired: impact.migrationRequired,
            estimatedImpact: impact.estimatedImpact,
            recommendations: impact.recommendations
          }
        })

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'restore' or 'analyze-impact'" },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error("Version control operation error:", error)
    return NextResponse.json(
      { error: "Failed to perform version control operation" },
      { status: 500 }
    )
  }
}
