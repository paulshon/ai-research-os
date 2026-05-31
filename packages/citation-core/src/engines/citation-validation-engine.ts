/**
 * Citation Validation Engine - AI-powered citation validation
 * AI Research OS v22
 * 
 * Validates citations using multiple strategies:
 * - DOI verification
 * - Crossref validation
 * - Metadata consistency checks
 * - Format validation
 * - Duplicate detection
 */

import { CanonicalCitation } from '../index';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  suggestions: string[];
  warnings: string[];
}

export interface ValidationIssue {
  type: 'missing_doi' | 'invalid_doi' | 'missing_title' | 'missing_authors' | 'invalid_year' | 'missing_journal' | 'format_error' | 'duplicate' | 'inconsistency' | 'hallucination_suspected';
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  suggestion?: string;
}

/**
 * Validate citation comprehensively
 */
export async function validateCitation(citation: CanonicalCitation): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  const warnings: string[] = [];
  
  // DOI validation
  const doiValidation = validateDOI(citation);
  issues.push(...doiValidation.issues);
  suggestions.push(...doiValidation.suggestions);
  
  // Title validation
  const titleValidation = validateTitle(citation);
  issues.push(...titleValidation.issues);
  suggestions.push(...titleValidation.suggestions);
  
  // Author validation
  const authorValidation = validateAuthors(citation);
  issues.push(...authorValidation.issues);
  suggestions.push(...authorValidation.suggestions);
  
  // Year validation
  const yearValidation = validateYear(citation);
  issues.push(...yearValidation.issues);
  suggestions.push(...yearValidation.suggestions);
  
  // Journal validation
  const journalValidation = validateJournal(citation);
  issues.push(...journalValidation.issues);
  suggestions.push(...journalValidation.suggestions);
  
  // Metadata consistency
  const consistencyValidation = validateConsistency(citation);
  issues.push(...consistencyValidation.issues);
  warnings.push(...consistencyValidation.warnings);
  
  // Calculate overall validity
  const errors = issues.filter(i => i.severity === 'error');
  const isValid = errors.length === 0;
  
  // Calculate confidence
  const confidence = calculateValidationConfidence(citation, issues);
  
  return {
    isValid,
    confidence,
    issues,
    suggestions,
    warnings
  };
}

/**
 * Validate DOI
 */
function validateDOI(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  suggestions: string[];
} {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  if (!citation.doi) {
    issues.push({
      type: 'missing_doi',
      severity: 'warning',
      message: 'DOI가 없습니다',
      field: 'doi',
      suggestion: 'DOI를 추가하면 인용 정확도가 높아집니다'
    });
    suggestions.push('DOI를 추가하거나 제목으로 검색하세요');
  } else if (!isValidDOIFormat(citation.doi)) {
    issues.push({
      type: 'invalid_doi',
      severity: 'error',
      message: `DOI 형식이 올바르지 않습니다: ${citation.doi}`,
      field: 'doi',
      suggestion: '10.XXXX/... 형식인지 확인하세요'
    });
    suggestions.push('DOI 형식을 확인하세요');
  } else if (!citation.doiVerified) {
    issues.push({
      type: 'invalid_doi',
      severity: 'warning',
      message: 'DOI가 검증되지 않았습니다',
      field: 'doi',
      suggestion: 'Crossref에서 DOI 검증을 수행하세요'
    });
    suggestions.push('DOI를 Crossref에서 검증하세요');
  }
  
  return { issues, suggestions };
}

/**
 * Validate title
 */
