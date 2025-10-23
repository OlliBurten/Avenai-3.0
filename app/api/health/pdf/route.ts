// app/api/health/pdf/route.ts
import { NextResponse } from 'next/server'
import { extractPdf } from '@/lib/pdf-extractor'

export const runtime = 'nodejs'

export async function GET() {
  const version = (globalThis as any).__AVENAI_PDF_EXTRACTOR_VERSION__ ?? 'unknown'
  return NextResponse.json({ ok: true, extractorVersion: version })
}
