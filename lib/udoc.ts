/**
 * Universal Document Processing - Core Types and Interfaces
 * 
 * This module defines the universal document format that all processors
 * convert to, ensuring consistent handling across all document types.
 */

// Single source of truth for universal document format
export type UDoc = {
  md: string; // normalized Markdown
  pages?: Array<{ index: number; text: string }>;
  structure?: {
    title?: string;
    headings?: Array<{ level: number; text: string; page?: number }>;
    tables?: Array<{ page?: number; mdTable: string }>;
    codeBlocks?: Array<{ lang?: string; content: string; page?: number }>;
  };
  meta: {
    bytes: number;
    mime: string;
    filename: string;
    pages?: number;
    lang?: string;
    ocrUsed: boolean;
    extractor: "pdf-text" | "pdf-ocr" | "docx" | "txt" | "img-ocr" | "openapi";
    extractedAt: string;
    quality: {
      coveragePct: number;         // rough % coverage (0..1)
      hasTextLayer?: boolean;      // PDFs
      suspectedScanned?: boolean;  // PDFs
      warnings: string[];
    };
  };
};

// Helper function to estimate coverage for different document types
export function estimateCoverage(udoc: UDoc, mime: string): number {
  // For text/markdown files, if we have substantial content and no pages, assume 100% coverage
  if ((mime.startsWith('text/') || mime === 'text/markdown') && 
      udoc.md && 
      udoc.md.split(/\s+/).length > 500 && 
      (!udoc.pages || udoc.pages.length === 0)) {
    return 1.0;
  }
  
  // Fall back to existing coverage calculation
  return udoc.meta.quality.coveragePct;
}

// Legacy interfaces for backward compatibility
export interface DocumentMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  language?: string;
  pages?: number;
  wordCount?: number;
  extractedAt: Date;
  processor: string;
  quality: DocumentQuality;
}

export interface DocumentQuality {
  score: number; // 0-100
  warnings: string[];
  coverage: {
    text: number; // percentage of document that's readable text
    structure: number; // percentage of structure preserved
    metadata: number; // percentage of metadata extracted
  };
}

export interface DocumentStructure {
  headings: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  sections: Array<{
    title: string;
    content: string;
    startPosition: number;
    endPosition: number;
  }>;
  codeBlocks: Array<{
    language?: string;
    content: string;
    position: number;
  }>;
  tables: Array<{
    headers: string[];
    rows: string[][];
    position: number;
  }>;
  lists: Array<{
    type: 'ordered' | 'unordered';
    items: string[];
    position: number;
  }>;
}

export interface UniversalDocument {
  content: string; // Markdown format
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  raw?: {
    originalFormat: string;
    originalSize: number;
    extractedText?: string;
  };
}

// Processing options for the new UDoc format
export interface UDocProcessingOptions {
  preserveStructure?: boolean;
  extractMetadata?: boolean;
  qualityThreshold?: number;
  maxFileSize?: number;
  allowedFormats?: string[];
  ocrEnabled?: boolean;
  language?: string;
}

// Processing result for the new UDoc format
export interface UDocProcessingResult {
  document: UDoc;
  success: boolean;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

// Legacy interfaces for backward compatibility
export interface ProcessingOptions {
  preserveStructure?: boolean;
  extractMetadata?: boolean;
  qualityThreshold?: number;
  maxFileSize?: number;
  allowedFormats?: string[];
  ocrEnabled?: boolean;
  language?: string;
}

export interface ProcessingResult {
  document: UniversalDocument;
  success: boolean;
  errors: string[];
  warnings: string[];
  processingTime: number;
}

export type DocumentProcessor = (
  buffer: Buffer,
  filename: string,
  options: ProcessingOptions
) => Promise<ProcessingResult>;

// New processor type for UDoc
export type UDocProcessor = (
  buffer: Buffer,
  filename: string,
  options: UDocProcessingOptions
) => Promise<UDocProcessingResult>;

// New processor registry for UDoc
export interface UDocProcessorRegistry {
  [mimeType: string]: UDocProcessor;
}

// Legacy processor registry for backward compatibility
export interface ProcessorRegistry {
  [mimeType: string]: DocumentProcessor;
}

// Quality scoring constants
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 50,
  POOR: 25,
} as const;

// Supported formats for UDoc processing
export const UDOC_SUPPORTED_FORMATS = {
  'application/pdf': 'PDF Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/msword': 'Word Document (Legacy)',
  'text/plain': 'Plain Text',
  'text/markdown': 'Markdown',
  'application/json': 'JSON',
  'application/yaml': 'YAML',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/tiff': 'TIFF Image',
  'application/vnd.oasis.opendocument.text': 'OpenDocument Text',
} as const;

// Legacy supported formats for backward compatibility
export const SUPPORTED_FORMATS = UDOC_SUPPORTED_FORMATS;

// Utility functions for UDoc
export function createEmptyUDoc(filename: string, mimeType: string): UDoc {
  return {
    md: '',
    meta: {
      bytes: 0,
      mime: mimeType,
      filename,
      ocrUsed: false,
      extractor: 'txt',
      extractedAt: new Date().toISOString(),
      quality: {
        coveragePct: 0,
        warnings: ['Processing failed'],
      },
    },
  };
}

export function calculateUDocQuality(udoc: UDoc): UDoc['meta']['quality'] {
  const warnings: string[] = [];
  let coveragePct = 0;
  
  // Calculate coverage based on markdown content
  if (udoc.md) {
    const textLength = udoc.md.length;
    const nonWhitespaceLength = udoc.md.replace(/\s/g, '').length;
    coveragePct = textLength > 0 ? nonWhitespaceLength / textLength : 0;
  }
  
  // Add warnings based on quality indicators
  if (udoc.meta.ocrUsed) {
    warnings.push('OCR was used - quality may vary');
  }
  
  if (udoc.meta.quality.suspectedScanned) {
    warnings.push('Document appears to be scanned');
  }
  
  if (!udoc.meta.quality.hasTextLayer && udoc.meta.mime === 'application/pdf') {
    warnings.push('PDF has no text layer');
  }
  
  if (coveragePct < 0.5) {
    warnings.push('Low text coverage');
  }
  
  return {
    coveragePct,
    hasTextLayer: udoc.meta.quality.hasTextLayer,
    suspectedScanned: udoc.meta.quality.suspectedScanned,
    warnings,
  };
}

// Error types
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class UnsupportedFormatError extends DocumentProcessingError {
  constructor(format: string) {
    super(`Unsupported document format: ${format}`, 'UNSUPPORTED_FORMAT');
  }
}

export class QualityThresholdError extends DocumentProcessingError {
  constructor(score: number, threshold: number) {
    super(
      `Document quality ${score}% below threshold ${threshold}%`,
      'QUALITY_THRESHOLD',
      true
    );
  }
}

export class FileSizeError extends DocumentProcessingError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum ${maxSize} bytes`,
      'FILE_SIZE_EXCEEDED'
    );
  }
}
