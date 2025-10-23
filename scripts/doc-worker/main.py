from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Literal
import fitz  # PyMuPDF
import io
import os
import re
import hashlib

# ==================== CONFIG & GLOBALS ====================

# Feature flag for V2 endpoint
DOC_WORKER_V2_ENABLED = os.getenv('DOC_WORKER_V2', 'true').lower() == 'true'

# --- JSON Detection Config ---
JSON_MIN_LEN = 30
JSON_MIN_COLON_RATIO = 0.02   # colons / chars
JSON_MIN_BRACE_RATIO = 0.02   # braces / chars
JSON_MIN_LINES = 3
CODE_FENCE_HINTS = ("```", "{", "}", "[", "]", ":")
FOOTER_HEIGHT_RATIO = 0.14    # bottom 14% of page is considered footer
EMAIL_PATTERNS = ("@", "support", "help", "contact")

# Regex patterns
JSON_OBJECT_RE = re.compile(r"\{[\s\S]*\}", re.MULTILINE)
JSON_ARRAY_RE  = re.compile(r"\[[\s\S]*\]", re.MULTILINE)
EMAIL_RE = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)
RE_ENDPOINT = re.compile(r"^(GET|POST|PUT|PATCH|DELETE)\s+(/[A-Za-z0-9._\-/:{}]+)", re.M)

app = FastAPI()

# Element type enum
ElementType = Literal["table", "code", "header", "paragraph", "footer", "list"]

# ==================== UTILITY FUNCTIONS ====================

def _is_probable_json(text: str) -> bool:
    """Detect if text is likely JSON/code"""
    if not text or len(text) < JSON_MIN_LEN:
        return False
    # quick structural signals
    colons = text.count(":")
    braces = text.count("{") + text.count("}")
    colon_ratio = colons / max(1, len(text))
    brace_ratio = braces / max(1, len(text))
    line_count = text.count("\n") + 1
    # fenced or dense JSON style
    fenced = any(h in text for h in CODE_FENCE_HINTS)
    looks_json = bool(JSON_OBJECT_RE.search(text) or JSON_ARRAY_RE.search(text))
    return (
        looks_json or
        (fenced and colon_ratio >= JSON_MIN_COLON_RATIO and brace_ratio >= JSON_MIN_BRACE_RATIO and line_count >= JSON_MIN_LINES)
    )

def _extract_verbatim_json(text: str) -> str | None:
    """Prefer the largest JSON block if multiple"""
    candidates = []
    for m in JSON_OBJECT_RE.finditer(text):
        candidates.append(m.group(0))
    for m in JSON_ARRAY_RE.finditer(text):
        candidates.append(m.group(0))
    if not candidates:
        return None
    return max(candidates, key=len)

def _section_from_lines(lines: list[str]) -> str | None:
    """
    Very light section detector:
    - Hints from ALL CAPS lines or numbered headings.
    - Falls back to first non-empty line trimmed to ~80 chars.
    """
    for ln in lines[:6]:
        s = (ln or "").strip()
        if not s:
            continue
        if s.isupper() and len(s) >= 4:
            return s
        if re.match(r"^\d+(\.\d+)*\s", s):
            return s
        if s.endswith(":") and len(s) > 4:
            return s
    for ln in lines:
        s = (ln or "").strip()
        if s:
            return (s[:80] + "…") if len(s) > 80 else s
    return None

def extract_footer_text(page: fitz.Page) -> str:
    """Extract footer text from bottom 14% of page"""
    rect = page.rect
    footer_top = rect.y1 - rect.height * FOOTER_HEIGHT_RATIO
    footer_rect = fitz.Rect(rect.x0, footer_top, rect.x1, rect.y1)
    try:
        return page.get_text("text", clip=footer_rect) or ""
    except Exception:
        return ""

