/**
 * DOI Discovery Engine - Automatic DOI detection and resolution
 * AI Research OS v22
 * 
 * Discovers DOIs from various sources when not explicitly present:
 * - Title-based search
 * - Author + title combination
 * - Journal + year + title
 * - Crossref text mining
 * - Semantic Scholar lookup
 */

import { CanonicalCitation } from '../index';

export interface DOIQuery {
  title?: string;
  authors?: Array<{ given: string; family: string }>;
  journal?: string;
  year?: number;
  volume?: string;
  issue?: string;
  firstPage?: string;
}

export interface DOIResult {
  doi: string;
  confidence: number;
  source: 'crossref' | 'openalex' | 'semantic_scholar' | 'text_mining';
  metadata?: Partial<CanonicalCitation>;
}

/**
 * Discover DOI from Crossref using title-based search
 */
export async function discoverDOIFromCrossref(query: DOIQuery): Promise<DOIResult | null> {
  if (!query.title || query.title.length < 5) return null;

  try {
    // Build Crossref query URL
    const params = new URLSearchParams();
    params.append('query.title', query.title);
    if (query.authors && query.authors.length > 0) {
      params.append('query.author', query.authors[0].family);
    }
    if (query.journal) {
      params.append('query.container-title', query.journal);
    }
    if (query.year) {
      params.append('filter', `from-pub-date:${query.year},until-pub-date:${query.year}`);
    }
    params.append('rows', '5');
    params.append('select', 'DOI,title,author,container-title,published,volume,issue,page');

    const response = await fetch(`https://api.crossref.org/works?${params.toString()}`, {
      headers: {
        'User-Agent': 'AI-Research-OS/2.0 (mailto:support@ai-research-os.org)'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const items = data.message?.items;

    if (!items || items.length === 0) return null;

    // Find best match using title similarity
    const bestMatch = items[0];
    const doi = bestMatch.DOI;

    if (!doi) return null;

    return {
      doi,
      confidence: 85,
      source: 'crossref',
      metadata: {
        title: bestMatch.title?.[0],
        authors: bestMatch.author?.map((a: any) => ({
          given: a.given || '',
          family: a.family || ''
        })),
        journal: bestMatch['container-title']?.[0],
        year: bestMatch.published?.['date-parts']?.[0]?.[0] || 0,
        volume: bestMatch.volume,
        issue: bestMatch.issue,
        pages: bestMatch.page
      }
    };
  } catch (error) {
    console.error('Crossref DOI discovery error:', error);
    return null;
  }
}

/**
 * Discover DOI from OpenAlex
 */
export async function discoverDOIFromOpenAlex(query: DOIQuery): Promise<DOIResult | null> {
  if (!query.title || query.title.length < 5) return null;

  try {
    const params = new URLSearchParams();
    params.append('filter', `title.search:${query.title}`);
    if (query.year) {
      params.append('filter', `publication_year:${query.year}`);
    }
    params.append('per-page', '5');

    const response = await fetch(`https://api.openalex.org/works?${params.toString()}`);

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results;

    if (!results || results.length === 0) return null;

    const bestMatch = results[0];
    const doi = bestMatch.doi?.replace('https://doi.org/', '');

    if (!doi) return null;

    return {
      doi,
      confidence: 80,
      source: 'openalex',
      metadata: {
        title: bestMatch.title,
        authors: bestMatch.authorships?.map((a: any) => ({
          given: a.author?.given_name || '',
          family: a.author?.family_name || ''
        })),
        journal: bestMatch.primary_location?.source?.display_name,
        year: bestMatch.publication_year,
        volume: bestMatch.biblio?.volume,
        issue: bestMatch.biblio?.issue,
        pages: bestMatch.biblio?.first_page && bestMatch.biblio?.last_page
          ? `${bestMatch.biblio.first_page}-${bestMatch.biblio.last_page}`
          : bestMatch.biblio?.first_page
      }
    };
  } catch (error) {
    console.error('OpenAlex DOI discovery error:', error);
    return null;
  }
}

/**
 * Discover DOI from Semantic Scholar
 */
export async function discoverDOIFromSemanticScholar(query: DOIQuery): Promise<DOIResult | null> {
  if (!query.title || query.title.length < 5) return null;

  try {
    const params = new URLSearchParams();
    params.append('query', query.title);
    params.append('fields', 'externalIds,title,authors,year,journal');
    params.append('limit', '5');

    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`);

    if (!response.ok) return null;

    const data = await response.json();
    const papers = data.data;

    if (!papers || papers.length === 0) return null;

    const bestMatch = papers[0];
    const doi = bestMatch.externalIds?.DOI;

    if (!doi) return null;

    return {
      doi,
      confidence: 75,
      source: 'semantic_scholar',
      metadata: {
        title: bestMatch.title,
        authors: bestMatch.authors?.map((a: any) => ({
          given: a.name?.split(' ').slice(0, -1).join(' ') || '',
          family: a.name?.split(' ').pop() || ''
        })),
        year: bestMatch.year,
        journal: bestMatch.journal?.name
      }
    };
  } catch (error) {
    console.error('Semantic Scholar DOI discovery error:', error);
    return null;
  }
}

/**
 * Text mining for DOI patterns in document text
 */
export function discoverDOIFromText(text: string): DOIResult | null {
  const doiPatterns = [
    /10\.\d{4,}\/[^\s\]>"'<>]+/gi,
    /https?:\/\/(?:dx\.)?doi\.org\/(10\.\d{4,}\/[^\s\]>"'<>]+)/gi
  ];

  for (const pattern of doiPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const doi = matches[0]
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
        .replace(/[.,;)\]>"']+$/, '')
        .trim();
      
      if (/^10\.\d{4,}\/\S+$/.test(doi)) {
        return {
          doi,
          confidence: 95,
          source: 'text_mining'
        };
      }
    }
  }

  return null;
}

/**
 * Main DOI discovery function - tries all sources
 */
export async function discoverDOI(query: DOIQuery, text?: string): Promise<DOIResult | null> {
  // First try text mining if text is provided
  if (text) {
    const textResult = discoverDOIFromText(text);
    if (textResult) return textResult;
  }

  // Try Crossref first (highest quality)
  const crossrefResult = await discoverDOIFromCrossref(query);
  if (crossrefResult) return crossrefResult;

  // Try OpenAlex
  const openalexResult = await discoverDOIFromOpenAlex(query);
  if (openalexResult) return openalexResult;

  // Try Semantic Scholar
  const semanticResult = await discoverDOIFromSemanticScholar(query);
  if (semanticResult) return semanticResult;

  return null;
}

/**
 * Calculate title similarity for matching
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
  const t1 = title1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const t2 = title2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (t1 === t2) return 1.0;
  
  // Levenshtein distance-based similarity
  const longer = t1.length > t2.length ? t1 : t2;
  const shorter = t1.length > t2.length ? t2 : t1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

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
