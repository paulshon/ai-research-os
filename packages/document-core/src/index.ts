/**
 * UODE — Unified Office Document Engine
 * AI Research OS v19
 *
 * 통합 오피스 문서 처리 엔진
 * 설계 철학:
 *   "문서를 여는 것"이 아니라 "문서를 이해하는 것"
 *
 * 3계층 처리:
 *   Visual Layer → Semantic Layer → AI Intelligence Layer
 *
 * IA 구조:
 *   Gateway Layer → File Detection → Conversion → Rendering
 *   → Parsing → OCR Recovery → Structural Reconstruction
 *   → Semantic Layer → Citation Layer → Embedding → AI Analysis
 *   → Knowledge Graph Layer
 */

// ══════════════════════════════════════════════════
// 1. 파일 형식 타입 정의
// ══════════════════════════════════════════════════

export type DocumentFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "xlsx"
  | "xls"
  | "pptx"
  | "ppt"
  | "hwp"
  | "hwpx"
  | "txt"
  | "md"
  | "unknown";

export type ProcessingLayer =
  | "gateway"
  | "detection"
  | "conversion"
  | "rendering"
  | "parsing"
  | "ocr"
  | "structural"
  | "semantic"
  | "citation"
  | "embedding"
  | "ai_analysis"
  | "knowledge_graph";

export type DocumentContentType =
  | "scholarly_article"
  | "thesis"
  | "report"
  | "presentation"
  | "spreadsheet"
  | "general_document"
  | "unknown";

export type OCRStatus = "not_needed" | "detected" | "processed" | "failed";

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

// ══════════════════════════════════════════════════
// 2. Gateway Layer — 파일 탐지 및 진입
// ══════════════════════════════════════════════════

export interface FileGatewayResult {
  /** 원본 파일명 */
  filename: string;
  /** 파일 크기 (bytes) */
  fileSize: number;
  /** 감지된 MIME 타입 */
  mimeType: string;
  /** 정규화된 포맷 */
  format: DocumentFormat;
  /** SHA-256 체크섬 */
  checksum: string;
  /** 중복 여부 */
  isDuplicate: boolean;
  /** OCR 필요 여부 */
  requiresOCR: boolean;
  /** 감지된 언어 */
  detectedLanguage: string;
  /** 게이트웨이 통과 타임스탬프 */
  gatewayTimestamp: string;
}

/**
 * MIME 타입 → DocumentFormat 매핑
 * File Detection Layer 핵심 매핑 테이블
 */
export const MIME_TO_FORMAT: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/x-hwp": "hwp",
  "application/haansofthwp": "hwp",
  "application/hwp": "hwp",
  "application/x-hwpx": "hwpx",
  "text/plain": "txt",
  "text/markdown": "md",
};

/**
 * 파일 확장자 → DocumentFormat 매핑 (MIME 탐지 실패 시 폴백)
 */
export const EXT_TO_FORMAT: Record<string, DocumentFormat> = {
  pdf: "pdf",
  docx: "docx",
  doc: "doc",
  xlsx: "xlsx",
  xls: "xls",
  pptx: "pptx",
  ppt: "ppt",
  hwp: "hwp",
  hwpx: "hwpx",
  txt: "txt",
  md: "md",
};

/**
 * 파일명/MIME 타입에서 DocumentFormat 탐지
 */
