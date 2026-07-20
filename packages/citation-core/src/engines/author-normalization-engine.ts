/**
 * Author Normalization Engine - Normalize and deduplicate author names
 * AI Research OS v22
 * 
 * Handles various author name formats:
 * - "John Smith"
 * - "Smith, John"
 * - "Smith, J."
 * - "J. Smith"
 * - "홍길동"
 * - "Hong Gil-Dong"
 * - "Hong, G."
 * - "Gildong Hong"
 * - "홍길동(Hong, G.)"
 * 
 * Also handles ORCID resolution and canonical author identification
 */

import { CitationAuthor } from '../index';

export interface NormalizedAuthor {
  given: string;
  family: string;
  initials: string;
  fullName: string;
  orcid?: string;
  affiliation?: string;
  isKorean: boolean;
  confidence: number;
}

/**
 * Normalize author name to canonical form
 */
export function normalizeAuthor(name: string, orcid?: string, affiliation?: string): NormalizedAuthor {
  const trimmed = name.trim();
  const isKorean = /[가-힣]/.test(trimmed);

  if (isKorean) {
    return normalizeKoreanAuthor(trimmed, orcid, affiliation);
  }

  return normalizeWesternAuthor(trimmed, orcid, affiliation);
}

/**
 * Normalize Korean author name
 */
function normalizeKoreanAuthor(name: string, orcid?: string, affiliation?: string): NormalizedAuthor {
  // Handle mixed format: "홍길동(Hong, G.)"
  const mixedMatch = name.match(/^([가-힣]+)\s*\(([^)]+)\)$/);
  if (mixedMatch) {
    const koreanName = mixedMatch[1];
    const westernName = mixedMatch[2];
    const western = normalizeWesternAuthor(westernName);
    return {
      given: western.given,
      family: koreanName,
      initials: western.initials,
      fullName: koreanName,
      orcid,
      affiliation,
      isKorean: true,
      confidence: 95
    };
  }

  // Pure Korean name
  const parts = name.split(/\s+/);
  const family = parts[0] || '';
  const given = parts.slice(1).join(' ') || '';

  return {
    given,
    family,
    initials: given.split('').map(c => c).join(''),
    fullName: name,
    orcid,
    affiliation,
    isKorean: true,
    confidence: 90
  };
}

/**
 * Normalize Western author name
 */
function normalizeWesternAuthor(name: string, orcid?: string, affiliation?: string): NormalizedAuthor {
  // Handle "Last, First" format
  const commaMatch = name.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    const family = commaMatch[1].trim();
    const given = commaMatch[2].trim();
    const initials = extractInitials(given);
    
    return {
      given,
      family,
      initials,
      fullName: name,
      orcid,
      affiliation,
      isKorean: false,
      confidence: 95
    };
  }

  // Handle "First Last" format
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    const family = parts.pop() || '';
    const given = parts.join(' ');
    const initials = extractInitials(given);
    
    return {
      given,
      family,
      initials,
      fullName: name,
      orcid,
      affiliation,
      isKorean: false,
      confidence: 85
    };
  }

  // Single name
  return {
    given: '',
    family: name,
    initials: '',
    fullName: name,
    orcid,
    affiliation,
    isKorean: false,
    confidence: 50
  };
}

/**
 * Extract initials from given name
 */
function extractInitials(given: string): string {
  return given
    .split(/\s+/)
    .map(part => part[0] ? part[0].toUpperCase() : '')
    .join('. ') + (given ? '.' : '');
}

/**
 * Normalize array of authors
 */
export function normalizeAuthors(authors: Array<{ name?: string; given?: string; family?: string; orcid?: string; affiliation?: string }>): NormalizedAuthor[] {
  return authors.map(author => {
    if (author.given && author.family) {
      const initials = extractInitials(author.given);
      const fullName = `${author.family}, ${author.given}`;
      const isKorean = /[가-힣]/.test(author.family + author.given);
      
      return {
        given: author.given,
        family: author.family,
        initials,
        fullName,
        orcid: author.orcid,
        affiliation: author.affiliation,
        isKorean,
        confidence: 95
      };
    }
    
    if (author.name) {
      return normalizeAuthor(author.name, author.orcid, author.affiliation);
    }
    
    return {
      given: '',
      family: '',
      initials: '',
      fullName: '',
      orcid: author.orcid,
      affiliation: author.affiliation,
      isKorean: false,
      confidence: 0
    };
  });
}

/**
 * Deduplicate authors based on similarity
 */
export function deduplicateAuthors(authors: NormalizedAuthor[]): NormalizedAuthor[] {
  const deduplicated: NormalizedAuthor[] = [];
  
  for (const author of authors) {
    const isDuplicate = deduplicated.some(existing => areAuthorsSame(existing, author));
    if (!isDuplicate) {
      deduplicated.push(author);
    }
  }
  
  return deduplicated;
}

/**
 * Check if two authors are the same
 */
function areAuthorsSame(a: NormalizedAuthor, b: NormalizedAuthor): boolean {
  // Check by ORCID if both have it
  if (a.orcid && b.orcid && a.orcid === b.orcid) return true;
  
  // Check by name similarity
  const aFamily = a.family.toLowerCase().trim();
  const bFamily = b.family.toLowerCase().trim();
  const aGiven = a.given.toLowerCase().trim();
  const bGiven = b.given.toLowerCase().trim();
  
  if (aFamily === bFamily && aGiven === bGiven) return true;
  
  // Check by initials
  if (aFamily === bFamily && a.initials === b.initials) return true;
  
  // Check by full name
  const aFull = a.fullName.toLowerCase().trim();
  const bFull = b.fullName.toLowerCase().trim();
  if (aFull === bFull) return true;
  
  return false;
}

/**
 * Convert NormalizedAuthor to CitationAuthor
 */
export function toCitationAuthor(normalized: NormalizedAuthor): CitationAuthor {
  return {
    given: normalized.given,
    family: normalized.family,
    fullName: normalized.fullName,
    orcid: normalized.orcid,
    affiliation: normalized.affiliation
  };
}

/**
 * Format author name for display
 */
export function formatAuthorName(author: NormalizedAuthor, style: 'full' | 'initials' | 'family' = 'full'): string {
  switch (style) {
    case 'full':
      if (author.isKorean) {
        return author.fullName;
      }
      return `${author.family}, ${author.given}`;
    case 'initials':
      if (author.isKorean) {
        return author.family;
      }
      return `${author.family}, ${author.initials}`;
    case 'family':
      return author.family;
    default:
      return author.fullName;
  }
}

/**
 * Calculate author name similarity
 */
export function calculateAuthorSimilarity(a: NormalizedAuthor, b: NormalizedAuthor): number {
  if (a.orcid && b.orcid && a.orcid === b.orcid) return 1.0;
  
  const familySimilarity = calculateStringSimilarity(a.family.toLowerCase(), b.family.toLowerCase());
  const givenSimilarity = calculateStringSimilarity(a.given.toLowerCase(), b.given.toLowerCase());
  
  return (familySimilarity * 0.6) + (givenSimilarity * 0.4);
}

/**
 * Calculate string similarity (Levenshtein distance)
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
 * Levenshtein distance calculation
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

/**
 * Validate ORCID format
 */
export function isValidORCID(orcid: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{4}(?:X|\d)$/.test(orcid);
}

/**
 * Format ORCID with proper prefix
 */
export function formatORCID(orcid: string): string {
  const cleaned = orcid.replace(/https?:\/\/orcid\.org\//, '').replace(/[-\s]/g, '');
  
  if (cleaned.length === 16) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}`;
  }
  
  return orcid;
}