def extract_page_blocks(page: fitz.Page) -> list[dict]:
    """Return block dicts with text and inferred element_type"""
    items = []
    blocks = page.get_text("blocks") or []
    for (_x0, _y0, _x1, _y1, text, _block_no, _block_type) in blocks:
        txt = (text or "").strip()
        if not txt:
            continue
        lines = [l.strip() for l in txt.splitlines()]
        
        # Extract endpoint if present
        endpoint = None
        m = RE_ENDPOINT.search(txt)
        if m:
            endpoint = f"{m.group(1)} {m.group(2)}"
        
        # element type heuristics
        if _is_probable_json(txt):
            verbatim = _extract_verbatim_json(txt) or txt
            # Truncate to avoid database limits
            if len(verbatim) > 2000:
                verbatim = verbatim[:2000] + "..."
            items.append({
                "text": txt,
                "element_type": "code",      # treat JSON as code
                "has_verbatim": True,
                "verbatim_block": verbatim,
                "section_path": _section_from_lines(lines),
                "endpoint": endpoint,
            })
        elif "|" in txt and "\n" in txt and any(h in txt.lower() for h in ("|", "endpoint", "method")):
            # very light "table-like" hint
            items.append({
                "text": txt,
                "element_type": "table",
                "has_verbatim": False,
                "verbatim_block": None,
                "section_path": _section_from_lines(lines),
                "endpoint": endpoint,
            })
        else:
            # header/paragraph
            first = (lines[0] if lines else "").strip()
            if first.isupper() and 4 <= len(first) <= 120:
                el = "header"
            else:
                el = "paragraph"
            items.append({
                "text": txt,
                "element_type": el,
                "has_verbatim": False,
                "verbatim_block": None,
                "section_path": _section_from_lines(lines),
                "endpoint": endpoint,
            })
    return items

# ==================== PYDANTIC MODELS ====================

class ChunkItemV2(BaseModel):
    text: str
    page: int
    section_path: Optional[str] = None
    element_type: ElementType = "paragraph"
    has_verbatim: bool = False
    verbatim_block: Optional[str] = None
    endpoint: Optional[str] = None  # e.g., "POST /bankidse/auth"

class ExtractionResponseV2(BaseModel):
    items: List[ChunkItemV2]
    pages: int
    metadata: dict = {}

# ==================== V2 ENDPOINT ====================

@app.post("/extract/v2", response_model=ExtractionResponseV2)
async def extract_v2(file: UploadFile = File(...)) -> ExtractionResponseV2:
    """V2 endpoint with enhanced JSON detection and footer extraction"""
    if not DOC_WORKER_V2_ENABLED:
        return ExtractionResponseV2(
            items=[],
            pages=0,
            metadata={"error": "V2 endpoint is currently disabled"}
        )
    
    data = await file.read()
    doc = fitz.open(stream=data, filetype="pdf")
    out: list[ChunkItemV2] = []

    for pno in range(len(doc)):
        page = doc.load_page(pno)
        
        # 1) Footer first (CONTACT intent loves this)
        footer_text = extract_footer_text(page).strip()
        if footer_text:
            out.append(ChunkItemV2(
                text=footer_text,
                page=pno + 1,
                element_type="footer",
                section_path="Footer",
                has_verbatim=False,
                verbatim_block=None
            ))

        # 2) Main blocks (paragraph, header, table, code/JSON)
        blocks = extract_page_blocks(page)
        for b in blocks:
            # Truncate section_path to avoid database index size limits
            section_path = b.get("section_path")
            if section_path and len(section_path) > 2000:
                section_path = section_path[:2000] + "..."
            
            out.append(ChunkItemV2(
                text=b["text"],
                page=pno + 1,
                element_type=b.get("element_type") or "paragraph",
                section_path=section_path,
                has_verbatim=bool(b.get("has_verbatim", False)),
                verbatim_block=b.get("verbatim_block"),
                endpoint=b.get("endpoint"),
            ))

    return ExtractionResponseV2(
        items=out, 
        pages=len(doc),
        metadata={
            "extractor": "pymupdf_v2_enhanced",
            "total_items": len(out),
            "version": "2.1"
        }
    )

# ==================== LEGACY V1 ENDPOINTS ====================

def extract_tables_from_page(page):
  """Extract tables and convert to readable text format"""
  tables = []
  try:
    # Try to find tables using text analysis
    blocks = page.get_text("dict")["blocks"]
    
    # Look for table-like structures (multiple lines with similar x-coordinates)
    table_candidates = []
    for block in blocks:
      if "lines" in block:
        for line in block["lines"]:
          if len(line.get("spans", [])) >= 2:  # Multiple columns
            table_candidates.append(line)
    
    # If we found potential tables, extract them
    if table_candidates:
      for i, line in enumerate(table_candidates):
        spans = line.get("spans", [])
        if len(spans) >= 2:
          # Format as: Column1 | Column2 | Column3
          row_text = " | ".join([span.get("text", "").strip() for span in spans if span.get("text", "").strip()])
          if row_text:
            tables.append(row_text)
  except Exception as e:
    print(f"Table extraction error: {e}")
  
  return tables

