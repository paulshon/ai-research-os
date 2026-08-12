/**
 * Confidence Engine - Calculate and track confidence scores
 * AI Research OS v22
 * 
 * Provides detailed confidence scoring for citations:
 * - DOI verification
 * - Metadata completeness
 * - Source reliability
 * - Parse quality
 * - OCR quality
 */

import { CanonicalCitation } from '../index';

export interface ConfidenceBreakdown {
  doiScore: number;
  metadataScore: number;
  sourceScore: number;
  parseScore: number;
  ocrScore: number;
  total: number;
  level: 'high' | 'medium' | 'low';
  label: string;
}

export interface ConfidenceFactors {
  hasDOI: boolean;
  doiVerified: boolean;
  hasTitle: boolean;
  hasAuthors: boolean;
  hasYear: boolean;
  hasJournal: boolean;
  hasVolume: boolean;
  hasPages: boolean;
  source: string;
  crossrefMatched: boolean;
  openalexMatched: boolean;
  semanticScholarMatched: boolean;
  userOverridden: boolean;
}

/**
 * Calculate detailed confidence score
 */
export function calculateConfidence(citation: Partial<CanonicalCitation>): ConfidenceBreakdown {
  const factors = extractFactors(citation);
  
  const doiScore = calculateDOIScore(factors);
  const metadataScore = calculateMetadataScore(factors);
  const sourceScore = calculateSourceScore(factors);
  const parseScore = calculateParseScore(factors);
  const ocrScore = 15; // Base OCR score for PDF processing

  const total = Math.min(100, doiScore + metadataScore + sourceScore + parseScore + ocrScore);
  const level = getConfidenceLevel(total);
  const label = getConfidenceLabel(level, factors);

  return {
    doiScore,
    metadataScore,
    sourceScore,
    parseScore,
    ocrScore,
    total,
    level,
    label
  };
}

/**
 * Extract confidence factors from citation
 */
function extractFactors(citation: Partial<CanonicalCitation>): ConfidenceFactors {
  return {
    hasDOI: !!citation.doi,
    doiVerified: citation.doiVerified || false,
    hasTitle: !!citation.title && citation.title.length > 3,
    hasAuthors: !!citation.authors && citation.authors.length > 0,
    hasYear: !!citation.year && citation.year > 1900 && citation.year <= new Date().getFullYear() + 2,
    hasJournal: !!citation.journal,
    hasVolume: !!citation.volume,
    hasPages: !!citation.pages,
    source: citation.metadataSource || 'parsed',
    crossrefMatched: citation.crossrefMatched || false,
    openalexMatched: citation.metadataSource === 'openalex',
    semanticScholarMatched: citation.metadataSource === 'semantic_scholar',
    userOverridden: citation.userOverridden || false
  };
}

/**
 * Calculate DOI-based confidence score
 */
function calculateDOIScore(factors: ConfidenceFactors): number {
  if (!factors.hasDOI) return 0;
  
  if (factors.doiVerified) {
    return 30;
  }
  
  return 15;
}

/**
 * Calculate metadata completeness score
 */
function calculateMetadataScore(factors: ConfidenceFactors): number {
  let score = 0;
  
  if (factors.hasTitle) score += 10;
  if (factors.hasAuthors) score += 10;
  if (factors.hasYear) score += 8;
  if (factors.hasJournal) score += 8;
  if (factors.hasVolume) score += 4;
  if (factors.hasPages) score += 4;
  
  return Math.min(40, score);
}

/**
 * Calculate source reliability score
 */
function calculateSourceScore(factors: ConfidenceFactors): number {
  let score = 0;
  
  switch (factors.source) {
    case 'crossref':
      score = 25;
      break;
    case 'openalex':
      score = 20;
      break;
    case 'semantic_scholar':
      score = 18;
      break;
    case 'pubmed':
      score = 22;
      break;
    case 'grobid':
      score = 15;
      break;
    case 'manual':
      score = 30;
      break;
    case 'parsed':
      score = 10;
      break;
    default:
      score = 5;
  }
  
  if (factors.userOverridden) {
    score = Math.max(score, 25);
  }
  
  return score;
}

