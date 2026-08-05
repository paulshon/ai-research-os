/**
 * Reference Segmentation Engine - Parse reference lists from documents
 * AI Research OS v22
 * 
 * Extracts individual references from reference sections:
 * - Detects reference section boundaries
 * - Segments individual references
 * - Handles various citation formats
 * - Extracts reference metadata
 */

import { CanonicalCitation } from '../index';

export interface SegmentedReference {
  rawText: string;
  index: number;
  lineNumber: number;
  confidence: number;
  metadata?: Partial<CanonicalCitation>;
}

export interface ReferenceSection {
  startLine: number;
  endLine: number;
  references: SegmentedReference[];
}

/**
 * Detect reference section in document text
 */
export function detectReferenceSection(text: string): ReferenceSection | null {
  const lines = text.split('\n');
  
  // Common reference section headers
  const referencePatterns = [
    /^references\s*$/i,
    /^bibliography\s*$/i,
    /^literature\s*cited\s*$/i,
    /^cited\s*references\s*$/i,
    /^참고문헌\s*$/i,
    /^참고문헌\s*$/,
    /^参考文献\s*$/
  ];
  
  let startLine = -1;
  let endLine = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (startLine === -1) {
      // Look for reference section start
      for (const pattern of referencePatterns) {
        if (pattern.test(line)) {
          startLine = i + 1; // Start from next line
          break;
        }
      }
    } else {
      // Look for reference section end
      if (line === '' && i > startLine + 5) {
        // Empty line after some references might indicate end
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !referencePatterns.some(p => p.test(nextLine))) {
          endLine = i;
          break;
        }
      }
      
      // Check for common section headers that might follow
      if (/^(appendix|acknowledgments?|figures?|tables?)\s*$/i.test(line)) {
        endLine = i;
        break;
      }
    }
  }
  
  if (startLine === -1) return null;
  
  const referenceText = lines.slice(startLine, endLine).join('\n');
  const references = segmentReferences(referenceText, startLine);
  
  return {
    startLine,
    endLine,
    references
  };
}

/**
 * Segment individual references from reference section text
 */
export function segmentReferences(text: string, startLineNumber: number = 0): SegmentedReference[] {
  const lines = text.split('\n');
  const references: SegmentedReference[] = [];
  let currentRef: string[] = [];
  let currentIndex = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      // Empty line - might indicate new reference
      if (currentRef.length > 0) {
        const refText = currentRef.join(' ').trim();
        if (refText.length > 20) {
          references.push({
            rawText: refText,
            index: currentIndex++,
            lineNumber: startLineNumber + i - currentRef.length + 1,
            confidence: calculateSegmentationConfidence(refText)
          });
        }
        currentRef = [];
      }
    } else {
      // Check if this line starts a new reference
      const isNewReference = isStartOfNewReference(line, currentRef);
      
      if (isNewReference && currentRef.length > 0) {
        const refText = currentRef.join(' ').trim();
        if (refText.length > 20) {
          references.push({
            rawText: refText,
            index: currentIndex++,
            lineNumber: startLineNumber + i - currentRef.length + 1,
            confidence: calculateSegmentationConfidence(refText)
          });
        }
        currentRef = [line];
      } else {
        currentRef.push(line);
      }
    }
  }
  
  // Add last reference
  if (currentRef.length > 0) {
    const refText = currentRef.join(' ').trim();
    if (refText.length > 20) {
      references.push({
        rawText: refText,
        index: currentIndex++,
        lineNumber: startLineNumber + lines.length - currentRef.length + 1,
        confidence: calculateSegmentationConfidence(refText)
      });
    }
  }
  
  return references;
}

/**
 * Check if a line starts a new reference
 */
function isStartOfNewReference(line: string, currentRef: string[]): boolean {
  if (currentRef.length === 0) return false;
  
  // Check for numbered references
  const numberedMatch = line.match(/^\d+\.\s+/);
  if (numberedMatch) return true;
  
  // Check for bracketed references
  const bracketedMatch = line.match(/^\[\d+\]\s+/);
  if (bracketedMatch) return true;
  
  // Check for author name at start (capitalized)
  const authorMatch = line.match(/^[A-Z][a-z]+,\s*[A-Z]\./);
  if (authorMatch) return true;
  
  // Check for year pattern (common in citations)
  const yearMatch = line.match(/^\(\d{4}\)/);
  if (yearMatch) return true;
  
  return false;
}

/**
 * Calculate confidence score for segmentation
 */
function calculateSegmentationConfidence(text: string): number {
  let confidence = 50;
  
  // Check for DOI
  if (/10\.\d{4,}\/\S+/.test(text)) confidence += 20;
  
  // Check for year
  if (/\b(19|20)\d{2}\b/.test(text)) confidence += 10;
  
  // Check for author pattern
  if (/^[A-Z][a-z]+,\s*[A-Z]\./.test(text)) confidence += 10;
  
  // Check for journal pattern
  if (/\b[A-Z][a-zA-Z\s]*[Aa][Rr][Cc][Hh][Ii][Vv][Ee][Ss]?\b/.test(text)) confidence += 5;
  
  // Check for length
  if (text.length > 50 && text.length < 500) confidence += 5;
  
  return Math.min(100, confidence);
}

