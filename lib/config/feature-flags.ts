/**
 * Feature Flags - Phase 4
 * Centralized feature flag configuration for gradual rollout
 */

export interface Phase4FeatureFlags {
  DOC_WORKER_V2_1: boolean;    // Enhanced extraction (footer, email, JSON, endpoints)
  HYBRID_FUSION: boolean;       // Hybrid retrieval (vector + FTS fusion)
  MMR_RERANK: boolean;          // MMR diversity (max 2/page, min 3 sections)
  FALLBACK_EXPAND: boolean;     // Confidence-based fallback (auto-widen loop)
  CROSS_DOC_MERGE: boolean;     // Balanced multi-document retrieval
  PROMPT_ROUTER_V2: boolean;    // Strict mode templates
  ENABLE_METRICS_DB: boolean;   // Metrics persistence
}

/**
 * Get all Phase 4 feature flags
 */
export function getPhase4Flags(): Phase4FeatureFlags {
  return {
    DOC_WORKER_V2_1: process.env.DOC_WORKER_V2_1 === 'true',
    HYBRID_FUSION: process.env.HYBRID_FUSION === 'true',
    MMR_RERANK: process.env.MMR_RERANK === 'true',
    FALLBACK_EXPAND: process.env.FALLBACK_EXPAND === 'true',
    CROSS_DOC_MERGE: process.env.CROSS_DOC_MERGE === 'true',
    PROMPT_ROUTER_V2: process.env.PROMPT_ROUTER_V2 === 'true',
    ENABLE_METRICS_DB: process.env.ENABLE_METRICS_DB === 'true'
  };
}

/**
 * Check if Phase 4 is fully enabled
 */
export function isPhase4Enabled(): boolean {
  const flags = getPhase4Flags();
  return flags.HYBRID_FUSION && flags.PROMPT_ROUTER_V2;
}

/**
 * Get rollout percentage (for gradual rollout)
 * Returns 0-100 based on how many features are enabled
 */
export function getPhase4Rollout(): number {
  const flags = getPhase4Flags();
  const enabled = Object.values(flags).filter(Boolean).length;
  const total = Object.keys(flags).length;
  return Math.round((enabled / total) * 100);
}

/**
 * Log feature flag status
 */
export function logFeatureFlags(): void {
  const flags = getPhase4Flags();
  const rollout = getPhase4Rollout();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          PHASE 4 FEATURE FLAGS                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Rollout: ${rollout}% (${Object.values(flags).filter(Boolean).length}/${Object.keys(flags).length} features enabled)\n`);

  console.log('🎯 Feature Status:');
  console.log(`   DOC_WORKER_V2_1:   ${flags.DOC_WORKER_V2_1 ? '✅' : '❌'} Enhanced extraction`);
  console.log(`   HYBRID_FUSION:     ${flags.HYBRID_FUSION ? '✅' : '❌'} Vector + FTS fusion`);
  console.log(`   MMR_RERANK:        ${flags.MMR_RERANK ? '✅' : '❌'} Diversity constraints`);
  console.log(`   FALLBACK_EXPAND:   ${flags.FALLBACK_EXPAND ? '✅' : '❌'} Auto-widen loop`);
  console.log(`   CROSS_DOC_MERGE:   ${flags.CROSS_DOC_MERGE ? '✅' : '❌'} Multi-doc balance`);
  console.log(`   PROMPT_ROUTER_V2:  ${flags.PROMPT_ROUTER_V2 ? '✅' : '❌'} Strict templates`);
  console.log(`   ENABLE_METRICS_DB: ${flags.ENABLE_METRICS_DB ? '✅' : '❌'} Metrics persistence`);

  console.log('\n═══════════════════════════════════════════════════════════\n');

  if (rollout === 100) {
    console.log('🎉 Phase 4 FULLY ENABLED - ChatGPT-level intelligence active!\n');
  } else if (rollout >= 50) {
    console.log(`⚡ Phase 4 PARTIALLY ENABLED (${rollout}%) - Core features active\n`);
  } else if (rollout > 0) {
    console.log(`🔧 Phase 4 TESTING (${rollout}%) - Gradual rollout in progress\n`);
  } else {
    console.log('❌ Phase 4 DISABLED - Using legacy retrieval\n');
  }
}

/**
 * Gradual rollout helper
 * Returns true for a percentage of requests based on rollout
 */
export function shouldUsePhase4(userId?: string, rolloutPercentage: number = 100): boolean {
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;

  // Deterministic rollout based on user ID
  if (userId) {
    const hash = userId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    const bucket = Math.abs(hash) % 100;
    return bucket < rolloutPercentage;
  }

  // Random rollout if no user ID
  return Math.random() * 100 < rolloutPercentage;
}

/**
 * Validate feature flag configuration
 */
export function validateFeatureFlags(): { valid: boolean; warnings: string[] } {
  const flags = getPhase4Flags();
  const warnings: string[] = [];

  // Hybrid fusion requires FTS column
  if (flags.HYBRID_FUSION) {
    // Can't check database from here, but log warning
    warnings.push('HYBRID_FUSION enabled - ensure FTS column exists (run: npm run db:add-fts)');
  }

  // Fallback requires hybrid fusion
  if (flags.FALLBACK_EXPAND && !flags.HYBRID_FUSION) {
    warnings.push('FALLBACK_EXPAND requires HYBRID_FUSION to be enabled');
  }

  // Cross-doc requires hybrid fusion
  if (flags.CROSS_DOC_MERGE && !flags.HYBRID_FUSION) {
    warnings.push('CROSS_DOC_MERGE requires HYBRID_FUSION to be enabled');
  }

  // MMR works best with hybrid fusion
  if (flags.MMR_RERANK && !flags.HYBRID_FUSION) {
    warnings.push('MMR_RERANK works best with HYBRID_FUSION enabled');
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

