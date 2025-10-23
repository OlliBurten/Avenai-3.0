/**
 * Text Document Processor
 * 
 * Handles plain text and markdown files
 */

import type { UDoc } from "@/lib/udoc";

export const runtime = 'nodejs';

/**
 * Process plain text and markdown files
 */
export async function processPlainLike(buf: Buffer, filename: string): Promise<UDoc> {
  let md = "";
  try {
    // best-effort UTF-8
    md = buf.toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    md = "";
  }
  const cleaned = md?.trim() ?? "";

  return {
    md: cleaned,
    pages: [{ index: 0, text: cleaned }], // simple single-page representation
    structure: {
      title: filename.replace(/\.(txt|md)$/i, ""),
      headings: [],
      tables: [],
      codeBlocks: []
    },
    meta: {
      bytes: buf.length,
      mime: filename.endsWith('.md') ? 'text/markdown' : 'text/plain',
      filename,
      pages: 1,
      extractedAt: new Date().toISOString(),
      extractor: "txt",
      ocrUsed: false,
      // **If there's text, call it fully covered**
      quality: {
        coveragePct: cleaned.length > 0 ? 1 : 0,
        warnings: cleaned.length > 0 ? [] : ["Empty text file"],
        suspectedScanned: false
      }
    }
  };
}

// Legacy function for backward compatibility
export async function processText(
  buffer: Buffer,
  filename: string,
  options: any
): Promise<any> {
  return processPlainLike(buffer, filename);
}