/**
 * Parse individual reference to extract metadata
 */
export function parseReferenceMetadata(reference: SegmentedReference): Partial<CanonicalCitation> {
  const text = reference.rawText;
  const metadata: Partial<CanonicalCitation> = {
    id: `ref-${reference.index}`,
    rawText: text,
    confidence: reference.confidence,
    keywords: [],
    authors: [],
    doiVerified: false,
    crossrefMatched: false,
    userOverridden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Extract DOI
  const doiMatch = text.match(/10\.\d{4,}\/[^\s\]>"'<>]+/);
  if (doiMatch) {
    metadata.doi = doiMatch[0].trim();
    metadata.doiVerified = true;
  }
  
  // Extract year
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    metadata.year = parseInt(yearMatch[0]);
  }
  
  // Extract authors
  const authorMatch = text.match(/^([A-Z][a-zÀ-ÿ]+(?:,\s*[A-Z]\.?)+(?:\s*[,&]\s*[A-Z][a-zÀ-ÿ]+(?:,\s*[A-Z]\.?)+)*)/);
  if (authorMatch) {
    const authorParts = authorMatch[1].split(/,\s*&\s*|\s+&\s+|;\s*/);
    metadata.authors = authorParts.map(part => {
      const nameParts = part.trim().split(/,\s*/);
      if (nameParts.length >= 2) {
        return {
          family: nameParts[0],
          given: nameParts.slice(1).join(' ')
        };
      }
      return {
        family: part.trim(),
        given: ''
      };
    });
  }
  
  // Extract title (between author and journal)
  const titleMatch = text.match(/(?:,\s*)?(?:\(\d{4}\)\.)?\s*["']?([^"'\.]+)["']?\./);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract journal
  const journalMatch = text.match(/\b([A-Z][a-zA-Z\s]+)\b,\s*\d+/);
  if (journalMatch) {
    metadata.journal = journalMatch[1].trim();
  }
  
  // Extract volume and issue
  const volumeMatch = text.match(/,\s*(\d+)\s*\((\d+)\)/);
  if (volumeMatch) {
    metadata.volume = volumeMatch[1];
    metadata.issue = volumeMatch[2];
  } else {
    const simpleVolumeMatch = text.match(/,\s*(\d+)/);
    if (simpleVolumeMatch) {
      metadata.volume = simpleVolumeMatch[1];
    }
  }
  
  // Extract pages
  const pagesMatch = text.match(/pp?\.\s*(\d+[–-]\d+)/);
  if (pagesMatch) {
    metadata.pages = pagesMatch[1];
  } else {
    const simplePagesMatch = text.match(/(\d+[–-]\d+)/);
    if (simplePagesMatch) {
      metadata.pages = simplePagesMatch[1];
    }
  }
  
  // Determine type
  if (metadata.journal) {
    metadata.type = 'journal-article';
  } else {
    metadata.type = 'unknown';
  }
  
  metadata.language = 'en';
  metadata.metadataSource = 'parsed';
  
  return metadata;
}

/**
 * Batch parse all references
 */
export function batchParseReferences(references: SegmentedReference[]): Partial<CanonicalCitation>[] {
  return references.map(ref => parseReferenceMetadata(ref));
}

/**
 * Validate reference segmentation
 */
export function validateSegmentation(references: SegmentedReference[]): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  if (references.length === 0) {
    issues.push('참고문헌을 찾을 수 없습니다');
    suggestions.push('참고문헌 섹션을 확인하세요');
    return { isValid: false, issues, suggestions };
  }
  
  // Check for very short references
  const shortRefs = references.filter(r => r.rawText.length < 30);
  if (shortRefs.length > references.length * 0.2) {
    issues.push(`${shortRefs.length}개의 참고문헌이 너무 짧습니다`);
    suggestions.push('참고문헌 분할을 다시 확인하세요');
  }
  
  // Check for very long references (might be merged)
  const longRefs = references.filter(r => r.rawText.length > 1000);
  if (longRefs.length > 0) {
    issues.push(`${longRefs.length}개의 참고문헌이 너무 길어 여러 개가 합쳐졌을 수 있습니다`);
    suggestions.push('참고문헌 분할을 다시 확인하세요');
  }
  
  // Check confidence scores
  const lowConfidenceRefs = references.filter(r => r.confidence < 50);
  if (lowConfidenceRefs.length > references.length * 0.3) {
    issues.push(`${lowConfidenceRefs.length}개의 참고문헌 신뢰도가 낮습니다`);
    suggestions.push('수동 확인이 필요합니다');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}
