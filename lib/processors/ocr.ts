/**
 * OCR Document Processor
 * 
 * Handles image documents (JPEG, PNG, TIFF) using OCR
 */

import { UDoc } from "../udoc";

export const runtime = 'nodejs';

/**
 * Process images using OCR and return UDoc
 */
export async function ocrImages(images: Buffer[], filename: string): Promise<UDoc> {
  // TODO: replace with Azure/Google/AWS OCR for production
  // For now, rely on Python worker via /pdf/ocr if needed, or Tesseract server.
  const mdPages = images.map((_, i) => `<!-- page ${i+1} -->\n[OCR image text here]`);
  const md = mdPages.join("\n\n---\n\n");
  return {
    md,
    pages: mdPages.map((t, i) => ({ index: i+1, text: t })),
    meta: {
      bytes: images.reduce((a, b) => a + b.length, 0),
      mime: "image/*",
      filename,
      ocrUsed: true,
      extractor: "img-ocr",
      extractedAt: new Date().toISOString(),
      quality: { coveragePct: 0.6, warnings: ["Replace with cloud OCR for accuracy"] }
    }
  };
}

