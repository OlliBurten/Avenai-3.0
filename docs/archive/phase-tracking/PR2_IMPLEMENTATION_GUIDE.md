# 🚧 PR-2: Doc-Worker V2 - Implementation Guide

**Date:** January 21, 2025  
**Status:** 🚧 Ready to Implement  
**Blockers:** None (PR-1 Complete ✅)

---

## 🎯 Objectives

Upgrade the Python doc-worker to emit structured metadata for each extracted chunk:
- `element_type` - Content classification (table, code, header, paragraph, footer)
- `section_path` - Hierarchical section tracking
- `has_verbatim` - Flag for JSON/code that should be preserved exactly
- `verbatim_block` - Raw content for verbatim sections

---

## 📍 Current State

**Doc-Worker Location:** `https://avenai-doc-worker.fly.dev`  
**Local Dev URL:** `http://localhost:8000`  
**Repository:** Separate from main Avenai repo (hosted on Fly.dev)

**Current Response Format:**
```json
{
  "items": [
    {
      "text": "...",
      "page": 5
    }
  ],
  "pages": 27
}
```

**Target Response Format (V2):**
```json
{
  "items": [
    {
      "text": "...",
      "page": 5,
      "section_path": "API Reference > Authentication",
      "element_type": "table",
      "has_verbatim": true,
      "verbatim_block": "{...}"
    }
  ],
  "pages": 27
}
```

---

## 🏗️ Implementation Steps

### Step 1: Update Response Types

Create new Pydantic models in `doc-worker/main.py`:

```python
from pydantic import BaseModel
from typing import List, Optional, Literal

# Element type enum
ElementType = Literal["table", "code", "header", "paragraph", "footer", "list"]

# V2 chunk item with metadata
class ChunkItemV2(BaseModel):
    text: str
    page: int
    section_path: Optional[str] = None
    element_type: ElementType = "paragraph"
    has_verbatim: bool = False
    verbatim_block: Optional[str] = None

# V2 extraction response
class ExtractionResponseV2(BaseModel):
    items: List[ChunkItemV2]
    pages: int
    metadata: dict = {}
```

---

### Step 2: Implement Element Type Detection

Add detection logic in `doc-worker/extractor.py`:

```python
def detect_element_type(text: str, bbox: dict, page_height: float) -> ElementType:
    """
    Detect the type of content based on text and position
    
    Args:
        text: The text content
        bbox: Bounding box with {x0, y0, x1, y1, font_size}
        page_height: Total page height for relative positioning
    
    Returns:
        ElementType classification
    """
    
    # Footer detection (last 200px of page + contact markers)
    if bbox.get('y1', 0) > (page_height - 200):
        if any(marker in text.lower() for marker in ['@', 'contact', 'email', 'phone', 'support']):
            return "footer"
    
    # Header detection (all caps, short, large font, or heading markers)
    if text.isupper() and len(text) < 100 and bbox.get('font_size', 0) > 14:
        return "header"
    
    if text.strip().startswith('#') or bbox.get('font_size', 0) > 16:
        return "header"
    
    # Code detection (monospaced, indented, or fenced)
    if text.strip().startswith('```') or is_monospaced_font(bbox.get('font_name', '')):
        return "code"
    
    # Table detection (grid pattern, pipes, or table markers)
    if has_table_structure(text):
        return "table"
    
    # List detection
    if re.match(r'^\s*[•\-\*\d+\.]\s', text):
        return "list"
    
    # Default to paragraph
    return "paragraph"

def is_monospaced_font(font_name: str) -> bool:
    """Check if font is monospaced (common code fonts)"""
    monospace_fonts = [
        'courier', 'consolas', 'monaco', 'menlo', 
        'roboto mono', 'source code', 'fira code'
    ]
    return any(mono in font_name.lower() for mono in monospace_fonts)

def has_table_structure(text: str) -> bool:
    """Check if text contains table-like structure"""
    lines = text.split('\n')
    
    # Check for pipe-separated values
    pipe_count = sum(1 for line in lines if '|' in line and len(line.split('|')) >= 3)
    if pipe_count >= 2:
        return True
    
    # Check for grid alignment (consistent spacing)
    if has_grid_alignment(lines):
        return True
    
    return False

