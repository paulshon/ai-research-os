/** Serializable critique page state for project temp/disk save */

export interface CritiqueCardDraft {
  id: string;
  num: number;
  type: string;
  text: string;
  note: string;
  editNote: string;
  status: "open" | "in-revision" | "resubmitted" | "approved";
  pageNum?: number;
}

export interface CritiquePdfPageDraft {
  pageNum: number;
  dataUrl: string;
  text: string;
}

/** UODE 추출 블록 (PDF 외 포맷의 원문 재현용) */
export interface CritiqueUodeBlockDraft {
  index: number;
  type: string;
  text: string;
  level?: number;
  table?: string[][];
  page?: number;
}

export interface CritiqueDraft {
  version: 2;
  fileName: string;
  docText: string;
  cards: CritiqueCardDraft[];
  activeType: string;
  filter: string;
  fontSize: number;
  isPdf: boolean;
  pdfPages: CritiquePdfPageDraft[];
  /** Original PDF bytes (base64) — restores preview if thumbnails omitted */
  pdfBase64: string | null;
  revealedLines: number;
  /** UODE 추출 블록 (DOCX/XLSX/PPTX/HWP 등 원문 형식 재현) */
  uodeBlocks?: CritiqueUodeBlockDraft[];
  /** UODE 추출 메타 요약 (형식·글자수·신뢰도) */
  uodeMeta?: string;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    // spread(...) 대신 루프로 누적 — 400p 이상 대용량 PDF에서 콜스택 초과 방지
    for (let j = 0; j < sub.length; j++) {
      binary += String.fromCharCode(sub[j]);
    }
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Drop image dataUrls but keep text + source PDF for localStorage quota */
export function slimCritiqueDraftForStorage(draft: CritiqueDraft): CritiqueDraft {
  // 1단계: 페이지 썸네일 이미지(dataUrl) 제거 — 텍스트/원본 PDF는 유지
  return {
    ...draft,
    pdfPages: draft.pdfPages.map((p) => ({ ...p, dataUrl: "" })),
  };
}

/** Most aggressive slim: drop page images AND original PDF bytes (400페이지 대용량 PDF용) */
export function minimalCritiqueDraftForStorage(draft: CritiqueDraft): CritiqueDraft {
  return {
    ...draft,
    pdfPages: draft.pdfPages.map((p) => ({ pageNum: p.pageNum, dataUrl: "", text: p.text })),
    pdfBase64: null,
  };
}

export function isCritiqueDraft(data: unknown): data is CritiqueDraft {
  return typeof data === "object" && data !== null && "cards" in data;
}

/** Normalize legacy drafts (v1 without pdfPages) */
export function normalizeCritiqueDraft(data: unknown): Partial<CritiqueDraft> {
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;
  return {
    version: 2,
    fileName: typeof d.fileName === "string" ? d.fileName : "",
    docText: typeof d.docText === "string" ? d.docText : "",
    cards: Array.isArray(d.cards) ? (d.cards as CritiqueCardDraft[]) : [],
    activeType: typeof d.activeType === "string" ? d.activeType : "logic",
    filter: typeof d.filter === "string" ? d.filter : "all",
    fontSize: typeof d.fontSize === "number" ? d.fontSize : 13,
    isPdf: Boolean(d.isPdf),
    pdfPages: Array.isArray(d.pdfPages) ? (d.pdfPages as CritiquePdfPageDraft[]) : [],
    pdfBase64: typeof d.pdfBase64 === "string" ? d.pdfBase64 : null,
    revealedLines: typeof d.revealedLines === "number" ? d.revealedLines : 0,
    uodeBlocks: Array.isArray(d.uodeBlocks)
      ? (d.uodeBlocks as CritiqueUodeBlockDraft[])
      : undefined,
    uodeMeta: typeof d.uodeMeta === "string" ? d.uodeMeta : undefined,
  };
}
