/**
 * PDF Layout Engine - Advanced PDF text extraction with layout awareness
 * AI Research OS v22
 * 
 * Handles complex PDF layouts:
 * - Multi-column layouts
 * - Tables and figures
 * - Headers and footers
 * - Marginalia
 * - Text flow reconstruction
 */

export interface PDFTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
}

export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  items: PDFTextItem[];
  columns: number;
  rotation: number;
}

export interface PDFDocument {
  pages: PDFPage[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  };
}

export interface TextExtractionOptions {
  preserveLayout: boolean;
  detectColumns: boolean;
  removeHeaders: boolean;
  removeFooters: boolean;
  removePageNumbers: boolean;
  extractTables: boolean;
}

/**
 * Extract text from PDF with layout awareness
 */
export async function extractPDFWithLayout(
  file: File,
  options: TextExtractionOptions = {
    preserveLayout: true,
    detectColumns: true,
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true,
    extractTables: false
  }
): Promise<string> {
  // This is a simplified implementation
  // In production, this would use pdf.js or pdfplumber
  const text = await extractPDFTextBasic(file);
  
  if (!options.preserveLayout) {
    return text;
  }
  
  return postProcessText(text, options);
}

/**
 * Basic PDF text extraction (fallback)
 */
async function extractPDFTextBasic(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          reject(new Error('PDF.js not loaded'));
          return;
        }
        
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(e.target!.result as ArrayBuffer)
        });
        const doc = await loadingTask.promise;
        
        let fullText = '';
        const pageLimit = Math.min(doc.numPages, 50);
        
        for (let i = 1; i <= pageLimit; i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          
          // Group text items by Y position to reconstruct lines
          const lineMap: Record<number, string> = {};
          tc.items.forEach((item: any) => {
            if (!item.str) return;
            const y = item.transform ? Math.round(item.transform[5]) : 0;
            lineMap[y] = (lineMap[y] || '') + item.str;
          });
          
          const sortedY = Object.keys(lineMap)
            .map(Number)
            .sort((a, b) => b - a);
          
          fullText += sortedY.map(y => lineMap[y]).join('\n') + '\n\n';
        }
        
        resolve(fullText.trim());
      } catch (err: any) {
        reject(new Error('PDF parsing error: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Post-process extracted text
 */
function postProcessText(text: string, options: TextExtractionOptions): string {
  let processed = text;
  
  if (options.removeHeaders) {
    processed = removeHeaders(processed);
  }
  
  if (options.removeFooters) {
    processed = removeFooters(processed);
  }
  
  if (options.removePageNumbers) {
    processed = removePageNumbers(processed);
  }
  
  if (options.detectColumns) {
    processed = handleMultiColumn(processed);
  }
  
  return processed;
}

/**
 * Remove headers from text
 */
function removeHeaders(text: string): string {
  const lines = text.split('\n');
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    // Skip common header patterns
    if (/^(page|p\.)?\s*\d+\s*$/i.test(trimmed)) return false;
    if (/^\d+\s*$/i.test(trimmed) && trimmed.length < 4) return false;
    return true;
  });
  return filtered.join('\n');
}

/**
 * Remove footers from text
 */
function removeFooters(text: string): string {
  // Similar to headers, but at the bottom
  // This is a simplified implementation
  return text;
}

/**
 * Remove page numbers
 */
function removePageNumbers(text: string): string {
  return text.replace(/^\s*\d+\s*$/gm, '');
}

/**
 * Handle multi-column layouts
 */
function handleMultiColumn(text: string): string {
  // This is a simplified implementation
  // In production, this would analyze column boundaries
  return text;
}

/**
 * Detect column layout in page
 */
export function detectColumns(items: PDFTextItem[], pageWidth: number): number {
  if (items.length === 0) return 1;
  
  // Get X positions
  const xPositions = items.map(item => item.x);
  const uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);
  
  // Look for gaps that indicate column boundaries
  const gaps: number[] = [];
  for (let i = 1; i < uniqueX.length; i++) {
    gaps.push(uniqueX[i] - uniqueX[i - 1]);
  }
  
  // Find significant gaps
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const significantGaps = gaps.filter(g => g > avgGap * 2);
  
  return Math.min(significantGaps.length + 1, 3);
}

