// Version Control and Change Tracking System for Avenai
// Tracks document changes, versions, and provides diff capabilities

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  content: string
  metadata: {
    createdAt: Date
    createdBy: string
    changeType: 'create' | 'update' | 'delete' | 'restore'
    changeDescription?: string
    fileSize: number
    chunkCount: number
    semanticScore: number
    tags?: string[]
  }
  parentVersionId?: string
  childVersionIds?: string[]
}

export interface ChangeDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  content: string
  lineNumber?: number
  chunkIndex?: number
}

export interface DocumentDiff {
  versionA: string
  versionB: string
  changes: ChangeDiff[]
  summary: {
    addedChunks: number
    removedChunks: number
    modifiedChunks: number
    unchangedChunks: number
  }
}

export interface ChangeImpact {
  affectedChunks: string[]
  affectedEndpoints?: string[]
  breakingChanges: boolean
  migrationRequired: boolean
  estimatedImpact: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export class VersionController {
  private static instance: VersionController
  private versionHistory: Map<string, DocumentVersion[]> = new Map()

  constructor() {
    if (!VersionController.instance) {
      VersionController.instance = this
    }
    return VersionController.instance
  }

  static getInstance(): VersionController {
    if (!VersionController.instance) {
      VersionController.instance = new VersionController()
    }
    return VersionController.instance
  }

  async createVersion(
    documentId: string,
    content: string,
    metadata: {
      createdBy: string
      changeDescription?: string
      changeType: 'create' | 'update' | 'delete' | 'restore'
      tags?: string[]
    }
  ): Promise<DocumentVersion> {
    const versionNumber = await this.generateVersionNumber(documentId)
    
    const version: DocumentVersion = {
      id: `${documentId}-v${versionNumber}`,
      documentId,
      version: versionNumber,
      content,
      metadata: {
        createdAt: new Date(),
        createdBy: metadata.createdBy,
        changeType: metadata.changeType,
        changeDescription: metadata.changeDescription,
        fileSize: content.length,
        chunkCount: this.estimateChunkCount(content),
        semanticScore: this.calculateSemanticScore(content),
        tags: metadata.tags || []
      }
    }

    // Store version in history
    if (!this.versionHistory.has(documentId)) {
      this.versionHistory.set(documentId, [])
    }
    this.versionHistory.get(documentId)!.push(version)

    // Establish parent-child relationships
    await this.establishVersionRelationships(documentId, version)

    console.log(`📝 Created version ${versionNumber} for document ${documentId}`)
    return version
  }

  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    const history = this.versionHistory.get(documentId) || []
    return history.sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())
  }

  async getVersion(documentId: string, version: string): Promise<DocumentVersion | null> {
    const history = this.versionHistory.get(documentId) || []
    return history.find(v => v.version === version) || null
  }

  async compareVersions(documentId: string, versionA: string, versionB: string): Promise<DocumentDiff> {
    const versionA_data = await this.getVersion(documentId, versionA)
    const versionB_data = await this.getVersion(documentId, versionB)

    if (!versionA_data || !versionB_data) {
      throw new Error('One or both versions not found')
    }

    const changes = this.generateDiff(versionA_data.content, versionB_data.content)
    
    return {
      versionA,
      versionB,
      changes,
      summary: this.calculateDiffSummary(changes)
    }
  }

  async analyzeChangeImpact(documentId: string, newContent: string): Promise<ChangeImpact> {
    const latestVersion = await this.getLatestVersion(documentId)
    if (!latestVersion) {
      return {
        affectedChunks: [],
        breakingChanges: false,
        migrationRequired: false,
        estimatedImpact: 'low',
        recommendations: ['This is a new document']
      }
    }

    const diff = this.generateDiff(latestVersion.content, newContent)
    const affectedChunks = this.identifyAffectedChunks(diff)
    const affectedEndpoints = this.identifyAffectedEndpoints(diff)
    const breakingChanges = this.detectBreakingChanges(diff)
    const migrationRequired = this.assessMigrationRequirements(diff)
    const estimatedImpact = this.estimateImpact(diff, affectedChunks.length)

    return {
      affectedChunks,
      affectedEndpoints,
      breakingChanges,
      migrationRequired,
      estimatedImpact,
      recommendations: this.generateRecommendations(diff, breakingChanges, migrationRequired)
    }
  }

  async restoreVersion(documentId: string, version: string, restoredBy: string): Promise<DocumentVersion> {
    const targetVersion = await this.getVersion(documentId, version)
    if (!targetVersion) {
      throw new Error('Version not found')
    }

    return await this.createVersion(documentId, targetVersion.content, {
      createdBy: restoredBy,
      changeType: 'restore',
      changeDescription: `Restored from version ${version}`,
      tags: ['restore', 'rollback']
    })
  }

  async getChangeTimeline(documentId: string): Promise<any[]> {
    const history = await this.getVersionHistory(documentId)
    
    return history.map(version => ({
      version: version.version,
      timestamp: version.metadata.createdAt,
      author: version.metadata.createdBy,
      changeType: version.metadata.changeType,
      description: version.metadata.changeDescription,
      fileSize: version.metadata.fileSize,
      chunkCount: version.metadata.chunkCount,
      semanticScore: version.metadata.semanticScore,
      tags: version.metadata.tags
    }))
  }

  private async generateVersionNumber(documentId: string): Promise<string> {
    const history = await this.getVersionHistory(documentId)
    
    if (history.length === 0) {
      return '1.0.0'
    }

    const latestVersion = history[0]
    const versionParts = latestVersion.version.split('.').map(Number)
    
    // Simple versioning: increment patch version
    versionParts[2] = (versionParts[2] || 0) + 1
    
    return versionParts.join('.')
  }

  private async establishVersionRelationships(documentId: string, newVersion: DocumentVersion): Promise<void> {
    const history = this.versionHistory.get(documentId) || []
    const previousVersion = history[history.length - 2] // Get second to last (before adding new)

    if (previousVersion) {
      newVersion.parentVersionId = previousVersion.id
      if (!previousVersion.childVersionIds) {
        previousVersion.childVersionIds = []
      }
      previousVersion.childVersionIds.push(newVersion.id)
    }
  }

  private generateDiff(contentA: string, contentB: string): ChangeDiff[] {
    const linesA = contentA.split('\n')
    const linesB = contentB.split('\n')
    const changes: ChangeDiff[] = []

    // Simple diff algorithm (in production, use a proper diff library)
    const maxLines = Math.max(linesA.length, linesB.length)
    
    for (let i = 0; i < maxLines; i++) {
      const lineA = linesA[i] || ''
      const lineB = linesB[i] || ''

      if (lineA === lineB) {
        changes.push({
          type: 'unchanged',
          content: lineA,
          lineNumber: i + 1
        })
      } else if (!lineA && lineB) {
        changes.push({
          type: 'added',
          content: lineB,
          lineNumber: i + 1
        })
      } else if (lineA && !lineB) {
        changes.push({
          type: 'removed',
          content: lineA,
          lineNumber: i + 1
        })
      } else {
        changes.push({
          type: 'modified',
          content: lineB,
          lineNumber: i + 1
        })
      }
    }

    return changes
  }

  private calculateDiffSummary(changes: ChangeDiff[]): DocumentDiff['summary'] {
    return {
      addedChunks: changes.filter(c => c.type === 'added').length,
      removedChunks: changes.filter(c => c.type === 'removed').length,
      modifiedChunks: changes.filter(c => c.type === 'modified').length,
      unchangedChunks: changes.filter(c => c.type === 'unchanged').length
    }
  }

  private identifyAffectedChunks(diff: ChangeDiff[]): string[] {
    const affectedChunks: string[] = []
    
    diff.forEach(change => {
      if (change.type !== 'unchanged') {
        // Extract chunk identifiers from content
        const chunkMatches = change.content.match(/chunk-\d+/g)
        if (chunkMatches) {
          affectedChunks.push(...chunkMatches)
        }
      }
    })

    return Array.from(new Set(affectedChunks)) // Remove duplicates
  }

  private identifyAffectedEndpoints(diff: ChangeDiff[]): string[] {
    const affectedEndpoints: string[] = []
    
    diff.forEach(change => {
      if (change.type !== 'unchanged') {
        // Extract API endpoints from content
        const endpointMatches = change.content.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/g)
        if (endpointMatches) {
          affectedEndpoints.push(...endpointMatches)
        }
      }
    })

    return Array.from(new Set(affectedEndpoints)) // Remove duplicates
  }

  private detectBreakingChanges(diff: ChangeDiff[]): boolean {
    return diff.some(change => {
      if (change.type === 'removed' || change.type === 'modified') {
        // Check for breaking change patterns
        const breakingPatterns = [
          /endpoint.*removed/i,
          /parameter.*required/i,
          /response.*changed/i,
          /authentication.*changed/i,
          /deprecated/i
        ]
        
        return breakingPatterns.some(pattern => pattern.test(change.content))
      }
      return false
    })
  }

  private assessMigrationRequirements(diff: ChangeDiff[]): boolean {
    return diff.some(change => {
      if (change.type === 'modified' || change.type === 'added') {
        const migrationPatterns = [
          /migration/i,
          /upgrade/i,
          /breaking/i,
          /deprecated/i,
          /new.*version/i
        ]
        
        return migrationPatterns.some(pattern => pattern.test(change.content))
      }
      return false
    })
  }

  private estimateImpact(diff: ChangeDiff[], affectedChunkCount: number): 'low' | 'medium' | 'high' {
    const changeCount = diff.filter(c => c.type !== 'unchanged').length
    const changeRatio = changeCount / diff.length

    if (changeRatio < 0.1 && affectedChunkCount < 5) {
      return 'low'
    } else if (changeRatio < 0.3 && affectedChunkCount < 20) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  private generateRecommendations(
    diff: ChangeDiff[],
    breakingChanges: boolean,
    migrationRequired: boolean
  ): string[] {
    const recommendations: string[] = []

    if (breakingChanges) {
      recommendations.push('⚠️ Breaking changes detected - notify all API consumers')
      recommendations.push('📋 Update API documentation and version numbers')
      recommendations.push('🧪 Run comprehensive tests before deployment')
    }

    if (migrationRequired) {
      recommendations.push('🔄 Create migration guide for existing users')
      recommendations.push('📅 Plan deprecation timeline for old versions')
    }

    const addedEndpoints = diff.filter(c => c.type === 'added' && /endpoint/i.test(c.content)).length
    if (addedEndpoints > 0) {
      recommendations.push(`✅ ${addedEndpoints} new endpoint(s) added - update client libraries`)
    }

    const modifiedEndpoints = diff.filter(c => c.type === 'modified' && /endpoint/i.test(c.content)).length
    if (modifiedEndpoints > 0) {
      recommendations.push(`🔧 ${modifiedEndpoints} endpoint(s) modified - verify compatibility`)
    }

    return recommendations
  }

  private async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    const history = await this.getVersionHistory(documentId)
    return history.length > 0 ? history[0] : null
  }

  private estimateChunkCount(content: string): number {
    // Simple estimation based on content length
    return Math.ceil(content.length / 1000)
  }

  private calculateSemanticScore(content: string): number {
    // Simple semantic score calculation
    const technicalTerms = content.match(/\b(?:API|endpoint|request|response|authentication|error)\b/gi)
    const codeBlocks = content.match(/```/g)
    const headings = content.match(/^#{1,6}\s+/gm)

    let score = 0.1 // Base score
    if (technicalTerms) score += technicalTerms.length * 0.1
    if (codeBlocks) score += codeBlocks.length * 0.2
    if (headings) score += headings.length * 0.1

    return Math.min(score, 1.0)
  }

  // Generate version summary for display
  generateVersionSummary(version: DocumentVersion): string {
    return `## Version ${version.version}

**Created:** ${version.metadata.createdAt.toISOString()}
**Author:** ${version.metadata.createdBy}
**Type:** ${version.metadata.changeType}
**Size:** ${version.metadata.fileSize} characters
**Chunks:** ${version.metadata.chunkCount}
**Semantic Score:** ${version.metadata.semanticScore.toFixed(2)}

${version.metadata.changeDescription ? `**Description:** ${version.metadata.changeDescription}` : ''}

${version.metadata.tags && version.metadata.tags.length > 0 ? `**Tags:** ${version.metadata.tags.join(', ')}` : ''}`
  }
}

// Export convenience functions
export function createDocumentVersion(
  documentId: string,
  content: string,
  metadata: {
    createdBy: string
    changeDescription?: string
    changeType: 'create' | 'update' | 'delete' | 'restore'
    tags?: string[]
  }
): Promise<DocumentVersion> {
  const controller = VersionController.getInstance()
  return controller.createVersion(documentId, content, metadata)
}

export function getDocumentVersionHistory(documentId: string): Promise<DocumentVersion[]> {
  const controller = VersionController.getInstance()
  return controller.getVersionHistory(documentId)
}

export function compareDocumentVersions(documentId: string, versionA: string, versionB: string): Promise<DocumentDiff> {
  const controller = VersionController.getInstance()
  return controller.compareVersions(documentId, versionA, versionB)
}

export function analyzeDocumentChangeImpact(documentId: string, newContent: string): Promise<ChangeImpact> {
  const controller = VersionController.getInstance()
  return controller.analyzeChangeImpact(documentId, newContent)
}

export function restoreDocumentVersion(documentId: string, version: string, restoredBy: string): Promise<DocumentVersion> {
  const controller = VersionController.getInstance()
  return controller.restoreVersion(documentId, version, restoredBy)
}