def has_grid_alignment(lines: List[str]) -> bool:
    """Check if lines have consistent column alignment"""
    if len(lines) < 2:
        return False
    
    # Simple heuristic: check if lines have similar structure
    space_patterns = [len(re.findall(r'\s{2,}', line)) for line in lines]
    return len(set(space_patterns)) == 1 and space_patterns[0] >= 2
```

---

### Step 3: Implement Verbatim Detection

Add JSON/code block detection:

```python
import json
import re

def detect_verbatim(text: str) -> tuple[bool, Optional[str]]:
    """
    Detect if content is verbatim JSON/code that should be preserved exactly
    
    Returns:
        (has_verbatim, verbatim_block)
    """
    
    # Check for fenced code blocks
    fenced_match = re.search(r'```[\w]*\n(.*?)\n```', text, re.DOTALL)
    if fenced_match:
        return True, fenced_match.group(1)
    
    # Check for JSON-like content
    if '{' in text and ':' in text:
        try:
            # Try to extract JSON block
            json_match = re.search(r'(\{[^{}]*\}|\[[^\[\]]*\])', text, re.DOTALL)
            if json_match:
                potential_json = json_match.group(1)
                # Validate it's actually JSON
                json.loads(potential_json)
                return True, potential_json
        except:
            pass
    
    # Check for code-like patterns (braces + semicolons)
    code_markers = text.count('{') + text.count(';') + text.count('=>')
    if code_markers >= 3:
        return True, text.strip()
    
    return False, None
```

---

### Step 4: Implement Section Path Tracking

Add hierarchical section tracking:

```python
class DocumentState:
    """Track document structure during extraction"""
    
    def __init__(self):
        self.header_stack: List[str] = []
        self.current_section: Optional[str] = None
    
    def update_headers(self, text: str, element_type: ElementType, font_size: float = 12):
        """Update header stack when a header is detected"""
        if element_type != "header":
            return
        
        # Determine header level (H1, H2, H3) based on font size or formatting
        level = self.detect_header_level(text, font_size)
        
        # Update header stack (trim to current level)
        self.header_stack = self.header_stack[:level-1]
        self.header_stack.append(text.strip())
        
        # Build section path
        self.current_section = self.get_section_path()
    
    def get_section_path(self) -> str:
        """Build hierarchical section path from header stack"""
        return " > ".join(h for h in self.header_stack if h.strip())
    
    def detect_header_level(self, text: str, font_size: float) -> int:
        """Detect header level (1-6) based on formatting"""
        # Check for markdown-style headers
        if text.strip().startswith('#'):
            return min(len(re.match(r'^#+', text.strip()).group()), 6)
        
        # Font size heuristic
        if font_size >= 24:
            return 1
        elif font_size >= 18:
            return 2
        elif font_size >= 14:
            return 3
        else:
            return 4
```

---

### Step 5: Create V2 Endpoint

Add new endpoint with feature flag:

```python
import os

# Feature flag for V2 endpoint
DOC_WORKER_V2_ENABLED = os.getenv('DOC_WORKER_V2', 'false').lower() == 'true'

@app.post("/extract/v2")
async def extract_v2(file: UploadFile):
    """V2 endpoint with metadata extraction"""
    if not DOC_WORKER_V2_ENABLED:
        return JSONResponse(
            status_code=503,
            content={"error": "V2 endpoint is currently disabled"}
        )
    
    # Save uploaded file
    file_path = f"/tmp/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    try:
        # Extract with metadata
        result = extract_document_v2(file_path)
        return result
    finally:
        # Cleanup
        os.remove(file_path)

