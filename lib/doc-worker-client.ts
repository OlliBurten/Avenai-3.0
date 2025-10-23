/**
 * Doc-Worker Client
 * Handles communication with the document extraction service (doc-worker)
 * Supports both V1 (legacy) and V2 (metadata-rich) endpoints
 */

const DOC_WORKER_URL = process.env.DOC_WORKER_URL || 'http://localhost:8000';
const DOC_WORKER_V2_ENABLED = process.env.DOC_WORKER_V2 === 'true';

/**
 * V1 Response Format (Legacy)
 */
export interface DocWorkerResponseV1 {
  text: string;
  pages?: number;
}

/**
 * V2 Response Format (Metadata-Rich)
 */
export interface DocWorkerChunkV2 {
  text: string;
  page: number;
  section_path?: string;
  element_type?: 'table' | 'code' | 'header' | 'paragraph' | 'footer' | 'list';
  has_verbatim?: boolean;
  verbatim_block?: string;
}

export interface DocWorkerResponseV2 {
  items: DocWorkerChunkV2[];
  pages: number;
  metadata?: Record<string, any>;
}

/**
 * Unified extraction result
 */
export interface ExtractionResult {
  text?: string;  // V1 format: raw concatenated text
  items?: DocWorkerChunkV2[];  // V2 format: structured chunks
  pages: number;
  version: 'v1' | 'v2';
}

/**
 * Extract document using doc-worker
 * Tries V2 first (if enabled), falls back to V1
 */
export async function extractDocument(
  fileBuffer: ArrayBuffer | ArrayBufferLike,
  fileName: string,
  contentType: string
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: contentType }), fileName);

  // Try V2 first if enabled
  if (DOC_WORKER_V2_ENABLED) {
    console.log('🔬 Attempting doc-worker V2 extraction...');
    try {
      const response = await fetch(`${DOC_WORKER_URL}/extract/v2`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data: DocWorkerResponseV2 = await response.json();
        
        console.log('✅ Doc-worker V2 extraction successful:', {
          items: data.items?.length || 0,
          pages: data.pages,
          sampleItem: data.items?.[0]
        });

        return {
          items: data.items,
          pages: data.pages,
          version: 'v2'
        };
      } else {
        console.warn('⚠️ Doc-worker V2 failed:', response.status, 'Falling back to V1');
      }
    } catch (v2Error: any) {
      console.warn('⚠️ Doc-worker V2 error:', v2Error.message, 'Falling back to V1');
    }
  }

  // Fallback to V1 (legacy)
  console.log('🔬 Using doc-worker V1 extraction...');
  try {
    const response = await fetch(`${DOC_WORKER_URL}/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Doc worker V1 failed: ${response.status}`);
    }

    const data: DocWorkerResponseV1 = await response.json();
    
    console.log('✅ Doc-worker V1 extraction successful:', {
      textLength: data.text?.length || 0,
      pages: data.pages || 0
    });

    return {
      text: data.text,
      pages: data.pages || 0,
      version: 'v1'
    };
  } catch (v1Error: any) {
    console.error('❌ Both V1 and V2 doc-worker extraction failed');
    throw new Error(`Doc-worker extraction failed: ${v1Error.message}`);
  }
}

/**
 * Convert V2 items to V1 text format (for backward compatibility)
 */
export function convertV2ToV1Text(items: DocWorkerChunkV2[]): string {
  if (!items || items.length === 0) return '';
  
  return items
    .map(item => item.text)
    .join('\n\n')
    .trim();
}

/**
 * Check if doc-worker is available
 */
export async function checkDocWorkerHealth(): Promise<{
  available: boolean;
  version?: 'v1' | 'v2';
  error?: string;
}> {
  try {
    // Check V2 first if enabled
    if (DOC_WORKER_V2_ENABLED) {
      const v2Response = await fetch(`${DOC_WORKER_URL}/health`, {
        method: 'GET',
      });

      if (v2Response.ok) {
        return { available: true, version: 'v2' };
      }
    }

    // Check V1
    const v1Response = await fetch(`${DOC_WORKER_URL}/health`, {
      method: 'GET',
    });

    if (v1Response.ok) {
      return { available: true, version: 'v1' };
    }

    return { available: false, error: 'Doc-worker not responding' };
  } catch (error: any) {
    return { available: false, error: error.message };
  }
}

