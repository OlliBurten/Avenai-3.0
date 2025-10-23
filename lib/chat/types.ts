// lib/chat/types.ts
// Unified retrieval types for pgvector-only and future hybrid search

import type { Intent } from './intent';

export type RetrievalSource = {
  id: string;                // chunk id
  chunkId: string;           // alias for id (UI expects this)
  documentId: string;
  content: string;
  score: number;
  page: number | null;       // from metadata.page
  title?: string;            // document title
  chunkIndex?: number;       // chunk index in document
  sectionPath?: string | null;
  metadata?: Record<string, any> | null;
};

export type RetrievalMeta = {
  top1: number;
  scoreGap: number;          // top1 - median(top5)
  uniqueSections: number;
  fallbackTriggered: boolean;
  fallbackReason?: string;   // Why fallback was triggered
  retrievalTimeMs: number;
  policyNotes?: string[];    // Diagnostic notes from RetrieverPolicy
  intent?: string;           // Detected intent
  hybridEnabled?: boolean;   // Whether hybrid search was used
  mmrEnabled?: boolean;      // Whether MMR re-ranking was used
  expansionStrategy?: string[];  // Fallback expansion strategies applied
};

export type RetrieveOpts = {
  query: string;
  organizationId: string;
  datasetId: string;
  k?: number;
  intent?: Intent;
};

