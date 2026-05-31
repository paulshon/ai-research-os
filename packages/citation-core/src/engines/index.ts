/**
 * Citation Engines - Main Integration Point
 * AI Research OS v22
 * 
 * This file exports all citation engines and provides
 * a unified interface for the citation processing pipeline.
 */

// GROBID Engine
export {
  processPDFWithGROBID,
  parseTEIXML,
  checkGROBIDHealth,
  DEFAULT_GROBID_CONFIG,
  type GROBIDConfig,
  type GROBIDResponse,
  type TEIMetadata
} from './grobid-engine';

// DOI Discovery Engine
export {
  discoverDOI,
  discoverDOIFromCrossref,
  discoverDOIFromOpenAlex,
  discoverDOIFromSemanticScholar,
  discoverDOIFromText,
  calculateTitleSimilarity,
  type DOIQuery,
  type DOIResult
} from './doi-discovery-engine';

// Crossref Resolver
export {
  fetchCrossrefByDOI,
  searchCrossref,
  parseCrossrefResponse,
  getCitationCount as getCrossrefCitationCount,
  isValidCrossrefDOI,
  type CrossrefWork,
  type CrossrefResponse
} from './crossref-resolver';

// OpenAlex Resolver
export {
  fetchOpenAlexByDOI,
  searchOpenAlex,
  parseOpenAlexResponse,
  getOpenAlexCitationCount,
  getOpenAlexAuthor,
  getWorksByAuthor,
  type OpenAlexWork,
  type OpenAlexResponse
} from './openalex-resolver';

// Semantic Scholar Resolver
export {
  fetchSemanticScholarByDOI,
  searchSemanticScholar,
  parseSemanticScholarResponse,
  getSemanticScholarCitationCount,
  getRecommendations,
  getSemanticScholarAuthor,
  type SemanticScholarPaper,
  type SemanticScholarResponse
} from './semantic-scholar-resolver';

// Metadata Merge Engine
export {
  mergeMetadata,
  validateMergedMetadata,
  type MetadataSource,
  type MergeStrategy
} from './metadata-merge-engine';

// CSL Engine
export {
  toCSLJSON,
  formatWithCSL,
  formatInTextCSL,
  getCSLStyleMetadata
} from './csl-engine';

// Confidence Engine
export {
  calculateConfidence,
  validateConfidence,
  compareConfidence,
  getImprovementSuggestions,
  type ConfidenceBreakdown,
  type ConfidenceFactors
} from './confidence-engine';

// Author Normalization Engine
export {
  normalizeAuthor,
  normalizeAuthors,
  deduplicateAuthors,
  toCitationAuthor,
  formatAuthorName,
  calculateAuthorSimilarity,
  isValidORCID,
  formatORCID,
  type NormalizedAuthor
} from './author-normalization-engine';

// Reference Segmentation Engine
export {
  detectReferenceSection,
  segmentReferences,
  parseReferenceMetadata,
  batchParseReferences,
  validateSegmentation,
  type SegmentedReference,
  type ReferenceSection
} from './reference-segmentation-engine';

// PDF Layout Engine
export {
  extractPDFWithLayout,
  detectColumns,
  extractTables,
  extractFigures,
  extractSectionHeaders,
  reconstructTextFlow,
  validateExtraction,
  type PDFTextItem,
  type PDFPage,
  type PDFDocument,
  type TextExtractionOptions
} from './pdf-layout-engine';

// Citation Validation Engine
export {
  validateCitation,
  detectDuplicates,
  type ValidationResult,
  type ValidationIssue
} from './citation-validation-engine';