export function detectDocumentFormat(
  filename: string,
  mimeType?: string
): DocumentFormat {
  if (mimeType && MIME_TO_FORMAT[mimeType]) {
    return MIME_TO_FORMAT[mimeType];
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_FORMAT[ext] ?? "unknown";
}

/**
 * 지원 포맷 여부 확인
 */
export function isSupportedFormat(format: DocumentFormat): boolean {
  return format !== "unknown";
}

/**
 * 포맷별 처리 파이프라인 경로 반환
 * Conversion Layer 라우팅 로직
 */
export function getConversionPipeline(
  format: DocumentFormat
): ProcessingPipeline {
  switch (format) {
    case "pdf":
      return PDF_PIPELINE;
    case "docx":
    case "doc":
      return WORD_PIPELINE;
    case "xlsx":
    case "xls":
      return SPREADSHEET_PIPELINE;
    case "pptx":
    case "ppt":
      return PRESENTATION_PIPELINE;
    case "hwp":
    case "hwpx":
      return HANCOM_PIPELINE;
    default:
      return DEFAULT_PIPELINE;
  }
}

// ══════════════════════════════════════════════════
// 3. Processing Pipeline 정의
// ══════════════════════════════════════════════════

export interface ProcessingPipeline {
  format: DocumentFormat | DocumentFormat[];
  layers: ProcessingLayer[];
  primaryParser: string;
  renderEngine: string;
  ocrEngine: string;
  /** LibreOffice 변환 필요 여부 (DOC/XLS/PPT/HWP) */
  requiresLibreOffice: boolean;
  /** 구조 파싱 전략 */
  structureStrategy: "paragraph" | "cell" | "canvas" | "composite" | "pdf";
}

export const PDF_PIPELINE: ProcessingPipeline = {
  format: "pdf",
  layers: [
    "gateway", "detection", "rendering", "parsing",
    "ocr", "structural", "semantic", "citation",
    "embedding", "ai_analysis",
  ],
  primaryParser: "GROBID",         // TEI XML 출력
  renderEngine: "PyMuPDF",          // fitz
  ocrEngine: "PaddleOCR",
  requiresLibreOffice: false,
  structureStrategy: "pdf",
};

export const WORD_PIPELINE: ProcessingPipeline = {
  format: ["docx", "doc"],
  layers: [
    "gateway", "detection", "conversion", "rendering",
    "parsing", "structural", "semantic", "citation", "embedding", "ai_analysis",
  ],
  primaryParser: "python-docx",     // DOCX XML 파싱
  renderEngine: "LibreOffice→PyMuPDF",
  ocrEngine: "PaddleOCR",
  requiresLibreOffice: true,        // DOC→DOCX 변환 필요
  structureStrategy: "paragraph",
};

export const SPREADSHEET_PIPELINE: ProcessingPipeline = {
  format: ["xlsx", "xls"],
  layers: [
    "gateway", "detection", "conversion", "rendering",
    "parsing", "structural", "semantic", "embedding", "ai_analysis",
  ],
  primaryParser: "openpyxl",        // XLSX 셀 파싱
  renderEngine: "LibreOffice",
  ocrEngine: "PaddleOCR",
  requiresLibreOffice: true,        // XLS→XLSX 변환 필요
  structureStrategy: "cell",
};

export const PRESENTATION_PIPELINE: ProcessingPipeline = {
  format: ["pptx", "ppt"],
  layers: [
    "gateway", "detection", "conversion", "rendering",
    "parsing", "structural", "semantic", "embedding", "ai_analysis",
  ],
  primaryParser: "python-pptx",     // 슬라이드/도형 파싱
  renderEngine: "LibreOffice",
  ocrEngine: "PaddleOCR",
  requiresLibreOffice: true,        // PPT→PPTX 변환 필요
  structureStrategy: "canvas",
};

export const HANCOM_PIPELINE: ProcessingPipeline = {
  format: ["hwp", "hwpx"],
  layers: [
    "gateway", "detection", "conversion", "rendering",
    "parsing", "ocr", "structural", "semantic", "citation", "embedding", "ai_analysis",
  ],
  primaryParser: "lxml+zipfile",    // HWPX XML / HWP 바이너리
  renderEngine: "HWP→PDF→PyMuPDF",
  ocrEngine: "PaddleOCR",
  requiresLibreOffice: false,       // HWP Automation (win32com) 사용
  structureStrategy: "composite",
};

export const DEFAULT_PIPELINE: ProcessingPipeline = {
  format: "txt",
  layers: ["gateway", "detection", "parsing", "semantic", "embedding"],
  primaryParser: "plaintext",
  renderEngine: "none",
  ocrEngine: "none",
  requiresLibreOffice: false,
  structureStrategy: "paragraph",
};

// ══════════════════════════════════════════════════
// 4. Document Parsed Result — 공통 내부 표준 구조
// Universal Normalization Layer
// ══════════════════════════════════════════════════

export interface ParsedAuthor {
  given: string;
  family: string;
  fullName: string;
  orcid?: string;
  affiliation?: string;
}

export interface ParsedSection {
  id: string;
  type:
    | "title"
    | "abstract"
    | "introduction"
    | "methodology"
    | "results"
    | "discussion"
    | "conclusion"
    | "references"
    | "acknowledgments"
    | "appendix"
    | "body"
    | "unknown";
  heading?: string;
  content: string;
  pageNumber?: number;
  order: number;
}

export interface ParsedTable {
  id: string;
  caption?: string;
  headers: string[];
  rows: string[][];
  pageNumber?: number;
}

export interface ParsedFigure {
  id: string;
  caption?: string;
  altText?: string;
  pageNumber?: number;
  /** Base64 이미지 데이터 (옵션) */
  imageData?: string;
}

export interface ParsedReference {
  id: string;
  rawText: string;
  doi?: string;
  title?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  confidence: number;
}

/**
 * 모든 포맷의 파싱 결과를 통합하는 표준 문서 객체
 * Universal Normalization Layer의 핵심 타입
 */
export interface UniversalDocumentObject {
  /** 고유 문서 ID */
  id: string;
  /** 원본 파일명 */
  filename: string;
  /** 감지된 포맷 */
  format: DocumentFormat;
  /** 문서 콘텐츠 유형 */
  contentType: DocumentContentType;
  /** 문서 제목 */
  title: string;
  /** 저자 목록 */
  authors: ParsedAuthor[];
  /** 초록 */
  abstract?: string;
  /** 키워드 */
  keywords: string[];
  /** 섹션 목록 */
  sections: ParsedSection[];
  /** 표 목록 */
  tables: ParsedTable[];
  /** 그림 목록 */
  figures: ParsedFigure[];
  /** 참고문헌 목록 */
  references: ParsedReference[];
  /** 전체 원문 텍스트 */
  fullText: string;
  /** OCR 처리 상태 */
  ocrStatus: OCRStatus;
  /** 언어 코드 */
  language: string;
  /** 페이지 수 */
  pageCount?: number;
  /** 처리 신뢰도 (0-100) */
  confidence: number;
  /** GROBID TEI XML (PDF의 경우) */
  teiXml?: string;
  /** 처리 타임스탬프 */
  processedAt: string;
  /** 처리 파이프라인 로그 */
  pipelineLog: PipelineLogEntry[];
}

export interface PipelineLogEntry {
  layer: ProcessingLayer;
  status: "success" | "warning" | "error" | "skipped";
  message: string;
  duration_ms?: number;
  timestamp: string;
}

// ══════════════════════════════════════════════════
// 5. Layout Analysis Layer
// 컬럼/폰트/블록 분석
// ══════════════════════════════════════════════════

export interface LayoutAnalysisResult {
  /** 단 수 (1단 / 2단) */
  columnCount: 1 | 2;
  /** 단 분석 신뢰도 */
  columnConfidence: number;
  /** 헤더/푸터 감지 여부 */
  hasRunningHeader: boolean;
  hasPageNumbers: boolean;
  /** 각주 존재 여부 */
  hasFootnotes: boolean;
  /** 평균 폰트 크기 (pt) */
  avgFontSize: number;
  /** 주요 폰트 패밀리 */
  primaryFont: string;
  /** 읽기 순서 (LTR/RTL) */
  readingOrder: "LTR" | "RTL";
  /** 표 감지 개수 */
  tableCount: number;
  /** 그림 감지 개수 */
  figureCount: number;
}

// ══════════════════════════════════════════════════
// 6. Word Engine 구조 분석 타입
// ══════════════════════════════════════════════════

export interface WordEngineResult {
  /** 단락 목록 */
  paragraphs: WordParagraph[];
  /** 표 목록 */
  tables: ParsedTable[];
  /** 각주 목록 */
  footnotes: string[];
  /** 미주 목록 */
  endnotes: string[];
  /** 스타일 맵 */
  styleMap: Record<string, string>;
}

export interface WordParagraph {
  id: string;
  style: string;
  text: string;
  level: number;
  isHeading: boolean;
  indentation: number;
}

// ══════════════════════════════════════════════════
// 7. Spreadsheet Engine 타입
// ══════════════════════════════════════════════════

export interface SpreadsheetEngineResult {
  /** 시트 목록 */
  sheets: SheetData[];
  /** 활성 시트 인덱스 */
  activeSheetIndex: number;
}

export interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
  headers: string[];
  /** 수식 맵 (셀 주소 → 수식) */
  formulas: Record<string, string>;
  /** 차트 수 */
  chartCount: number;
  /** 피벗 테이블 수 */
  pivotCount: number;
  mergedCells: string[];
}