def extract_document_v2(file_path: str) -> ExtractionResponseV2:
    """Extract document with metadata"""
    import pymupdf  # or your PDF library
    
    doc = pymupdf.open(file_path)
    state = DocumentState()
    items = []
    
    for page_num, page in enumerate(doc, start=1):
        page_height = page.rect.height
        blocks = page.get_text("dict")["blocks"]
        
        for block in blocks:
            if block["type"] == 0:  # Text block
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"]
                        if not text.strip():
                            continue
                        
                        # Get bounding box and font info
                        bbox = {
                            'x0': span["bbox"][0],
                            'y0': span["bbox"][1],
                            'x1': span["bbox"][2],
                            'y1': span["bbox"][3],
                            'font_size': span["size"],
                            'font_name': span["font"]
                        }
                        
                        # Detect element type
                        element_type = detect_element_type(text, bbox, page_height)
                        
                        # Update section tracking
                        state.update_headers(text, element_type, bbox['font_size'])
                        
                        # Detect verbatim content
                        has_verbatim, verbatim_block = detect_verbatim(text)
                        
                        # Create chunk item
                        item = ChunkItemV2(
                            text=text,
                            page=page_num,
                            section_path=state.current_section,
                            element_type=element_type,
                            has_verbatim=has_verbatim,
                            verbatim_block=verbatim_block
                        )
                        items.append(item)
    
    return ExtractionResponseV2(
        items=items,
        pages=len(doc)
    )

@app.post("/extract")
async def extract_legacy(file: UploadFile):
    """Legacy endpoint (V1) for backward compatibility"""
    # ... existing extraction logic ...
    pass
```

---

### Step 6: Add Tests

Create test suite in `doc-worker/tests/test_extraction_v2.py`:

```python
import pytest
from pathlib import Path

def test_footer_detection():
    """Test that email/contact info is tagged as footer"""
    result = extract_document_v2("test_files/sample_with_footer.pdf")
    footer_items = [item for item in result.items if item.element_type == "footer"]
    
    assert len(footer_items) > 0
    assert any("@" in item.text for item in footer_items)

def test_verbatim_json():
    """Test that JSON blocks are captured verbatim"""
    result = extract_document_v2("test_files/api_with_json.pdf")
    verbatim_items = [item for item in result.items if item.has_verbatim]
    
    assert len(verbatim_items) > 0
    assert verbatim_items[0].verbatim_block is not None
    assert "{" in verbatim_items[0].verbatim_block

def test_table_detection():
    """Test that tables are properly identified"""
    result = extract_document_v2("test_files/doc_with_tables.pdf")
    table_items = [item for item in result.items if item.element_type == "table"]
    
    assert len(table_items) > 0

def test_section_path():
    """Test that section hierarchy is tracked"""
    result = extract_document_v2("test_files/structured_doc.pdf")
    
    # Should have items with section paths like "API Reference > Authentication"
    assert any(">" in item.section_path for item in result.items if item.section_path)

def test_g2rs_pdf():
    """Test with actual G2RS (ZignSec) PDF"""
    result = extract_document_v2("test_files/g2rs_zignsec.pdf")
    
    # Should find clientservices@ email as footer
    footer_items = [item for item in result.items if item.element_type == "footer"]
    assert any("clientservices" in item.text.lower() for item in footer_items)
    
    # Should find terminated reasons as verbatim
    verbatim_items = [item for item in result.items if item.has_verbatim]
    assert len(verbatim_items) > 0
```

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] `test_footer_detection()` - Email/contact in footer
- [ ] `test_verbatim_json()` - JSON blocks captured
- [ ] `test_table_detection()` - Tables identified
- [ ] `test_section_path()` - Hierarchy tracked
- [ ] `test_code_detection()` - Code blocks identified
- [ ] `test_header_detection()` - Headers classified correctly

### Integration Tests
- [ ] Test with G2RS (ZignSec) PDF
- [ ] Verify `clientservices@...` tagged as `footer`
- [ ] Verify "Terminated reasons" has `has_verbatim=true`
- [ ] Verify section paths are hierarchical
- [ ] Verify tables detected correctly
- [ ] Test extraction time <5s for typical docs

### Backward Compatibility
- [ ] Legacy `/extract` endpoint still works
- [ ] V1 response format unchanged
- [ ] No breaking changes for existing clients

---

## 🚀 Deployment Steps

### 1. Local Testing
```bash
# Set feature flag
export DOC_WORKER_V2=true

