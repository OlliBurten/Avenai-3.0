/**
 * DOCX Document Processor
 * 
 * Handles Microsoft Word documents (.docx and .doc)
 */

import mammoth from "mammoth";
import Turndown from "turndown";
import { UDoc } from "../udoc";

export const runtime = 'nodejs';

/**
 * Convert DOCX to Markdown and return UDoc
 */
export async function convertDocxToMd(buf: Buffer, filename: string): Promise<UDoc> {
  const { value: html } = await mammoth.convertToHtml({ buffer: buf });
  const td = new Turndown({ codeBlockStyle: "fenced" });
  const md = td.turndown(html || "");
  return {
    md,
    meta: {
      bytes: buf.length,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename,
      ocrUsed: false,
      extractor: "docx",
      extractedAt: new Date().toISOString(),
      quality: { coveragePct: 1, warnings: [] }
    }
  };
}