/**
 * Calculate parse quality score
 */
function calculateParseScore(factors: ConfidenceFactors): number {
  let score = 0;
  
  if (factors.crossrefMatched) score += 10;
  if (factors.openalexMatched) score += 8;
  if (factors.semanticScholarMatched) score += 7;
  
  return Math.min(15, score);
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Get confidence label
 */
function getConfidenceLabel(level: 'high' | 'medium' | 'low', factors: ConfidenceFactors): string {
  if (factors.userOverridden) return '수동 확인 완료';
  
  switch (level) {
    case 'high':
      if (factors.doiVerified) return 'DOI 검증됨';
      return '높은 신뢰도';
    case 'medium':
      if (factors.hasDOI) return '부분 검증';
      return '중간 신뢰도';
    case 'low':
      return '수동 확인 필요';
  }
}

/**
 * Validate citation confidence
 */
export function validateConfidence(citation: Partial<CanonicalCitation>): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const breakdown = calculateConfidence(citation);
  const factors = extractFactors(citation);
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!factors.hasDOI) {
    issues.push('DOI가 없습니다');
    suggestions.push('DOI를 추가하면 신뢰도가 크게 향상됩니다');
  }

  if (!factors.hasTitle) {
    issues.push('제목이 없습니다');
    suggestions.push('제목을 입력하세요');
  }

  if (!factors.hasAuthors) {
    issues.push('저자 정보가 없습니다');
    suggestions.push('저자를 입력하세요');
  }

  if (!factors.hasYear) {
    issues.push('출판 연도가 없거나 유효하지 않습니다');
    suggestions.push('정확한 출판 연도를 입력하세요');
  }

  if (citation.type === 'journal-article' && !factors.hasJournal) {
    issues.push('저널명이 없습니다');
    suggestions.push('저널명을 입력하거나 Crossref에서 재검색하세요');
  }

  if (breakdown.level === 'low') {
    issues.push('전체 신뢰도가 낮습니다');
    suggestions.push('DOI 검증 또는 수동 확인이 필요합니다');
  }

  return {
    isValid: breakdown.level !== 'low',
    issues,
    suggestions
  };
}

/**
 * Compare two confidence scores
 */
export function compareConfidence(
  citation1: Partial<CanonicalCitation>,
  citation2: Partial<CanonicalCitation>
): number {
  const score1 = calculateConfidence(citation1).total;
  const score2 = calculateConfidence(citation2).total;
  return score1 - score2;
}

/**
 * Get confidence improvement suggestions
 */
export function getImprovementSuggestions(citation: Partial<CanonicalCitation>): string[] {
  const factors = extractFactors(citation);
  const suggestions: string[] = [];

  if (!factors.hasDOI) {
    suggestions.push('DOI를 추가하여 신뢰도를 30점 향상시키세요');
  } else if (!factors.doiVerified) {
    suggestions.push('DOI를 Crossref에서 검증하여 신뢰도를 15점 향상시키세요');
  }

  if (!factors.hasTitle) {
    suggestions.push('제목을 추가하여 신뢰도를 10점 향상시키세요');
  }

  if (!factors.hasAuthors) {
    suggestions.push('저자 정보를 추가하여 신뢰도를 10점 향상시키세요');
  }

  if (!factors.hasYear) {
    suggestions.push('출판 연도를 추가하여 신뢰도를 8점 향상시키세요');
  }

  if (!factors.hasJournal && citation.type === 'journal-article') {
    suggestions.push('저널명을 추가하여 신뢰도를 8점 향상시키세요');
  }

  if (!factors.crossrefMatched && factors.hasDOI) {
    suggestions.push('Crossref에서 메타데이터를 검증하여 신뢰도를 10점 향상시키세요');
  }

  return suggestions;
}