// ══════════════════════════════════════════════════
// 8. Presentation Engine 타입
// ══════════════════════════════════════════════════

export interface PresentationEngineResult {
  /** 슬라이드 목록 */
  slides: SlideData[];
  /** 발표자 노트 목록 */
  speakerNotes: string[];
  /** 슬라이드 수 */
  slideCount: number;
}

export interface SlideData {
  index: number;
  title?: string;
  /** 텍스트 박스 내용 목록 */
  textBoxes: string[];
  /** 도형 수 */
  shapeCount: number;
  /** 이미지 수 */
  imageCount: number;
  /** 차트 수 */
  chartCount: number;
  /** 발표자 노트 */
  speakerNote?: string;
  /** SmartArt 여부 */
  hasSmartArt: boolean;
}

// ══════════════════════════════════════════════════
// 9. Semantic Chunking Layer
// ══════════════════════════════════════════════════

export interface SemanticChunk {
  id: string;
  documentId: string;
  content: string;
  /** 섹션 타입 컨텍스트 */
  sectionType: ParsedSection["type"];
  /** 청크 순서 */
  order: number;
  /** 토큰 수 (추정) */
  tokenCount: number;
  /** 임베딩 벡터 (pgvector 저장용) */
  embedding?: number[];
  /** 관련 인용 ID 목록 */
  citationIds: string[];
}