/**
 * Extract tables from PDF
 */
export function extractTables(text: string): string[][] {
  const tables: string[][] = [];
  const lines = text.split('\n');
  
  let currentTable: string[] = [];
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect table by multiple tabs or consistent spacing
    const tabCount = (line.match(/\t/g) || []).length;
    const spaceGroups = line.match(/\s{3,}/g) || [];
    
    if (tabCount >= 2 || spaceGroups.length >= 2) {
      inTable = true;
      currentTable.push(trimmed);
    } else if (inTable) {
      // Table ended
      if (currentTable.length > 1) {
        tables.push(currentTable);
      }
      currentTable = [];
      inTable = false;
    }
  }
  
  // Add last table
  if (currentTable.length > 1) {
    tables.push(currentTable);
  }
  
  return tables;
}

/**
 * Extract figures and captions
 */
export function extractFigures(text: string): Array<{ number: string; caption: string }> {
  const figures: Array<{ number: string; caption: string }> = [];
  
  // Match figure patterns
  const figurePatterns = [
    /figure\s*(\d+)[\.:]\s*(.+?)(?=\n|$)/gi,
    /fig\.\s*(\d+)[\.:]\s*(.+?)(?=\n|$)/gi,
    /그림\s*(\d+)[\.:]\s*(.+?)(?=\n|$)/gi
  ];
  
  for (const pattern of figurePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      figures.push({
        number: match[1],
        caption: match[2].trim()
      });
    }
  }
  
  return figures;
}

/**
 * Extract section headers
 */
export function extractSectionHeaders(text: string): Array<{ level: number; title: string; lineNumber: number }> {
  const headers: Array<{ level: number; title: string; lineNumber: number }> = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect numbered sections
    const numberedMatch = line.match(/^(\d+)\.?\s+(.+)$/);
    if (numberedMatch) {
      headers.push({
        level: parseInt(numberedMatch[1]),
        title: numberedMatch[2],
        lineNumber: i
      });
      continue;
    }
    
    // Detect all-caps headers
    if (/^[A-Z\s]+$/.test(line) && line.length > 3 && line.length < 50) {
      headers.push({
        level: 1,
        title: line,
        lineNumber: i
      });
      continue;
    }
    
    // Detect bold-style headers (in markdown-like format)
    const boldMatch = line.match(/^#+\s+(.+)$/);
    if (boldMatch) {
      headers.push({
        level: boldMatch[0].length,
        title: boldMatch[1],
        lineNumber: i
      });
    }
  }
  
  return headers;
}

/**
 * Reconstruct text flow from layout
 */
export function reconstructTextFlow(pages: PDFPage[]): string {
  let fullText = '';
  
  for (const page of pages) {
    // Sort items by Y position (top to bottom)
    const sortedItems = [...page.items].sort((a, b) => b.y - a.y);
    
    // Group by Y position to form lines
    const lineMap: Record<number, PDFTextItem[]> = {};
    for (const item of sortedItems) {
      const y = Math.round(item.y);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push(item);
    }
    
    // Sort lines by Y position
    const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    
    // Sort items within each line by X position
    for (const y of sortedY) {
      lineMap[y].sort((a, b) => a.x - b.x);
    }
    
    // Join items into lines
    const lines = sortedY.map(y => lineMap[y].map(item => item.text).join(''));
    fullText += lines.join('\n') + '\n\n';
  }
  
  return fullText.trim();
}

/**
 * Validate PDF extraction quality
 */
export function validateExtraction(text: string): {
  quality: 'high' | 'medium' | 'low';
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for common extraction problems
  if (text.length < 100) {
    issues.push('추출된 텍스트가 너무 짧습니다');
  }
  
  // Check for excessive whitespace
  const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
  if (whitespaceRatio > 0.5) {
    issues.push('불필요한 공백이 많습니다');
  }
  
  // Check for broken words (hyphenation artifacts)
  const brokenWords = (text.match(/-\n/g) || []).length;
  if (brokenWords > 10) {
    issues.push('단어 분할이 많습니다');
  }
  
  // Determine quality
  let quality: 'high' | 'medium' | 'low' = 'high';
  if (issues.length >= 2) quality = 'low';
  else if (issues.length === 1) quality = 'medium';
  
  return { quality, issues };
}
