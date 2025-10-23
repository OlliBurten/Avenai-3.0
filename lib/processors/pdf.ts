/**
 * PDF Document Processor
 * 
 * Handles PDF documents with text extraction and OCR fallback using Python worker
 */

import { UDoc } from '../udoc';

const WORKER = process.env.DOC_WORKER_URL!; // e.g. https://doc-worker.yourapp.com

export const runtime = 'nodejs';

/**
 * Extract PDF content and return UDoc
 */
export async function extractPdf(buf: Buffer, filename: string): Promise<UDoc> {
  // 1) text-layer extraction with layout (fast)
  const textRes = await callWorker(`${WORKER}/pdf/extract`, buf, filename);
  if (textRes?.ok && textRes?.udoc?.md && strip(textRes.udoc.md).length > 200) {
    const u = textRes.udoc as UDoc;
    u.meta.mime = "application/pdf";
    u.meta.filename = filename;
    u.meta.extractor = "pdf-text";
    u.meta.ocrUsed = false;
    
    // Console counter for successful text layer extraction
    console.log('📊 pdf_text_layer_ok: 1');
    
    // if worker flags suspected scanned, fall through to OCR
    if (!u.meta.quality?.hasTextLayer) {
      // 2) OCR fallback (scanned PDFs)
      const ocr = await callWorker(`${WORKER}/pdf/ocr`, buf, filename);
      if (ocr?.ok) {
        const o = ocr.udoc as UDoc;
        o.meta.mime = "application/pdf";
        o.meta.filename = filename;
        o.meta.extractor = "pdf-ocr";
        o.meta.ocrUsed = true;
        
        // Console counter for OCR usage
        console.log('📊 pdf_ocr_used: 1');
        
        // Check for low confidence pages
        if (o.meta.quality?.warnings?.some(w => w.includes('low confidence') || w.includes('poor quality'))) {
          console.log('📊 low_confidence_pages: 1');
        }
        
        return o;
      }
    }
    return u;
  }

  // text layer failed → OCR
  const ocr = await callWorker(`${WORKER}/pdf/ocr`, buf, filename);
  if (!ocr?.ok) throw new Error("PDF extraction failed");
  const o = ocr.udoc as UDoc;
  o.meta.mime = "application/pdf";
  o.meta.filename = filename;
  o.meta.extractor = "pdf-ocr";
  o.meta.ocrUsed = true;
  
  // Console counter for OCR usage
  console.log('📊 pdf_ocr_used: 1');
  
  // Check for low confidence pages
  if (o.meta.quality?.warnings?.some(w => w.includes('low confidence') || w.includes('poor quality'))) {
    console.log('📊 low_confidence_pages: 1');
  }
  
  return o;
}

async function callWorker(url: string, buf: Buffer, filename: string) {
  const fd = new FormData();
  fd.append("file", new Blob([buf as any]), filename || "upload.pdf");
  const res = await fetch(url, { method: "POST", body: fd as any });
  if (!res.ok) return null;
  return res.json();
}

function strip(s: string) { return (s || "").replace(/\s+/g, ""); }