/**
 * 텍스트를 의미 청크로 분할
 * 기본 전략: 문단 기반, 최대 512 토큰
 */
export function chunkDocumentText(
  text: string,
  sectionType: ParsedSection["type"] = "body",
  documentId: string = "",
  maxTokens = 512
): SemanticChunk[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const chunks: SemanticChunk[] = [];
  let buffer = "";
  let order = 0;

  for (const para of paragraphs) {
    const estimatedTokens = Math.ceil((buffer + para).length / 4);
    if (estimatedTokens > maxTokens && buffer.length > 0) {
      chunks.push({
        id: `${documentId}-chunk-${order}`,
        documentId,
        content: buffer.trim(),
        sectionType,
        order: order++,
        tokenCount: Math.ceil(buffer.length / 4),
        citationIds: [],
      });
      buffer = para + "\n\n";
    } else {
      buffer += para + "\n\n";
    }
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      id: `${documentId}-chunk-${order}`,
      documentId,
      content: buffer.trim(),
      sectionType,
      order,
      tokenCount: Math.ceil(buffer.length / 4),
      citationIds: [],
    });
  }

  return chunks;
}

// ══════════════════════════════════════════════════
// 10. OCR Recovery Layer
// ══════════════════════════════════════════════════

export interface OCRResult {
  pageIndex: number;
  text: string;
  confidence: number;
  /** 스캔 품질 (DPI 추정) */
  estimatedDPI?: number;
  /** 기울어짐 보정 여부 */
  deskewed: boolean;
}

export interface OCRDetectionResult {
  /** OCR 필요 여부 */
  requiresOCR: boolean;
  /** 스캔된 페이지 인덱스 목록 */
  scannedPages: number[];
  /** 전체 페이지 중 텍스트 레이어 없는 비율 */
  textLayerCoverage: number;
}

// ══════════════════════════════════════════════════
// 11. AI Analysis Layer 프롬프트 빌더
// ══════════════════════════════════════════════════

export interface UODEAnalysisRequest {
  document: UniversalDocumentObject;
  analysisType:
    | "full_analysis"    // 논문 전체 분석 (논문분석 메뉴)
    | "micro_structure"  // 미시구조 분석
    | "sentence_analysis"// 문장별 분석
    | "bert_validation"  // BERT 검증
    | "improvement"      // 개선 제안
    | "critique"         // 논문 크리틱 (논문크리틱 메뉴)
    | "citation_extract";// 참고문헌 추출
  targetSections?: string[];
  language?: "ko" | "en" | "zh";
}

/**
 * UODE 분석 요청에서 AI 프롬프트 생성
 * 문서 포맷에 무관하게 동일한 분석 인터페이스 제공
 */
