#!/usr/bin/env python3
"""
Simple PDF text extractor using PyPDF2 (no external dependencies)
"""
import sys
import json
from pathlib import Path

def extract_text_simple(pdf_path):
    """Extract text using basic Python libraries"""
    try:
        # Try PyPDF2 first
        import PyPDF2
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except ImportError:
        try:
            # Fallback to pdfplumber
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
        except ImportError:
            print("❌ No PDF libraries available. Install: pip install PyPDF2")
            return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract-pdf-text.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(f"❌ File not found: {pdf_path}")
        sys.exit(1)
    
    print(f"📄 Extracting text from: {pdf_path}")
    text = extract_text_simple(pdf_path)
    
    if text:
        print(f"✅ Extracted {len(text)} characters")
        print("📝 First 500 characters:")
        print("-" * 50)
        print(text[:500])
        print("-" * 50)
        
        # Save to file
        output_path = pdf_path.replace('.pdf', '_extracted.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"💾 Saved to: {output_path}")
    else:
        print("❌ Failed to extract text")
        sys.exit(1)



