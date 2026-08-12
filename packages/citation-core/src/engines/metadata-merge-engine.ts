/**
 * Metadata Merge Engine - Combines metadata from multiple sources
 * AI Research OS v22
 * 
 * Merges metadata from:
 * - GROBID (PDF parsing)
 * - Crossref (DOI lookup)
 * - OpenAlex (alternative metadata)
 * - Semantic Scholar (AI-enhanced metadata)
 * - Manual user input
 * 
 * Uses confidence scores to resolve conflicts
 */

import { CanonicalCitation, CitationAuthor } from '../index';

export interface MetadataSource {
  source: 'grobid' | 'crossref' | 'openalex' | 'semantic_scholar' | 'manual' | 'parsed';
  data: Partial<CanonicalCitation>;
  confidence: number;
}

export interface MergeStrategy {
  preferHigherConfidence: boolean;
  preferCrossref: boolean;
  preferUserInput: boolean;
}

/**
 * Merge metadata from multiple sources with conflict resolution
 */
export function mergeMetadata(
  sources: MetadataSource[],
  strategy: MergeStrategy = {
    preferHigherConfidence: true,
    preferCrossref: true,
    preferUserInput: true
  }
): Partial<CanonicalCitation> {
  if (sources.length === 0) return {};

  // Sort sources by priority
  const sortedSources = [...sources].sort((a, b) => {
    // User input always first
    if (a.source === 'manual' && b.source !== 'manual') return -1;
    if (b.source === 'manual' && a.source !== 'manual') return 1;

    // Crossref preferred if enabled
    if (strategy.preferCrossref) {
      if (a.source === 'crossref' && b.source !== 'crossref') return -1;
      if (b.source === 'crossref' && a.source !== 'crossref') return 1;
    }

    // Higher confidence preferred
    if (strategy.preferHigherConfidence) {
      return b.confidence - a.confidence;
    }

    return 0;
  });

  const merged: Partial<CanonicalCitation> = {
    id: generateId(),
    keywords: [],
    authors: [],
    confidence: 0,
    doiVerified: false,
    crossrefMatched: false,
    userOverridden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Merge each field with conflict resolution
  for (const source of sortedSources) {
    const data = source.data;

    // DOI - prefer verified DOI
    if (data.doi && !merged.doi) {
      merged.doi = data.doi;
      merged.doiVerified = data.doiVerified || false;
    }

    // Title - prefer longer, more complete title
    if (data.title && (!merged.title || data.title.length > merged.title.length)) {
      merged.title = data.title;
    }

    // Type - prefer more specific type
    if (data.type && (!merged.type || isMoreSpecificType(data.type, merged.type))) {
      merged.type = data.type;
    }

    // Year - prefer verified year
    if (data.year && data.year > 1900 && (!merged.year || data.year > merged.year)) {
      merged.year = data.year;
    }

    // Authors - merge and deduplicate
    if (data.authors && data.authors.length > 0) {
      merged.authors = mergeAuthors(merged.authors || [], data.authors);
    }

    // Journal
    if (data.journal && !merged.journal) {
      merged.journal = data.journal;
    }

    // Publisher
    if (data.publisher && !merged.publisher) {
      merged.publisher = data.publisher;
    }

    // Volume
    if (data.volume && !merged.volume) {
      merged.volume = data.volume;
    }

    // Issue
    if (data.issue && !merged.issue) {
      merged.issue = data.issue;
    }

    // Pages
    if (data.pages && !merged.pages) {
      merged.pages = data.pages;
    }

    // ISSN
    if (data.issn && !merged.issn) {
      merged.issn = data.issn;
    }

    // ISBN
    if (data.isbn && !merged.isbn) {
      merged.isbn = data.isbn;
    }

    // Abstract - prefer longer abstract
    if (data.abstract && (!merged.abstract || data.abstract.length > merged.abstract.length)) {
      merged.abstract = data.abstract;
    }

    // Keywords - merge and deduplicate
    if (data.keywords && data.keywords.length > 0) {
      merged.keywords = mergeKeywords(merged.keywords || [], data.keywords);
    }

    // URL
    if (data.url && !merged.url) {
      merged.url = data.url;
    }

    // Language
    if (data.language && !merged.language) {
      merged.language = data.language;
    }

    // Metadata source tracking
    if (!merged.metadataSource || source.source === 'crossref') {
      merged.metadataSource = source.source as any;
    }

    // Verification flags
    if (data.doiVerified) merged.doiVerified = true;
    if (data.crossrefMatched) merged.crossrefMatched = true;
    if (data.userOverridden) merged.userOverridden = true;
  }

  // Calculate overall confidence
  merged.confidence = calculateOverallConfidence(sources, merged);

  return merged;
}

/**
 * Merge author lists with deduplication
 */
function mergeAuthors(
  existing: CitationAuthor[],
  newAuthors: CitationAuthor[]
): CitationAuthor[] {
  const merged = [...existing];

  for (const newAuthor of newAuthors) {
    const exists = merged.some(existing =>
      areAuthorsSame(existing, newAuthor)
    );

    if (!exists) {
      merged.push(newAuthor);
    }
  }

  return merged;
}

/**
 * Check if two authors are the same
 */
function areAuthorsSame(a: CitationAuthor, b: CitationAuthor): boolean {
  // Check by ORCID if both have it
  if (a.orcid && b.orcid && a.orcid === b.orcid) return true;

  // Check by name similarity
  const aFamily = a.family?.toLowerCase().trim() || '';
  const bFamily = b.family?.toLowerCase().trim() || '';
  const aGiven = a.given?.toLowerCase().trim() || '';
  const bGiven = b.given?.toLowerCase().trim() || '';

  if (aFamily === bFamily && aGiven === bGiven) return true;

  // Check by full name
  const aFull = a.fullName?.toLowerCase().trim() || '';
  const bFull = b.fullName?.toLowerCase().trim() || '';
  if (aFull && bFull && aFull === bFull) return true;

  return false;
}

/**
 * Merge keyword lists with deduplication
 */
function mergeKeywords(existing: string[], newKeywords: string[]): string[] {
  const existingLower = existing.map(k => k.toLowerCase());
  const merged = [...existing];

  for (const keyword of newKeywords) {
    const lower = keyword.toLowerCase();
    if (!existingLower.includes(lower)) {
      merged.push(keyword);
    }
  }

  return merged;
}

/**
 * Check if type A is more specific than type B
 */
function isMoreSpecificType(typeA: string, typeB: string): boolean {
  const specificityOrder: Record<string, number> = {
    'journal-article': 5,
    'conference-paper': 5,
    'book-chapter': 4,
    'book': 3,
    'thesis': 3,
    'report': 2,
    'dataset': 2,
    'preprint': 2,
    'website': 1,
    'unknown': 0
  };

  return (specificityOrder[typeA] || 0) > (specificityOrder[typeB] || 0);
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  sources: MetadataSource[],
  merged: Partial<CanonicalCitation>
): number {
  if (sources.length === 0) return 0;

  // Base confidence from sources
  const avgSourceConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;

  // Boost for DOI verification
  let boost = 0;
  if (merged.doiVerified) boost += 15;
  if (merged.crossrefMatched) boost += 10;
  if (merged.userOverridden) boost += 20;

  // Boost for completeness
  if (merged.title) boost += 5;
  if (merged.authors && merged.authors.length > 0) boost += 5;
  if (merged.year && merged.year > 1900) boost += 3;
  if (merged.journal) boost += 3;
  if (merged.volume || merged.pages) boost += 2;

  // Penalty for missing critical fields
  if (!merged.doi) boost -= 10;
  if (!merged.title) boost -= 15;
  if (!merged.authors || merged.authors.length === 0) boost -= 10;

  return Math.min(100, Math.max(0, avgSourceConfidence + boost));
}

/**
 * Generate unique ID for merged citation
 */
function generateId(): string {
  return `merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate merged metadata
 */
export function validateMergedMetadata(citation: Partial<CanonicalCitation>): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!citation.title || citation.title.length < 3) {
    issues.push('Title is missing or too short');
  }

  if (!citation.authors || citation.authors.length === 0) {
    issues.push('No authors found');
  }

  if (!citation.year || citation.year < 1900 || citation.year > new Date().getFullYear() + 2) {
    issues.push('Invalid publication year');
  }

  if (citation.type === 'journal-article' && !citation.journal) {
    issues.push('Journal name missing for journal article');
  }

  if (citation.doi && !/^10\.\d{4,}\/\S+$/.test(citation.doi)) {
    issues.push('Invalid DOI format');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
