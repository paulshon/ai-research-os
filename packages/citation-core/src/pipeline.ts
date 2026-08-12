/**
 * Citation Processing Pipeline - Complete v22 Pipeline
 * AI Research OS v22
 * 
 * This is the main pipeline that orchestrates all citation engines:
 * 
 * PDF → GROBID → TEI XML → Metadata Extraction
 * → DOI Discovery → Crossref/OpenAlex/Semantic Scholar
 * → Metadata Merge → Confidence Scoring
 * → CSL Formatting → Validation
 */

import { CanonicalCitation } from './index';
import {
  processPDFWithGROBID,
  parseTEIXML,
  DEFAULT_GROBID_CONFIG,
  discoverDOI,
  fetchCrossrefByDOI,
  fetchOpenAlexByDOI,
  fetchSemanticScholarByDOI,
  mergeMetadata,
  MetadataSource,
  calculateConfidence,
  validateCitation,
  normalizeAuthors,
  toCitationAuthor,
  extractPDFWithLayout,
  detectReferenceSection,
  segmentReferences,
  parseReferenceMetadata,
  batchParseReferences
} from './engines';

export interface PipelineOptions {
  useGROBID?: boolean;
  useCrossref?: boolean;
  useOpenAlex?: boolean;
  useSemanticScholar?: boolean;
  grobidConfig?: {
    baseUrl: string;
    timeout?: number;
  };
  skipDOIValidation?: boolean;
}

export interface PipelineResult {
  citation: CanonicalCitation;
  sources: MetadataSource[];
  confidence: any;
  validation: any;
  references?: CanonicalCitation[];
  processingTime: number;
}

/**
 * Main citation processing pipeline
 */