function validateTitle(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  suggestions: string[];
} {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  if (!citation.title || citation.title.trim().length === 0) {
    issues.push({
      type: 'missing_title',
      severity: 'error',
      message: '제목이 없습니다',
      field: 'title',
      suggestion: '제목을 입력하세요'
    });
    suggestions.push('제목을 입력하세요');
  } else if (citation.title.length < 5) {
    issues.push({
      type: 'missing_title',
      severity: 'warning',
      message: '제목이 너무 짧습니다',
      field: 'title',
      suggestion: '전체 제목을 입력하세요'
    });
    suggestions.push('제목을 확인하세요');
  } else if (citation.title.length > 500) {
    issues.push({
      type: 'format_error',
      severity: 'warning',
      message: '제목이 너무 깁니다',
      field: 'title',
      suggestion: '제목이 올바른지 확인하세요'
    });
  }
  
  return { issues, suggestions };
}

/**
 * Validate authors
 */
function validateAuthors(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  suggestions: string[];
} {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  if (!citation.authors || citation.authors.length === 0) {
    issues.push({
      type: 'missing_authors',
      severity: 'error',
      message: '저자 정보가 없습니다',
      field: 'authors',
      suggestion: '저자를 입력하세요'
    });
    suggestions.push('저자를 입력하세요');
  } else {
    // Validate each author
    for (let i = 0; i < citation.authors.length; i++) {
      const author = citation.authors[i];
      
      if (!author.family && !author.fullName) {
        issues.push({
          type: 'missing_authors',
          severity: 'warning',
          message: `${i + 1}번째 저자의 성이 없습니다`,
          field: 'authors',
          suggestion: '저자 이름을 확인하세요'
        });
      }
      
      // Validate ORCID format if present
      if (author.orcid && !isValidORCID(author.orcid)) {
        issues.push({
          type: 'format_error',
          severity: 'warning',
          message: `${i + 1}번째 저자의 ORCID 형식이 올바르지 않습니다`,
          field: 'authors',
          suggestion: 'ORCID 형식을 확인하세요'
        });
      }
    }
  }
  
  return { issues, suggestions };
}

/**
 * Validate year
 */
function validateYear(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  suggestions: string[];
} {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  const currentYear = new Date().getFullYear();
  
  if (!citation.year || citation.year === 0) {
    issues.push({
      type: 'invalid_year',
      severity: 'error',
      message: '출판 연도가 없습니다',
      field: 'year',
      suggestion: '출판 연도를 입력하세요'
    });
    suggestions.push('출판 연도를 입력하세요');
  } else if (citation.year < 1900) {
    issues.push({
      type: 'invalid_year',
      severity: 'error',
      message: `출판 연도가 너무 이릅니다: ${citation.year}`,
      field: 'year',
      suggestion: '출판 연도를 확인하세요'
    });
  } else if (citation.year > currentYear + 2) {
    issues.push({
      type: 'invalid_year',
      severity: 'warning',
      message: `출판 연도가 미래입니다: ${citation.year}`,
      field: 'year',
      suggestion: '출판 연도를 확인하세요'
    });
  }
  
  return { issues, suggestions };
}

/**
 * Validate journal
 */
function validateJournal(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  suggestions: string[];
} {
  const issues: ValidationIssue[] = [];
  const suggestions: string[] = [];
  
  if (citation.type === 'journal-article' && !citation.journal) {
    issues.push({
      type: 'missing_journal',
      severity: 'warning',
      message: '저널명이 없습니다',
      field: 'journal',
      suggestion: '저널명을 입력하거나 Crossref에서 재검색하세요'
    });
    suggestions.push('저널명을 입력하세요');
  }
  
  return { issues, suggestions };
}

/**
 * Validate metadata consistency
 */
