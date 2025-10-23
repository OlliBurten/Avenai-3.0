/**
 * Universal Document Processing Pipeline
 * 
 * Main orchestrator that routes documents to appropriate processors
 * and ensures consistent output format using the new UDoc schema.
 */

import { fileTypeFromBuffer } from "file-type";
import { UDoc, estimateCoverage } from "./udoc";
import { extractPdf } from "./processors/pdf";
import { convertDocxToMd } from "./processors/docx";
import { ocrImages } from "./processors/ocr";
import { parseOpenAPI } from "./processors/openapi";
import { processPlainLike } from "./processors/text";

export async function processUpload(buf: Buffer, filename: string): Promise<UDoc> {
  const ft = await fileTypeFromBuffer(buf);
  const mime = ft?.mime || guessMime(filename) || "application/octet-stream";
  const extractedAt = new Date().toISOString();

  let udoc: UDoc;

  if (isOpenAPI(filename, mime)) {
    udoc = await parseOpenAPI(buf, filename);
    udoc.meta.extractedAt = extractedAt;
  } else if (mime === "text/plain" || /\.md$/i.test(filename)) {
    udoc = await processPlainLike(buf, filename);
  } else if (mime === "application/pdf") {
    udoc = await extractPdf(buf, filename); // tries text-layer first; falls back to OCR if needed
    udoc.meta.extractedAt = extractedAt;
  } else if (mime.includes("word") || /\.docx$/i.test(filename)) {
    udoc = await convertDocxToMd(buf, filename);
    udoc.meta.extractedAt = extractedAt;
  } else if (mime.startsWith("image/")) {
    udoc = await ocrImages([buf], filename);
    udoc.meta.extractedAt = extractedAt;
  } else {
    // last-resort try UTF-8; else OCR as image
    const asText = tryUtf8(buf);
    if (asText) {
      udoc = {
        md: asText,
        meta: {
          bytes: buf.length, mime, filename, ocrUsed: false, extractor: "txt", extractedAt,
          quality: { coveragePct: coverage(asText), warnings: [] }
        }
      };
    } else {
      udoc = await ocrImages([buf], filename);
      udoc.meta.extractedAt = extractedAt;
    }
  }

  // Apply coverage estimation
  udoc.meta.quality.coveragePct = estimateCoverage(udoc, mime);
  
  return udoc;
}

// ---- helpers ----
function coverage(text: string) {
  const n = (text || "").replace(/\s+/g, "").length;
  return Math.max(0, Math.min(1, n / 30000)); // rough, tune later by page count
}
function tryUtf8(buf: Buffer) { try { return buf.toString("utf8"); } catch { return ""; } }
function guessMime(name: string) {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.docx$/i.test(name)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.txt$/i.test(name)) return "text/plain";
  if (/\.ya?ml|\.json$/i.test(name)) return "application/yaml";
  return "";
}
function isOpenAPI(name: string, mime: string) {
  return /\.(ya?ml|json)$/i.test(name) || /yaml|json/.test(mime);
}