export function buildUODEAnalysisPrompt(req: UODEAnalysisRequest): string {
  const { document, analysisType } = req;

  const docMeta = `
[문서 정보]
- 제목: ${document.title || "제목 미상"}
- 포맷: ${document.format.toUpperCase()}
- 저자: ${document.authors.map((a) => a.fullName).join(", ") || "저자 미상"}
- 언어: ${document.language}
- 신뢰도: ${document.confidence}%
- OCR 상태: ${document.ocrStatus}
- 섹션 수: ${document.sections.length}
- 참고문헌 수: ${document.references.length}
`;

  const docContent = document.sections
    .slice(0, 10) // 처음 10섹션만 포함 (토큰 절약)
    .map((s) => `[${s.type.toUpperCase()}]\n${s.content.substring(0, 800)}`)
    .join("\n\n---\n\n");

  switch (analysisType) {
    case "full_analysis":
      return `${docMeta}\n다음 문서를 전체 분석하라:\n\n${docContent}`;
    case "micro_structure":
      return `${docMeta}\n다음 문서의 미시구조(각 문단의 논리 흐름, 문장 전환, 논증 패턴)를 분석하라:\n\n${docContent}`;
    case "critique":
      return `${docMeta}\n다음 문서를 심층 첨삭하라. 각 섹션별 주석(annotation)을 작성하라:\n\n${docContent}`;
    case "citation_extract":
      return `${docMeta}\n다음 문서에서 모든 참고문헌을 추출하고 DOI를 식별하라:\n\n${
        document.references.map((r) => r.rawText).join("\n")
      }`;
    default:
      return `${docMeta}\n다음 문서를 분석하라:\n\n${docContent}`;
  }
}

// ══════════════════════════════════════════════════
// 12. 포맷별 지원 기능 매트릭스
// ══════════════════════════════════════════════════

export interface FormatCapabilities {
  /** 전체 텍스트 추출 */
  textExtraction: boolean;
  /** 구조 파싱 */
  structureParsing: boolean;
  /** 참고문헌 추출 */
  referenceExtraction: boolean;
  /** OCR 지원 */
  ocrSupport: boolean;
  /** 표 추출 */
  tableExtraction: boolean;
  /** 이미지 추출 */
  imageExtraction: boolean;
  /** DOI 탐지 */
  doiDetection: boolean;
  /** GROBID 사용 가능 */
  grobidSupport: boolean;
  /** LibreOffice 변환 필요 */
  requiresConversion: boolean;
}

