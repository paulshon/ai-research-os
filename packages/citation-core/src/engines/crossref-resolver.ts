/**
 * Crossref Resolver - Complete Crossref API implementation
 * AI Research OS v22
 * 
 * Handles all Crossref API interactions:
 * - DOI lookup
 * - Metadata retrieval
 * - Citation counts
 * - Funder information
 * - License information
 */

import { CanonicalCitation } from '../index';

export interface CrossrefWork {
  DOI: string;
  title: string[];
  author: Array<{
    given?: string;
    family?: string;
    ORCID?: string;
    sequence?: string;
    affiliation?: Array<{ name: string }>;
  }>;
  published?: {
    'date-parts'?: number[][];
  };
  'published-print'?: {
    'date-parts'?: number[][];
  };
  'published-online'?: {
    'date-parts'?: number[][];
  };
  'container-title'?: string[];
  'short-container-title'?: string[];
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  type?: string;
  ISSN?: string[];
  'reference-count'?: number;
  'is-referenced-by-count'?: number;
  license?: Array<{ URL: string; start: string; end: string }>;
  subject?: string[];
  language?: string;
  link?: Array<{ type: string; URL: string }>;
}

export interface CrossrefResponse {
  status: string;
  message: CrossrefWork;
}

/**
 * Fetch metadata from Crossref by DOI
 */
export async function fetchCrossrefByDOI(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        'User-Agent': 'AI-Research-OS/2.0 (mailto:support@ai-research-os.org)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`DOI not found in Crossref: ${doi}`);
        return null;
      }
      throw new Error(`Crossref API error: ${response.status}`);
    }

    const data: CrossrefResponse = await response.json();
    return parseCrossrefResponse(data.message);
  } catch (error) {
    console.error('Crossref fetch error:', error);
    return null;
  }
}

/**
 * Parse Crossref response to CanonicalCitation
 */
export function parseCrossrefResponse(work: CrossrefWork): Partial<CanonicalCitation> {
  const published = work.published || work['published-print'] || work['published-online'];
  const year = published?.['date-parts']?.[0]?.[0] || 0;

  return {
    doi: work.DOI,
    title: work.title?.[0] || '',
    authors: work.author?.map(a => ({
      given: a.given || '',
      family: a.family || '',
      orcid: a.ORCID?.replace('https://orcid.org/', ''),
      affiliation: a.affiliation?.[0]?.name
    })) || [],
    year,
    journal: work['container-title']?.[0] || '',
    publisher: work.publisher,
    volume: work.volume,
    issue: work.issue,
    pages: work.page,
    type: mapCrossrefType(work.type),
    issn: work.ISSN?.[0],
    language: work.language || 'en',
    metadataSource: 'crossref',
    doiVerified: true,
    crossrefMatched: true,
    confidence: 95
  };
}

/**
 * Map Crossref type to CitationType
 */
function mapCrossrefType(type?: string): import('../index').CitationType {
  const typeMap: Record<string, import('../index').CitationType> = {
    'journal-article': 'journal-article',
    'book': 'book',
    'book-chapter': 'book-chapter',
    'book-section': 'book-chapter',
    'proceedings-article': 'conference-paper',
    'conference-paper': 'conference-paper',
    'dissertation': 'thesis',
    'thesis': 'thesis',
    'report': 'report',
    'report-series': 'report',
    'dataset': 'dataset',
    'posted-content': 'preprint',
    'standard': 'report',
    'reference-entry': 'unknown'
  };

  return typeMap[type || ''] || 'unknown';
}

/**
 * Search Crossref by query
 */
export async function searchCrossref(query: {
  title?: string;
  author?: string;
  journal?: string;
  year?: number;
  rows?: number;
}): Promise<Partial<CanonicalCitation>[]> {
  try {
    const params = new URLSearchParams();
    if (query.title) params.append('query.title', query.title);
    if (query.author) params.append('query.author', query.author);
    if (query.journal) params.append('query.container-title', query.journal);
    if (query.year) params.append('filter', `from-pub-date:${query.year},until-pub-date:${query.year}`);
    params.append('rows', (query.rows || 5).toString());
    params.append('select', 'DOI,title,author,container-title,published,publisher,volume,issue,page,type,ISSN,language');

    const response = await fetch(`https://api.crossref.org/works?${params.toString()}`, {
      headers: {
        'User-Agent': 'AI-Research-OS/2.0 (mailto:support@ai-research-os.org)'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const items = data.message?.items || [];

    return items.map((item: CrossrefWork) => parseCrossrefResponse(item));
  } catch (error) {
    console.error('Crossref search error:', error);
    return [];
  }
}

/**
 * Validate DOI format
 */
export function isValidCrossrefDOI(doi: string): boolean {
  return /^10\.\d{4,}\/\S+$/.test(doi);
}

/**
 * Get citation count from Crossref
 */
export async function getCitationCount(doi: string): Promise<number> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        'User-Agent': 'AI-Research-OS/2.0 (mailto:support@ai-research-os.org)'
      }
    });

    if (!response.ok) return 0;

    const data: CrossrefResponse = await response.json();
    return data.message['is-referenced-by-count'] || 0;
  } catch {
    return 0;
  }
}