# Run local doc-worker
cd doc-worker
python main.py

# Test V2 endpoint
curl -X POST http://localhost:8000/extract/v2 \
  -F "file=@test.pdf" \
  | jq '.items[0]'
```

### 2. Deploy to Fly.dev
```bash
# Deploy with V2 enabled
fly deploy --env DOC_WORKER_V2=true

# Or set via Fly secrets
fly secrets set DOC_WORKER_V2=true
```

### 3. Gradual Rollout
```bash
# Phase 1: Deploy with V2 disabled (safety)
fly secrets set DOC_WORKER_V2=false

# Phase 2: Enable for testing
fly secrets set DOC_WORKER_V2=true

# Phase 3: Update Avenai to use /extract/v2
# ... (PR-3 implementation)
```

---

## ✅ Pass/Fail Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Footer detection | >95% accuracy | G2RS PDF test |
| Verbatim capture | 100% accuracy | JSON/code block tests |
| Section path coverage | >80% of chunks | Test structured docs |
| Table detection | >90% accuracy | Table-heavy PDFs |
| Extraction time | <5s typical doc | Benchmark |
| Backward compatibility | 100% | Legacy endpoint works |
| V2 feature flag | Working | Can enable/disable |

---

## 📝 Frontend Integration (PR-3)

Once PR-2 is deployed, update Avenai backend:

```typescript
// lib/rag/embeddings.ts

interface DocWorkerChunkV2 {
  text: string;
  page: number;
  section_path?: string;
  element_type?: 'table' | 'code' | 'header' | 'paragraph' | 'footer' | 'list';
  has_verbatim?: boolean;
  verbatim_block?: string;
}

async function processDocumentWithMetadata(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Try V2 endpoint first
  const response = await fetch(`${DOC_WORKER_URL}/extract/v2`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    // Fallback to V1
    console.warn('V2 extraction failed, falling back to V1');
    return processDocumentV1(file);
  }
  
  const data = await response.json();
  
  // Store chunks with metadata
  for (const item of data.items) {
    await prisma.documentChunk.create({
      data: {
        documentId,
        organizationId,
        content: item.text,
        sectionPath: item.section_path,
        metadata: {
          element_type: item.element_type,
          has_verbatim: item.has_verbatim,
          verbatim_block: item.verbatim_block,
          page: item.page
        },
        // ... embedding, etc.
      }
    });
  }
}
```

---

## 🎯 Success Metrics

After PR-2 is deployed and integrated:

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| Section path coverage | 8.3% | >80% | ✅ |
| Element type coverage | 100% | 100% | ✅ |
| Footer detection | 0% | >95% | ✅ |
| Verbatim capture | 0% | 100% | ✅ |
| Table detection | 0% | >90% | ✅ |

---

## 🔄 Rollback Plan

If V2 causes issues:

```bash
# Disable V2 endpoint
fly secrets set DOC_WORKER_V2=false

# All requests fall back to legacy /extract endpoint
# No migration needed - V2 is additive
```

---

## 📋 Next Steps

1. ✅ PR-1 Complete - Database ready
2. 🚧 **PR-2 Current** - Implement doc-worker V2
3. 🔜 PR-3 - Update Avenai ingestion to use V2
4. 🔜 PR-4 - Implement RetrieverPolicy (intent-aware)
5. 🔜 PR-6 - Re-ingest all documents with V2

---

## 🏁 Definition of Done

- [ ] V2 response types defined
- [ ] Element type detection implemented
- [ ] Section path tracking implemented
- [ ] Verbatim detection implemented
- [ ] V2 endpoint created with feature flag
- [ ] Unit tests pass (>90% coverage)
- [ ] G2RS PDF test passes
- [ ] Extraction time <5s for typical docs
- [ ] Deployed to Fly.dev
- [ ] Feature flag tested (enable/disable)
- [ ] Documentation updated
- [ ] Ready for PR-3 integration

---

**Status:** Ready to implement in doc-worker repository  
**Blocked by:** None  
**Blocks:** PR-3 (Ingestion), PR-4 (RetrieverPolicy), PR-6 (Re-ingestion)




