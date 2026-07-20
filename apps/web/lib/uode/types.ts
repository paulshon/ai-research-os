/**
 * UODE — Unified Office Document Engine
 * AI Research OS v19
 *
 * 통합 오피스 문서 처리 엔진 — 타입 정의 레이어
 *
 * 설계 철학 (첨부 문서 기준):
 *   "문서를 여는 것"이 아니라 "문서를 이해하는 것"
 *   Visual Fidelity + Structural Understanding + Semantic Intelligence
 *
 * 처리 3계층:
 *   Visual Layer → Semantic Layer → AI Intelligence Layer
 *
 * 데이터 흐름:
 *   User Upload → Format Detection → Normalization → Rendering
 *   → Parsing → Layout Reconstruction → Semantic Chunking → AI Analysis
 */

// ══════════════════════════════════════════════════
// 1. 지원 포맷 정의
// ══════════════════════════════════════════════════

/** UODE가 처리하는 문서 포맷 */
export type DocumentFormat =
  | "pdf"
  | "docx"
  | "doc"
  | "xlsx"
  | "xls"
  | "csv"
  | "pptx"
  | "ppt"
  | "hwpx"
  | "hwp"
  | "txt"
  | "md"
  | "rtf"
  | "unknown";

/** 포맷 카테고리 (처리 엔진 분기용) */
export type FormatCategory =
  | "word" // 문단 기반 구조 문서
  | "spreadsheet" // 셀 기반 데이터 구조
  | "presentation" // 좌표 기반 Canvas
  | "hancom" // 복합 객체 기반 구조
  | "pdf" // 최종 렌더링 결과물
  | "plaintext" // 평문/마크다운
  | "unknown";

/** 처리 상태 */
export type ProcessingStage =
  | "detecting"
  | "normalizing"
  | "parsing"
  | "reconstructing"
  | "chunking"
  | "done"
  | "error";

// ══════════════════════════════════════════════════
// 2. 구조화 블록 모델 (Structural Reconstruction Layer)
// ══════════════════════════════════════════════════

export type BlockType =
  | "heading"
  | "paragraph"
  | "list-item"
  | "table"
  | "figure"
  | "caption"
  | "equation"
  | "code"
  | "slide"
  | "sheet"
  | "speaker-note"
  | "citation"
  | "reference"
  | "page-break"
  | "unknown";

/** 문서를 구성하는 의미 단위 블록 */
export interface DocumentBlock {
  /** 블록 고유 인덱스 */
  index: number;
  /** 블록 유형 */
  type: BlockType;
  /** 텍스트 내용 (원문 형식 보존) */
  text: string;
  /** heading 레벨 (1-6), 해당될 때만 */
  level?: number;
  /** 표 데이터 (행 × 열) */
  table?: string[][];
  /** 슬라이드/시트/페이지 번호 */
  page?: number;
  /** 추가 메타 (좌표, 폰트, 스타일 등) */
  meta?: Record<string, unknown>;
}

/** DocumentBlock 별칭 (UI 컴포넌트 가독성용) */
export type UODEBlock = DocumentBlock;

// ══════════════════════════════════════════════════
// 3. 정규화된 문서 객체 (Universal Normalization Layer)
// ══════════════════════════════════════════════════

/**
 * UODE 처리 결과 — 정규화된 통합 문서 객체.
 * 모든 포맷(DOC/XLS/PPT/HWP/PDF)이 이 단일 구조로 수렴한다.
 */
export interface UODEDocument {
  /** 원본 파일명 */
  fileName: string;
  /** 탐지된 포맷 */
  format: DocumentFormat;
  /** 포맷 카테고리 */
  category: FormatCategory;
  /** 추출 전체 텍스트 (원문 형식 보존 — reading order 기준) */
  text: string;
  /** 구조화 블록 목록 */
  blocks: DocumentBlock[];
  /** 감지된 언어 코드 (best-effort) */
  language: string;
  /** 페이지/슬라이드/시트 수 */
  pageCount: number;
  /** 단어 수 (대략) */
  wordCount: number;
  /** 문자 수 */
  charCount: number;
  /** OCR 필요 여부 (스캔 PDF 등) */
  needsOCR: boolean;
  /** 처리 신뢰도 0-100 */
  confidence: number;
  /** 처리 경고/노트 */
  notes: string[];
  /** 처리에 사용된 엔진명 */
  engine: string;
  /** SHA 유사 체크섬 (중복 탐지용, best-effort) */
  checksum: string;
  /** 처리 타임스탬프 */
  processedAt: string;
}

// ══════════════════════════════════════════════════
// 4. 진행 콜백
// ══════════════════════════════════════════════════

export interface UODEProgress {
  stage: ProcessingStage;
  message: string;
  /** 0-100, 알 수 없으면 -1 */
  percent: number;
}

export type UODEProgressCallback = (p: UODEProgress) => void;

// ══════════════════════════════════════════════════
// 5. 엔진 설정
// ══════════════════════════════════════════════════

export interface UODEOptions {
  /** 페이지/슬라이드 처리 상한 */
  maxPages?: number;
  /** 텍스트 길이 상한 (문자) */
  maxChars?: number;
  /** 진행 콜백 */
  onProgress?: UODEProgressCallback;
  /** 표를 블록으로 구조화할지 여부 */
  extractTables?: boolean;
}

export const UODE_DEFAULTS: Required<Omit<UODEOptions, "onProgress">> = {
  maxPages: 100,
  maxChars: 500_000,
  extractTables: true,
};