export const FORMAT_CAPABILITIES: Record<DocumentFormat, FormatCapabilities> = {
  pdf: {
    textExtraction: true, structureParsing: true, referenceExtraction: true,
    ocrSupport: true, tableExtraction: true, imageExtraction: true,
    doiDetection: true, grobidSupport: true, requiresConversion: false,
  },
  docx: {
    textExtraction: true, structureParsing: true, referenceExtraction: true,
    ocrSupport: false, tableExtraction: true, imageExtraction: true,
    doiDetection: true, grobidSupport: false, requiresConversion: false,
  },
  doc: {
    textExtraction: true, structureParsing: true, referenceExtraction: false,
    ocrSupport: false, tableExtraction: true, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: true,
  },
  xlsx: {
    textExtraction: true, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: true, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
  xls: {
    textExtraction: true, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: true, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: true,
  },
  pptx: {
    textExtraction: true, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: true, imageExtraction: true,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
  ppt: {
    textExtraction: true, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: false, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: true,
  },
  hwp: {
    textExtraction: true, structureParsing: true, referenceExtraction: false,
    ocrSupport: true, tableExtraction: true, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: true,
  },
  hwpx: {
    textExtraction: true, structureParsing: true, referenceExtraction: false,
    ocrSupport: true, tableExtraction: true, imageExtraction: true,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
  txt: {
    textExtraction: true, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: false, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
  md: {
    textExtraction: true, structureParsing: true, referenceExtraction: false,
    ocrSupport: false, tableExtraction: false, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
  unknown: {
    textExtraction: false, structureParsing: false, referenceExtraction: false,
    ocrSupport: false, tableExtraction: false, imageExtraction: false,
    doiDetection: false, grobidSupport: false, requiresConversion: false,
  },
};

// ══════════════════════════════════════════════════
// 13. 파일 업로드 UI 지원 — 허용 MIME / 확장자 목록
// ══════════════════════════════════════════════════

/** 논문분석 메뉴 허용 포맷 */
export const PAPER_ANALYSIS_ACCEPTED_FORMATS: DocumentFormat[] = [
  "pdf", "docx", "doc", "hwp", "hwpx", "txt", "md",
];

/** 논문크리틱 메뉴 허용 포맷 */
export const PAPER_CRITIQUE_ACCEPTED_FORMATS: DocumentFormat[] = [
  "pdf", "docx", "doc", "hwp", "hwpx", "txt",
];

/** 참고문헌 인용 메뉴 허용 포맷 */
export const CITATION_ACCEPTED_FORMATS: DocumentFormat[] = [
  "pdf", "docx", "doc", "hwp", "hwpx",
];

/**
 * accept 속성용 MIME 문자열 생성
 * <input accept={buildAcceptString(PAPER_ANALYSIS_ACCEPTED_FORMATS)} />
 */
export function buildAcceptString(formats: DocumentFormat[]): string {
  const mimeEntries = Object.entries(MIME_TO_FORMAT)
    .filter(([, fmt]) => formats.includes(fmt))
    .map(([mime]) => mime);
  const extEntries = formats.map((f) => `.${f}`);
  return [...new Set([...mimeEntries, ...extEntries])].join(",");
}

/**
 * 포맷 표시 레이블
 */
export const FORMAT_LABELS: Record<DocumentFormat, string> = {
  pdf: "PDF",
  docx: "Word (DOCX)",
  doc: "Word (DOC)",
  xlsx: "Excel (XLSX)",
  xls: "Excel (XLS)",
  pptx: "PowerPoint (PPTX)",
  ppt: "PowerPoint (PPT)",
  hwp: "한글 (HWP)",
  hwpx: "한글 (HWPX)",
  txt: "텍스트 (TXT)",
  md: "마크다운 (MD)",
  unknown: "알 수 없는 형식",
};

// ══════════════════════════════════════════════════
// 14. 처리 상태 관리
// ══════════════════════════════════════════════════

export type UODEProcessingStatus =
  | "idle"
  | "uploading"
  | "detecting"
  | "converting"
  | "parsing"
  | "ocr_processing"
  | "reconstructing"
  | "chunking"
  | "embedding"
  | "analyzing"
  | "complete"
  | "error";

export interface UODEProcessingState {
  status: UODEProcessingStatus;
  format?: DocumentFormat;
  pipeline?: ProcessingPipeline;
  progress: number;         // 0-100
  currentLayer?: ProcessingLayer;
  result?: UniversalDocumentObject;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export const UODE_STATUS_LABELS: Record<UODEProcessingStatus, string> = {
  idle: "대기 중",
  uploading: "업로드 중...",
  detecting: "파일 형식 탐지 중...",
  converting: "포맷 변환 중...",
  parsing: "문서 파싱 중...",
  ocr_processing: "OCR 처리 중...",
  reconstructing: "구조 재구성 중...",
  chunking: "의미 청킹 중...",
  embedding: "임베딩 생성 중...",
  analyzing: "AI 분석 중...",
  complete: "처리 완료",
  error: "오류 발생",
};

// ══════════════════════════════════════════════════
// 15. 클라이언트 사이드 파싱 유틸 (브라우저 환경)
// ══════════════════════════════════════════════════

/**
 * 브라우저에서 파일 객체로부터 기본 메타데이터 추출
 * 실제 파싱은 API 서버(GROBID, python-docx 등)에서 수행
 */
export function extractClientSideMetadata(file: File): {
  filename: string;
  fileSize: number;
  mimeType: string;
  format: DocumentFormat;
  lastModified: string;
} {
  return {
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type,
    format: detectDocumentFormat(file.name, file.type),
    lastModified: new Date(file.lastModified).toISOString(),
  };
}

/**
 * 파일 크기 포맷 (UI 표시용)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 지원 포맷 아이콘 반환 (이모지 기반)
 */
export function getFormatIcon(format: DocumentFormat): string {
  const icons: Record<DocumentFormat, string> = {
    pdf: "📄", docx: "📝", doc: "📝",
    xlsx: "📊", xls: "📊", pptx: "📽️", ppt: "📽️",
    hwp: "🇰🇷", hwpx: "🇰🇷", txt: "📃", md: "📋", unknown: "❓",
  };
  return icons[format];
}