export async function processCitation(
  file: File,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  
  const opts: PipelineOptions = {
    useGROBID: true,
    useCrossref: true,
    useOpenAlex: true,
    useSemanticScholar: true,
    grobidConfig: DEFAULT_GROBID_CONFIG,
    skipDOIValidation: false,
    ...options
  };
  
  const sources: MetadataSource[] = [];
  
  // Step 1: Extract text from PDF
  let text = '';
  let teiMetadata: any = null;
  
  if (opts.useGROBID && opts.grobidConfig) {
    try {
      const grobidResult = await processPDFWithGROBID(file, opts.grobidConfig);
      if (grobidResult.status === 'success' && grobidResult.tei) {
        teiMetadata = parseTEIXML(grobidResult.tei);
        text = grobidResult.tei;
        
        sources.push({
          source: 'grobid',
          data: {
            title: teiMetadata.title,
            authors: teiMetadata.authors,
            abstract: teiMetadata.abstract,
            keywords: teiMetadata.keywords,
            doi: teiMetadata.doi,
            journal: teiMetadata.journal,
            year: teiMetadata.year ? parseInt(teiMetadata.year) : undefined,
            volume: teiMetadata.volume,
            issue: teiMetadata.issue,
            pages: teiMetadata.pages,
            type: 'journal-article',
            language: 'en',
            metadataSource: 'grobid',
            doiVerified: !!teiMetadata.doi,
            crossrefMatched: false,
            userOverridden: false,
            confidence: 75
          },
          confidence: 75
        });
      }
    } catch (error) {
      console.error('GROBID processing failed:', error);
    }
  }
  
  // Fallback to basic PDF extraction if GROBID fails
  if (!text) {
    text = await extractPDFWithLayout(file);
  }
  
  // Step 2: DOI Discovery
  let doi = teiMetadata?.doi;
  if (!doi && !opts.skipDOIValidation) {
    const title = teiMetadata?.title || extractTitleFromText(text);
    const authors = teiMetadata?.authors || extractAuthorsFromText(text);
    
    if (title) {
      const doiResult = await discoverDOI({
        title,
        authors,
        journal: teiMetadata?.journal,
        year: teiMetadata?.year ? parseInt(teiMetadata.year) : undefined
      }, text);
      
      if (doiResult) {
        doi = doiResult.doi;
        if (doiResult.metadata) {
          sources.push({
            source: doiResult.source as any,
            data: {
              ...doiResult.metadata,
              metadataSource: doiResult.source as any,
              doiVerified: true,
              crossrefMatched: doiResult.source === 'crossref',
              userOverridden: false,
              confidence: doiResult.confidence
            },
            confidence: doiResult.confidence
          });
        }
      }
    }
  }
  
  // Step 3: Fetch metadata from external sources
  if (doi && !opts.skipDOIValidation) {
    // Crossref
    if (opts.useCrossref) {
      const crossrefData = await fetchCrossrefByDOI(doi);
      if (crossrefData) {
        sources.push({
          source: 'crossref',
          data: crossrefData,
          confidence: 95
        });
      }
    }
    
    // OpenAlex
    if (opts.useOpenAlex) {
      const openalexData = await fetchOpenAlexByDOI(doi);
      if (openalexData) {
        sources.push({
          source: 'openalex',
          data: openalexData,
          confidence: 85
        });
      }
    }
    
    // Semantic Scholar
    if (opts.useSemanticScholar) {
      const semanticData = await fetchSemanticScholarByDOI(doi);
      if (semanticData) {
        sources.push({
          source: 'semantic_scholar',
          data: semanticData,
          confidence: 80
        });
      }
    }
  }
  
  // Step 4: Merge metadata
  const mergedMetadata = mergeMetadata(sources, {
    preferHigherConfidence: true,
    preferCrossref: true,
    preferUserInput: true
  });
  
  // Step 5: Normalize authors
  if (mergedMetadata.authors) {
    const normalizedAuthors = normalizeAuthors(mergedMetadata.authors);
    mergedMetadata.authors = normalizedAuthors.map(toCitationAuthor);
  }
  
  // Step 6: Create final citation
  const citation: CanonicalCitation = {
    id: mergedMetadata.id || `citation-${Date.now()}`,
    type: mergedMetadata.type || 'journal-article',
    title: mergedMetadata.title || '',
    authors: mergedMetadata.authors || [],
    year: mergedMetadata.year || 0,
    journal: mergedMetadata.journal,
    publisher: mergedMetadata.publisher,
    volume: mergedMetadata.volume,
    issue: mergedMetadata.issue,
    pages: mergedMetadata.pages,
    doi: mergedMetadata.doi,
    url: mergedMetadata.url,
    abstract: mergedMetadata.abstract,
    keywords: mergedMetadata.keywords || [],
    isbn: mergedMetadata.isbn,
    issn: mergedMetadata.issn,
    accessDate: mergedMetadata.accessDate,
    language: mergedMetadata.language || 'en',
    rawText: text,
    confidence: mergedMetadata.confidence || 0,
    doiVerified: mergedMetadata.doiVerified || false,
    crossrefMatched: mergedMetadata.crossrefMatched || false,
    userOverridden: mergedMetadata.userOverridden || false,
    metadataSource: mergedMetadata.metadataSource || 'parsed',
    createdAt: mergedMetadata.createdAt || new Date().toISOString(),
    updatedAt: mergedMetadata.updatedAt || new Date().toISOString()
  };
  
  // Step 7: Calculate confidence
  const confidence = calculateConfidence(citation);
  
  // Step 8: Validate
  const validation = await validateCitation(citation);
  
  // Step 9: Extract references if available
  let references: CanonicalCitation[] = [];
  const refSection = detectReferenceSection(text);
  if (refSection && refSection.references.length > 0) {
    const parsedRefs = batchParseReferences(refSection.references);
    references = parsedRefs.map(ref => ({
      ...ref,
      id: ref.id || `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ref.type || 'journal-article',
      title: ref.title || '',
      year: ref.year || 0,
      keywords: ref.keywords || [],
      authors: ref.authors || [],
      language: ref.language || 'en',
      metadataSource: ref.metadataSource || 'parsed',
      confidence: ref.confidence || 50,
      doiVerified: ref.doiVerified || false,
      crossrefMatched: ref.crossrefMatched || false,
      userOverridden: false,
      createdAt: ref.createdAt || new Date().toISOString(),
      updatedAt: ref.updatedAt || new Date().toISOString()
    }));
  }
  
  const processingTime = Date.now() - startTime;
  
  return {
    citation,
    sources,
    confidence,
    validation,
    references,
    processingTime
  };
}

/**
 * Extract title from text (fallback)
 */
function extractTitleFromText(text: string): string {
  const lines = text.split('\n').slice(0, 20);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 200 && !/^(abstract|keywords|introduction|doi|http|vol|issue|page|copyright|received|accepted)/i.test(trimmed)) {
      return trimmed;
    }
  }
  
  return '';
}

/**
 * Extract authors from text (fallback)
 */
function extractAuthorsFromText(text: string): Array<{ given: string; family: string }> {
  const lines = text.split('\n').slice(0, 30);
  
  for (const line of lines) {
    const trimmed = line.trim();
    const authorMatch = trimmed.match(/^([A-Z][a-z]+(?:,\s*[A-Z]\.?)+(?:\s*[,&]\s*[A-Z][a-z]+(?:,\s*[A-Z]\.?)+)*)/);
    if (authorMatch) {
      const parts = authorMatch[1].split(/,\s*&\s*|\s+&\s+|;\s*/);
      return parts.map(part => {
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
  }
  
  return [];
}

/**
 * Process multiple citations in batch
 */
export async function processCitationsBatch(
  files: File[],
  options: PipelineOptions = {}
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];
  
  for (const file of files) {
    try {
      const result = await processCitation(file, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      results.push({
        citation: {
          id: `error-${Date.now()}`,
          type: 'unknown',
          title: file.name,
          authors: [],
          year: 0,
          keywords: [],
          language: 'en',
          confidence: 0,
          doiVerified: false,
          crossrefMatched: false,
          userOverridden: false,
          metadataSource: 'parsed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        sources: [],
        confidence: { total: 0, level: 'low', label: 'Error' },
        validation: { isValid: false, confidence: 0, issues: [], suggestions: [], warnings: [] },
        processingTime: 0
      });
    }
  }
  
  return results;
}