def page_blocks_to_md(page):
  """Enhanced extraction with table support"""
  blocks = page.get_text("blocks")  # (x0,y0,x1,y1,text, block_no, ...)
  blocks.sort(key=lambda b: (b[1], b[0]))
  md_parts = []
  
  # First, try to extract tables
  tables = extract_tables_from_page(page)
  if tables:
    md_parts.append("\n".join(tables))
  
  # Then extract regular text blocks
  for b in blocks:
    txt = (b[4] or "").strip()
    if not txt: continue
    md_parts.append(txt)
  
  # Also capture footer text (last 200px of page)
  page_height = page.rect.height
  footer_rect = fitz.Rect(0, page_height - 200, page.rect.width, page_height)
  footer_text = page.get_text(clip=footer_rect).strip()
  if footer_text and footer_text not in "\n\n".join(md_parts):
    md_parts.append(f"[Footer: {footer_text}]")
  
  return "\n\n".join(md_parts)

@app.post("/extract")
async def extract(file: UploadFile):
  """Legacy V1 extraction endpoint"""
  data = await file.read()
  doc = fitz.open(stream=data, filetype="pdf")
  
  text_parts = []
  chunks_metadata = []
  
  for page_num, page in enumerate(doc):
    page_text = page.get_text().strip()
    if not page_text:
      continue
    
    page_metadata = {
      "page": page_num + 1,
      "element_type": "paragraph",
      "has_json": False,
      "has_tables": False,
    }
    
    chunks_metadata.append(page_metadata)
    text_parts.append(page_text)
  
  full_text = "\n\n".join(text_parts)
  
  return {
    "text": full_text,
    "pages": len(doc),
    "success": True,
    "metadata": {
      "chunks": chunks_metadata,
      "total_pages": len(doc)
    }
  }

@app.post("/pdf/extract")
async def pdf_extract(file: UploadFile):
  """PDF extraction in UDoc format"""
  data = await file.read()
  doc = fitz.open(stream=data, filetype="pdf")
  md_pages = []
  pages = []
  headings = []
  has_text_layer = False

  for i, p in enumerate(doc):
    text = p.get_text().strip()
    if text: has_text_layer = True
    page_md = page_blocks_to_md(p) if text else ""
    if page_md:
      md_pages.append(f"<!-- page {i+1} -->\n{page_md}")
      pages.append({ "index": i+1, "text": page_md })

  md = "\n\n---\n\n".join(md_pages)
  suspected_scanned = not has_text_layer
  return {
    "ok": True,
    "udoc": {
      "md": md,
      "pages": pages,
      "structure": { "headings": headings },
      "meta": {
        "pages": len(doc),
        "ocrUsed": False,
        "extractor": "pdf-text",
        "quality": {
          "coveragePct": 1 if has_text_layer else 0.05,
          "hasTextLayer": has_text_layer,
          "suspectedScanned": suspected_scanned,
          "warnings": [] if has_text_layer else ["No text layer; OCR recommended."]
        }
      }
    }
  }

@app.post("/pdf/ocr")
async def pdf_ocr(file: UploadFile):
  """OCR endpoint (disabled)"""
  return {
    "ok": False,
    "error": "OCR not available - pytesseract not installed",
    "udoc": None
  }

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "2.1-enhanced" if DOC_WORKER_V2_ENABLED else "1.0",
        "features": {
            "footer_extraction": True,
            "json_detection": True,
            "table_detection": True,
            "verbatim_blocks": True
        },
        "endpoints": {
            "/extract": "v1 (legacy)",
            "/extract/v2": "v2 (metadata-rich, enhanced)" if DOC_WORKER_V2_ENABLED else "disabled",
            "/pdf/extract": "udoc format",
            "/pdf/ocr": "disabled",
            "/health": "health check"
        }
    }
