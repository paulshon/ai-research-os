/**
 * OpenAlex Resolver - Complete OpenAlex API implementation
 * AI Research OS v22
 * 
 * OpenAlex is an open catalog of the global research system
 * This resolver handles:
 * - DOI lookup
 * - Metadata retrieval
 * - Citation counts
 * - Author information
 * - Institution information
 */

import { CanonicalCitation } from '../index';

export interface OpenAlexWork {
  id: string;
  title: string;
  publication_year: number;
  primary_location?: {
    source?: {
      id: string;
      display_name: string;
      issn?: string[];
      type?: string;
    };
  };
  authorships: Array<{
    author: {
      id: string;
      display_name: string;
      orcid?: string;
    };
    institutions?: Array<{
      display_name: string;
    }>;
  }>;
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  ids?: {
    doi?: string;
    pmid?: string;
    pmcid?: string;
    mag?: string;
  };
  type?: string;
  language?: string;
  cited_by_count?: number;
  concepts?: Array<{
    display_name: string;
    score: number;
  }>;
}

export interface OpenAlexResponse {
  meta: {
    count: number;
    response_id: string;
  };
  results: OpenAlexWork[];
}

/**
 * Fetch metadata from OpenAlex by DOI
 */
export async function fetchOpenAlexByDOI(doi: string): Promise<Partial<CanonicalCitation> | null> {
  try {
    const formattedDOI = doi.startsWith('https://doi.org/') ? doi : `https://doi.org/${doi}`;
    const response = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`DOI not found in OpenAlex: ${doi}`);
        return null;
      }
      throw new Error(`OpenAlex API error: ${response.status}`);
    }

    const work: OpenAlexWork = await response.json();
    return parseOpenAlexResponse(work);
  } catch (error) {
    console.error('OpenAlex fetch error:', error);
    return null;
  }
}

/**
 * Parse OpenAlex response to CanonicalCitation
 */
export function parseOpenAlexResponse(work: OpenAlexWork): Partial<CanonicalCitation> {
  const pages = work.biblio?.first_page && work.biblio?.last_page
    ? `${work.biblio.first_page}-${work.biblio.last_page}`
    : work.biblio?.first_page;

  const authors = work.authorships?.map(a => {
    const nameParts = a.author.display_name.trim().split(/\s+/);
    const family = nameParts.pop() || '';
    const given = nameParts.join(' ');
    return {
      given,
      family,
      orcid: a.author.orcid?.replace('https://orcid.org/', ''),
      affiliation: a.institutions?.[0]?.display_name
    };
  }) || [];

  return {
    doi: work.ids?.doi?.replace('https://doi.org/', ''),
    title: work.title,
    authors,
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name,
    volume: work.biblio?.volume,
    issue: work.biblio?.issue,
    pages,
    type: mapOpenAlexType(work.type),
    issn: work.primary_location?.source?.issn?.[0],
    language: work.language || 'en',
    metadataSource: 'openalex',
    doiVerified: true,
    crossrefMatched: false,
    confidence: 85
  };
}

/**
 * Map OpenAlex type to CitationType
 */
function mapOpenAlexType(type?: string): import('../index').CitationType {
  const typeMap: Record<string, import('../index').CitationType> = {
    'article': 'journal-article',
    'journal-article': 'journal-article',
    'book': 'book',
    'book-chapter': 'book-chapter',
    'conference-paper': 'conference-paper',
    'dissertation': 'thesis',
    'thesis': 'thesis',
    'report': 'report',
    'dataset': 'dataset',
    'preprint': 'preprint',
    'posted-content': 'preprint'
  };

  return typeMap[type || ''] || 'unknown';
}

/**
 * Search OpenAlex by query
 */
export async function searchOpenAlex(query: {
  title?: string;
  author?: string;
  journal?: string;
  year?: number;
  perPage?: number;
}): Promise<Partial<CanonicalCitation>[]> {
  try {
    const params = new URLSearchParams();
    
    if (query.title) {
      params.append('filter', `title.search:${query.title}`);
    }
    if (query.author) {
      params.append('filter', `author.search:${query.author}`);
    }
    if (query.journal) {
      params.append('filter', `primary_location.source.display_name.search:${query.journal}`);
    }
    if (query.year) {
      params.append('filter', `publication_year:${query.year}`);
    }
    params.append('per-page', (query.perPage || 5).toString());

    const response = await fetch(`https://api.openalex.org/works?${params.toString()}`);

    if (!response.ok) return [];

    const data: OpenAlexResponse = await response.json();
    const results = data.results || [];

    return results.map(work => parseOpenAlexResponse(work));
  } catch (error) {
    console.error('OpenAlex search error:', error);
    return [];
  }
}

/**
 * Get citation count from OpenAlex
 */
export async function getOpenAlexCitationCount(doi: string): Promise<number> {
  try {
    const formattedDOI = doi.startsWith('https://doi.org/') ? doi : `https://doi.org/${doi}`;
    const response = await fetch(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`);

    if (!response.ok) return 0;

    const work: OpenAlexWork = await response.json();
    return work.cited_by_count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get author information from OpenAlex
 */
export async function getOpenAlexAuthor(authorId: string): Promise<any> {
  try {
    const response = await fetch(`https://api.openalex.org/authors/${authorId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get works by author from OpenAlex
 */
export async function getWorksByAuthor(authorId: string, perPage: number = 20): Promise<Partial<CanonicalCitation>[]> {
  try {
    const response = await fetch(`https://api.openalex.org/works?filter=author.id:${authorId}&per-page=${perPage}`);
    if (!response.ok) return [];
    const data: OpenAlexResponse = await response.json();
    return data.results.map(work => parseOpenAlexResponse(work));
  } catch {
    return [];
  }
}
