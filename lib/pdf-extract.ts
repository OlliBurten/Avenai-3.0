export const runtime = 'nodejs';

/** Single-engine extractor (pdf-parse). Throws for image-only PDFs with no text layer. */
export async function extractPdfText(buf: Buffer): Promise<string> {
  const log = (msg: string, extra?: any) =>
    console.error('[pdf-extract]', msg, extra ? JSON.stringify(extra).slice(0, 1200) : '');

  try {
    // Dynamic import to avoid build-time issues
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buf);
    const text = (result?.text as string | undefined)?.trim() ?? '';
    
    if (!text) {
      const e = new Error('PDF_HAS_NO_TEXT_LAYER');
      (e as any).cause = { pages: (result as any)?.numpages ?? undefined };
      throw e;
    }
    
    return text;
  } catch (err: any) {
    // Handle the specific test file error
    if (err?.code === 'ENOENT' && err?.path?.includes('test/data/05-versions-space.pdf')) {
      log('pdf-parse test file error', { message: 'Test file missing, this is a known pdf-parse issue' });
      // This is a known pdf-parse packaging issue, not a real extraction failure
      // Try to extract text using a different approach
      try {
        // Simple fallback: try to extract text from the PDF buffer directly
        const bufferStr = buf.toString('utf8');
        log('pdf-parse fallback attempt', { bufferLength: bufferStr.length });
        
        // Try a different approach - look for actual readable text content
        let extractedText = '';
        let totalMatches = 0;
        
        // Method 1: Look for metadata and document info (often contains readable text)
        const metadataMatches = bufferStr.match(/(?:Title|Subject|Author|Creator|Producer|Keywords|Description):\s*\(([^)]+)\)/gi);
        if (metadataMatches && metadataMatches.length > 0) {
          totalMatches += metadataMatches.length;
          for (const match of metadataMatches) {
            const textMatch = match.match(/\(([^)]+)\)/);
            if (textMatch) {
              const text = textMatch[1];
              if (text.length > 3 && text.length < 200) {
                extractedText += text + ' ';
              }
            }
          }
        }
        
        // Method 2: Look for text in PDF objects (more specific patterns)
        const objectMatches = bufferStr.match(/\d+\s+\d+\s+obj\s*(.*?)\s*endobj/gs);
        if (objectMatches && objectMatches.length > 0) {
          totalMatches += objectMatches.length;
          for (const obj of objectMatches) {
            // Look for readable text in the object
            const readableText = obj.match(/[a-zA-Z][a-zA-Z0-9\s.,!?;:'"()-]{5,}/g);
            if (readableText) {
              for (const text of readableText) {
                // Filter for meaningful text
                if (text.length > 5 && text.length < 300) {
                  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
                  const letterRatio = letterCount / text.length;
                  const printableChars = text.replace(/[^\x20-\x7E]/g, '').length;
                  const printableRatio = printableChars / text.length;
                  
                  // Must be mostly printable and contain letters
                  if (printableRatio > 0.7 && letterRatio > 0.3) {
                    extractedText += text + ' ';
                  }
                }
              }
            }
          }
        }
        
        // Method 3: Look for text between BT and ET with stricter filtering
        if (extractedText.length < 100) {
          const textObjectMatches = bufferStr.match(/BT\s*(.*?)\s*ET/gs);
          if (textObjectMatches && textObjectMatches.length > 0) {
            totalMatches += textObjectMatches.length;
            for (const textObj of textObjectMatches) {
              // Extract text from this text object
              const textMatches = textObj.match(/\((.*?)\)\s*Tj/g);
              if (textMatches) {
                for (const match of textMatches) {
                  const textMatch = match.match(/\((.*?)\)/);
                  if (textMatch) {
                    const text = textMatch[1];
                    // Stricter filtering for readable text
                    if (text.length > 3 && text.length < 200) {
                      const printableChars = text.replace(/[^\x20-\x7E]/g, '').length;
                      const printableRatio = printableChars / text.length;
                      const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
                      const letterRatio = letterCount / text.length;
                      
                      // Must be mostly printable and contain letters
                      if (printableRatio > 0.8 && letterRatio > 0.3) {
                        extractedText += text + ' ';
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // Method 4: Look for hex-encoded text with better decoding
        if (extractedText.length < 100) {
          const hexMatches = bufferStr.match(/<([0-9A-Fa-f]{8,})>/g);
          if (hexMatches && hexMatches.length > 0) {
            totalMatches += hexMatches.length;
            for (const hexMatch of hexMatches) {
              const hex = hexMatch.match(/<([0-9A-Fa-f]+)>/);
              if (hex) {
                try {
                  const hexStr = hex[1];
                  let text = '';
                  for (let i = 0; i < hexStr.length; i += 2) {
                    const byte = parseInt(hexStr.substr(i, 2), 16);
                    if (byte >= 32 && byte <= 126) { // Printable ASCII
                      text += String.fromCharCode(byte);
                    }
                  }
                  if (text.length > 3 && text.length < 200) {
                    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
                    const letterRatio = letterCount / text.length;
                    if (letterRatio > 0.3) { // At least 30% letters
                      extractedText += text + ' ';
                    }
                  }
                } catch (e) {
                  // Skip invalid hex
                }
              }
            }
          }
        }
        
        // Method 5: Last resort - look for any readable text patterns with strict filtering
        if (extractedText.length < 100) {
          const allTextMatches = bufferStr.match(/\(([^)]{3,100})\)/g);
          if (allTextMatches && allTextMatches.length > 0) {
            totalMatches += allTextMatches.length;
            for (const match of allTextMatches) {
              const textMatch = match.match(/\((.*?)\)/);
              if (textMatch) {
                const text = textMatch[1];
                // Very strict filtering for readable text
                if (text.length > 3 && text.length < 200) {
                  const printableChars = text.replace(/[^\x20-\x7E]/g, '').length;
                  const printableRatio = printableChars / text.length;
                  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
                  const letterRatio = letterCount / text.length;
                  
                  // Must be mostly printable and contain letters
                  if (printableRatio > 0.8 && letterRatio > 0.3) {
                    extractedText += text + ' ';
                  }
                }
              }
            }
          }
        }
        
        // Clean up the extracted text
        extractedText = extractedText.trim();
        
        log('pdf-parse fallback results', { 
          totalMatches, 
          extractedLength: extractedText.length,
          sample: extractedText.slice(0, 200) 
        });
        
        if (extractedText.trim().length > 50) { // Require at least 50 characters
          log('pdf-parse fallback succeeded', { textLength: extractedText.length });
          return extractedText.trim();
        }
        
        // If fallback also fails, it's likely a scanned PDF
        const e = new Error('PDF_HAS_NO_TEXT_LAYER');
        (e as any).cause = { reason: 'pdf-parse test file error + fallback failed', totalMatches, extractedLength: extractedText.length };
        throw e;
      } catch (fallbackErr: any) {
        log('pdf-parse fallback failed', { message: String(fallbackErr?.message || fallbackErr) });
        const e = new Error('PDF_HAS_NO_TEXT_LAYER');
        (e as any).cause = { reason: 'pdf-parse test file error + fallback failed' };
        throw e;
      }
    }
    
    log('pdf-parse failed', { message: String(err?.message || err) });
    throw new Error('EXTRACTION_EXCEPTION');
  }
}
