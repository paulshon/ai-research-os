/**
 * GROBID Engine - PDF to TEI XML conversion
 * AI Research OS v22
 * 
 * GROBID is a machine learning library for extracting information from scholarly documents
 * This engine handles PDF processing via GROBID FullText API
 */

export interface GROBIDConfig {
  baseUrl: string;
  timeout?: number;
}

export interface GROBIDResponse {
  status: string;
  tei?: string;
  error?: string;
}

export interface TEIMetadata {
  title?: string;
  authors?: Array<{
    given?: string;
    family?: string;
    orcid?: string;
  }>;
  abstract?: string;
  keywords?: string[];
  doi?: string;
  journal?: string;
  year?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  references?: string[];
}

/**
 * Parse TEI XML to extract structured metadata
 */
export function parseTEIXML(teiXml: string): TEIMetadata {
  const result: TEIMetadata = {
    references: []
  };

  // Extract title
  const titleMatch = teiXml.match(/<title[^>]*level="a"[^>]*>(.*?)<\/title>/is);
  if (titleMatch) {
    result.title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Extract authors
  const authorMatches = teiXml.matchAll(/<author[^>]*>[\s\S]*?<name[^>]*>[\s\S]*?<surname>(.*?)<\/surname>[\s\S]*?<forename[^>]*>(.*?)<\/forename>[\s\S]*?<\/name>[\s\S]*?<\/author>/gis);
  result.authors = [];
  for (const match of authorMatches) {
    result.authors.push({
      family: match[1]?.trim(),
      given: match[2]?.trim()
    });
  }

  // Extract abstract
  const abstractMatch = teiXml.match(/<abstract>[\s\S]*?<p>(.*?)<\/p>[\s\S]*?<\/abstract>/is);
  if (abstractMatch) {
    result.abstract = abstractMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Extract keywords
  const keywordsMatch = teiXml.match(/<keywords>[\s\S]*?<term>(.*?)<\/term>[\s\S]*?<\/keywords>/gis);
  if (keywordsMatch) {
    result.keywords = Array.from(keywordsMatch).map(m => m[1].trim());
  }

  // Extract DOI
  const doiMatch = teiXml.match(/<idno[^>]*type="DOI"[^>]*>(.*?)<\/idno>/is);
  if (doiMatch) {
    result.doi = doiMatch[1].trim();
  }

  // Extract journal
  const journalMatch = teiXml.match(/<title[^>]*level="j"[^>]*>(.*?)<\/title>/is);
  if (journalMatch) {
    result.journal = journalMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // Extract year
  const yearMatch = teiXml.match(/<date[^>]*when="(\d{4})"[^>]*>/is);
  if (yearMatch) {
    result.year = yearMatch[1];
  }

  // Extract volume
  const volumeMatch = teiXml.match(/<biblScope[^>]*unit="volume"[^>]*>(.*?)<\/biblScope>/is);
  if (volumeMatch) {
    result.volume = volumeMatch[1].trim();
  }

  // Extract issue
  const issueMatch = teiXml.match(/<biblScope[^>]*unit="issue"[^>]*>(.*?)<\/biblScope>/is);
  if (issueMatch) {
    result.issue = issueMatch[1].trim();
  }

  // Extract pages
  const pagesMatch = teiXml.match(/<biblScope[^>]*unit="page"[^>]*>(.*?)<\/biblScope>/is);
  if (pagesMatch) {
    result.pages = pagesMatch[1].trim();
  }

  // Extract references
  const refMatches = teiXml.matchAll(/<bibl[^>]*>[\s\S]*?<title[^>]*level="a"[^>]*>(.*?)<\/title>[\s\S]*?<\/bibl>/gis);
  result.references = [];
  for (const match of refMatches) {
    const refText = match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (refText.length > 20) {
      result.references.push(refText);
    }
  }

  return result;
}

/**
 * Process PDF through GROBID FullText API
 */
export async function processPDFWithGROBID(
  pdfFile: File,
  config: GROBIDConfig
): Promise<GROBIDResponse> {
  const formData = new FormData();
  formData.append('input', pdfFile);
  formData.append('consolidateHeader', '1');
  formData.append('consolidateCitations', '1');
  formData.append('includeRawCitations', '1');
  formData.append('includeRawAffiliations', '1');

  try {
    const response = await fetch(`${config.baseUrl}/api/processFulltextDocument`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(config.timeout || 60000)
    });

    if (!response.ok) {
      throw new Error(`GROBID API error: ${response.status} ${response.statusText}`);
    }

    const teiXml = await response.text();
    return {
      status: 'success',
      tei: teiXml
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if GROBID server is available
 */
export async function checkGROBIDHealth(config: GROBIDConfig): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/api/isalive`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Default GROBID configuration
 */
export const DEFAULT_GROBID_CONFIG: GROBIDConfig = {
  baseUrl: typeof window !== 'undefined' ? 'http://localhost:8070' : 'http://localhost:8070',
  timeout: 60000
};