function validateConsistency(citation: CanonicalCitation): {
  issues: ValidationIssue[];
  warnings: string[];
} {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];
  
  // Check if DOI matches title (if DOI is verified)
  if (citation.doiVerified && citation.crossrefMatched) {
    // This would require Crossref lookup to verify
    // For now, just check if we have both
    if (!citation.title || !citation.authors || citation.authors.length === 0) {
      warnings.push('DOI가 검증되었지만 메타데이터가 불완전합니다');
    }
  }
  
  // Check for journal article without journal
  if (citation.type === 'journal-article' && !citation.journal) {
    issues.push({
      type: 'inconsistency',
      severity: 'warning',
      message: '저널 논문인데 저널명이 없습니다',
      field: 'journal',
      suggestion: '저널명을 입력하거나 문서 유형을 변경하세요'
    });
  }
  
  // Check for book without publisher
  if (citation.type === 'book' && !citation.publisher) {
    issues.push({
      type: 'inconsistency',
      severity: 'warning',
      message: '도서인데 출판사가 없습니다',
      field: 'publisher',
      suggestion: '출판사를 입력하세요'
    });
  }
  
  return { issues, warnings };
}

/**
 * Calculate validation confidence
 */
function calculateValidationConfidence(citation: CanonicalCitation, issues: ValidationIssue[]): number {
  let confidence = citation.confidence;
  
  // Penalize for errors
  const errors = issues.filter(i => i.severity === 'error');
  confidence -= errors.length * 15;
  
  // Penalize for warnings
  const warnings = issues.filter(i => i.severity === 'warning');
  confidence -= warnings.length * 5;
  
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Validate DOI format
 */
function isValidDOIFormat(doi: string): boolean {
  return /^10\.\d{4,}\/\S+$/.test(doi);
}

/**
 * Validate ORCID format
 */
function isValidORCID(orcid: string): boolean {
  const cleaned = orcid.replace(/https?:\/\/orcid\.org\//, '').replace(/[-\s]/g, '');
  return /^\d{16}[X0-9]$/.test(cleaned);
}

/**
 * Detect duplicate citations
 */
export function detectDuplicates(citations: CanonicalCitation[]): Array<{
  citation1: CanonicalCitation;
  citation2: CanonicalCitation;
  similarity: number;
}> {
  const duplicates: Array<{
    citation1: CanonicalCitation;
    citation2: CanonicalCitation;
    similarity: number;
  }> = [];
  
  for (let i = 0; i < citations.length; i++) {
    for (let j = i + 1; j < citations.length; j++) {
      const similarity = calculateCitationSimilarity(citations[i], citations[j]);
      
      if (similarity > 0.8) {
        duplicates.push({
          citation1: citations[i],
          citation2: citations[j],
          similarity
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * Calculate citation similarity
 */
function calculateCitationSimilarity(c1: CanonicalCitation, c2: CanonicalCitation): number {
  let similarity = 0;
  let factors = 0;
  
  // DOI match
  if (c1.doi && c2.doi && c1.doi === c2.doi) {
    similarity += 1.0;
    factors++;
  }
  
  // Title similarity
  if (c1.title && c2.title) {
    const titleSim = calculateStringSimilarity(c1.title.toLowerCase(), c2.title.toLowerCase());
    similarity += titleSim * 0.4;
    factors++;
  }
  
  // Author similarity
  if (c1.authors.length > 0 && c2.authors.length > 0) {
    const authorSim = calculateAuthorSimilarity(c1.authors, c2.authors);
    similarity += authorSim * 0.3;
    factors++;
  }
  
  // Year match
  if (c1.year && c2.year && c1.year === c2.year) {
    similarity += 0.2;
    factors++;
  }
  
  // Journal match
  if (c1.journal && c2.journal) {
    const journalSim = calculateStringSimilarity(c1.journal.toLowerCase(), c2.journal.toLowerCase());
    similarity += journalSim * 0.1;
    factors++;
  }
  
  return factors > 0 ? similarity / factors : 0;
}

/**
 * Calculate string similarity
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate author similarity
 */
function calculateAuthorSimilarity(authors1: any[], authors2: any[]): number {
  if (authors1.length === 0 && authors2.length === 0) return 1.0;
  if (authors1.length === 0 || authors2.length === 0) return 0.0;
  
  let matches = 0;
  for (const a1 of authors1) {
    for (const a2 of authors2) {
      if (a1.family === a2.family && a1.given === a2.given) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(authors1.length, authors2.length);
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}
