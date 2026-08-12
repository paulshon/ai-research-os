/**
 * Semantic Scholar Resolver - Complete Semantic Scholar API implementation
 * AI Research OS v22
 * 
 * Semantic Scholar provides AI-enhanced scholarly metadata
 * This resolver handles:
 * - DOI lookup
 * - Paper metadata
 * - Citation information
 * - Author information
 * - Related papers
 */

import { CanonicalCitation } from '../index';

export interface SemanticScholarPaper {
  paperId: string;
  externalIds?: {
    DOI?: string;
    PubMed?: string;
    PubMedCentral?: string;
    ArXiv?: string;
    DBLP?: string;
    Mag?: string;
    CorpusId?: number;
  };
  url?: string;
  title: string;
  abstract?: string;
  venue?: string;
  year?: number;
  publicationDate?: string;
  authors?: Array<{
    authorId: string;
    name: string;
  }>;
  journal?: {
    name: string;
    pages?: string;
    volume?: string;
  };
  citationCount?: number;
  influentialCitationCount?: number;
  publicationTypes?: string[];
  isOpenAccess?: boolean;
  openAccessPdf?: {
    url: string;
  };
  fieldsOfStudy?: string[];
  s2FieldsOfStudy?: Array<{
    category: string;
    description: string;
  }>;
  references?: Array<{
    paperId: string;
    title: string;
  }>;
  citations?: Array<{
    paperId: string;
    title: string;
  }>;
}

export interface SemanticScholarResponse {
  data: SemanticScholarPaper[];
  total: number;
  next?: string;
}

/**
 * Fetch metadata from Semantic Scholar by DOI
 */
export async function fetchSemanticScholarByDOI(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const fields = [
      'externalIds',
      'url',
      'title',
      'abstract',
      'venue',
      'year',
      'publicationDate',
      'authors',
      'journal',
      'citationCount',
      'influentialCitationCount',
      'publicationTypes',
      'isOpenAccess',
      'openAccessPdf',
      'fieldsOfStudy'
    ].join(',');

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${fields}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`DOI not found in Semantic Scholar: ${doi}`);
        return null;
      }
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }

    const paper: SemanticScholarPaper = await response.json();
    return parseSemanticScholarResponse(paper);
  } catch (error) {
    console.error('Semantic Scholar fetch error:', error);
    return null;
  }
}

/**
 * Parse Semantic Scholar response to CanonicalCitation
 */
export function parseSemanticScholarResponse(paper: SemanticScholarPaper): Partial<CanonicalCitation> {
  const authors = paper.authors?.map(a => {
    const nameParts = a.name.trim().split(/\s+/);
    const family = nameParts.pop() || '';
    const given = nameParts.join(' ');
    return {
      given,
      family
    };
  }) || [];

  const pages = paper.journal?.pages;
  const volume = paper.journal?.volume;

  return {
    doi: paper.externalIds?.DOI,
    title: paper.title,
    authors,
    year: paper.year || 0,
    journal: paper.venue || paper.journal?.name,
    volume,
    pages,
    abstract: paper.abstract,
    keywords: paper.fieldsOfStudy || [],
    url: paper.url || paper.openAccessPdf?.url,
    type: mapSemanticScholarType(paper.publicationTypes),
    language: 'en',
    metadataSource: 'semantic_scholar',
    doiVerified: true,
    crossrefMatched: false,
    confidence: 80
  };
}

/**
 * Map Semantic Scholar publication type to CitationType
 */
function mapSemanticScholarType(types?: string[]): import('../index').CitationType {
  if (!types || types.length === 0) return 'unknown';

  const typeStr = types.join(' ').toLowerCase();
  
  if (typeStr.includes('journal')) return 'journal-article';
  if (typeStr.includes('conference')) return 'conference-paper';
  if (typeStr.includes('book')) return 'book';
  if (typeStr.includes('thesis') || typeStr.includes('dissertation')) return 'thesis';
  if (typeStr.includes('report')) return 'report';
  if (typeStr.includes('dataset')) return 'dataset';
  if (typeStr.includes('preprint')) return 'preprint';

  return 'unknown';
}

/**
 * Search Semantic Scholar by query
 */
export async function searchSemanticScholar(query: {
  query: string;
  year?: string;
  venue?: string;
  fieldsOfStudy?: string;
  openAccessPdf?: boolean;
  limit?: number;
}): Promise<Partial<CanonicalCitation>[]> {
  try {
    const fields = [
      'externalIds',
      'url',
      'title',
      'abstract',
      'venue',
      'year',
      'authors',
      'journal',
      'citationCount',
      'publicationTypes',
      'isOpenAccess',
      'openAccessPdf',
      'fieldsOfStudy'
    ].join(',');

    const params = new URLSearchParams();
    params.append('query', query.query);
    params.append('fields', fields);
    params.append('limit', (query.limit || 5).toString());
    
    if (query.year) params.append('year', query.year);
    if (query.venue) params.append('venue', query.venue);
    if (query.fieldsOfStudy) params.append('fieldsOfStudy', query.fieldsOfStudy);
    if (query.openAccessPdf !== undefined) params.append('openAccessPdf', query.openAccessPdf.toString());

    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`);

    if (!response.ok) return [];

    const data: SemanticScholarResponse = await response.json();
    const papers = data.data || [];

    return papers.map(paper => parseSemanticScholarResponse(paper));
  } catch (error) {
    console.error('Semantic Scholar search error:', error);
    return [];
  }
}

/**
 * Get citation count from Semantic Scholar
 */
export async function getSemanticScholarCitationCount(doi: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=citationCount`
    );

    if (!response.ok) return 0;

    const paper: SemanticScholarPaper = await response.json();
    return paper.citationCount || 0;
  } catch {
    return 0;
  }
}

/**
 * Get recommendations from Semantic Scholar
 */
export async function getRecommendations(paperId: string, limit: number = 10): Promise<Partial<CanonicalCitation>[]> {
  try {
    const response = await fetch(
      `https://api.semanticscholar.org/recommendations/v1/papers/${paperId}/recommended?limit=${limit}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const recommendedPapers = data.recommendedPapers || [];

    return recommendedPapers.map((paper: any) => parseSemanticScholarResponse(paper.paper));
  } catch (error) {
    console.error('Semantic Scholar recommendations error:', error);
    return [];
  }
}

/**
 * Get author information from Semantic Scholar
 */
export async function getSemanticScholarAuthor(authorId: string): Promise<any> {
  try {
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/author/${authorId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
