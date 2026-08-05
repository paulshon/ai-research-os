/**
 * UODE — Engine Orchestrator
 *
 * 단일 진입점 processDocument(): 모든 포맷을 정규화된 UODEDocument로 수렴.
 *
 *   User Upload
 *     → detectFormat (File Detection Layer)
 *     → format-specific extractor (Parsing Layer)
 *     → normalize (Universal Normalization Layer)
 *     → UODEDocument
 */

import {
  UODEDocument,
  UODEOptions,
  UODE_DEFAULTS,
  DocumentFormat,
} from "./types";
import { detectFormat, categoryOf, formatLabel } from "./detect";
import {
  extractPdf,
  extractDocx,
  extractXlsx,
  extractCsv,
  extractPptx,
  extractHwpx,
  extractHwp,
  extractPlain,
  ExtractResult,
} from "./extractors";

/** 지원되는(텍스트 추출 가능) 파일인지 확장자 기준 빠른 판별 */
export function isSupportedFile(fileName: string): boolean {
  return /\.(pdf|docx?|xlsx?|xlsm|csv|tsv|pptx?|hwpx?|txt|md|markdown|rtf)$/i.test(
    fileName
  );
}

/** UODE가 허용하는 input accept 문자열 */
export const UODE_ACCEPT =
  ".pdf,.docx,.doc,.xlsx,.xls,.xlsm,.csv,.tsv,.pptx,.ppt,.hwpx,.hwp,.txt,.md,.rtf";

/** best-effort 언어 감지 */
function detectLanguage(text: string): string {
  const sample = text.slice(0, 4000);
  const ko = (sample.match(/[가-힣]/g) || []).length;
  const ja = (sample.match(/[ぁ-んァ-ン]/g) || []).length;
  const zh = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (sample.match(/[a-zA-Z]/g) || []).length;
  const max = Math.max(ko, ja, zh, en);
  if (max === 0) return "unknown";
  if (max === ko) return "ko";
  if (max === ja) return "ja";
  if (max === zh) return "zh";
  return "en";
}

/** 경량 체크섬 (중복 탐지용, 암호학적 아님) */
function quickChecksum(fileName: string, size: number, text: string): string {
  let h = 2166136261 >>> 0;
  const probe = fileName + "|" + size + "|" + text.slice(0, 2000);
  for (let i = 0; i < probe.length; i++) {
    h ^= probe.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function wordCountOf(text: string): number {
  // 한글: 공백 기준 + CJK 문자 카운트 혼합
  const cjk = (text.match(/[\u3040-\u9fff가-힣]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return latin + cjk;
}

function dispatch(
  format: DocumentFormat,
  file: File,
  opts: Required<Omit<UODEOptions, "onProgress">> & {
    onPage?: (c: number, t: number) => void;
  }
): Promise<ExtractResult> {
  switch (format) {
    case "pdf":
      return extractPdf(file, opts.maxPages, opts.onPage);
    case "docx":
      return extractDocx(file);
    case "doc":
      // 구형 DOC: 브라우저 단독 추출 한계 → 안내 후 plaintext 시도
      return extractPlain(file).then((r) => ({
        ...r,
        notes: [
          ...r.notes,
          "구형 .doc는 브라우저에서 정확 추출이 어렵습니다. .docx로 저장 후 업로드를 권장합니다.",
        ],
      }));
    case "xlsx":
    case "xls":
      return extractXlsx(file);
    case "csv":
      return extractCsv(file);
    case "pptx":
      return extractPptx(file);
    case "ppt":
      return extractPlain(file).then((r) => ({
        ...r,
        notes: [
          ...r.notes,
          "구형 .ppt는 브라우저에서 추출이 어렵습니다. .pptx로 저장 후 업로드를 권장합니다.",
        ],
      }));
    case "hwpx":
      return extractHwpx(file);
    case "hwp":
      return extractHwp(file);
    case "txt":
    case "md":
    case "rtf":
      return extractPlain(file);
    default:
      return extractPlain(file);
  }
}

/**
 * 메인 진입점 — 모든 포맷 → UODEDocument
 */
export async function processDocument(
  file: File,
  options: UODEOptions = {}
): Promise<UODEDocument> {
  const opts = { ...UODE_DEFAULTS, ...options };
  const onProgress = options.onProgress;

  onProgress?.({ stage: "detecting", message: "포맷 판별 중…", percent: 5 });
  const format = await detectFormat(file);
  const category = categoryOf(format);

  onProgress?.({
    stage: "parsing",
    message: `${formatLabel(format)} 추출 중…`,
    percent: 20,
  });

  let result: ExtractResult;
  try {
    result = await dispatch(format, file, {
      ...opts,
      onPage: (cur, total) =>
        onProgress?.({
          stage: "parsing",
          message: `페이지 ${cur}/${total} 처리 중…`,
          percent: 20 + Math.round((cur / total) * 50),
        }),
    });
  } catch (err: any) {
    onProgress?.({
      stage: "error",
      message: err?.message || "추출 실패",
      percent: -1,
    });
    throw err;
  }

  onProgress?.({
    stage: "reconstructing",
    message: "구조 재구성 중…",
    percent: 80,
  });

  let text = result.text;
  if (text.length > opts.maxChars) {
    text = text.slice(0, opts.maxChars);
    result.notes.push(
      `텍스트가 ${opts.maxChars.toLocaleString()}자를 초과하여 잘렸습니다.`
    );
  }

  const language = detectLanguage(text);
  const wordCount = wordCountOf(text);
  const charCount = text.length;

  // 신뢰도: 텍스트 양 + OCR 여부 + 포맷 확실성
  let confidence = 50;
  if (charCount > 200) confidence += 20;
  if (charCount > 2000) confidence += 15;
  if (!result.needsOCR) confidence += 10;
  if (format !== "unknown") confidence += 5;
  confidence = Math.min(100, confidence);

  onProgress?.({ stage: "done", message: "완료", percent: 100 });

  return {
    fileName: file.name,
    format,
    category,
    text,
    blocks: result.blocks,
    language,
    pageCount: result.pageCount,
    wordCount,
    charCount,
    needsOCR: result.needsOCR,
    confidence,
    notes: result.notes,
    engine: `UODE/${category}`,
    checksum: quickChecksum(file.name, file.size, text),
    processedAt: new Date().toISOString(),
  };
}

/**
 * 원문 형식을 보존한 디스플레이용 텍스트 생성.
 * 블록 구조를 가벼운 마크다운으로 렌더 — "원문 형식 그대로" 표시 목적.
 */
export function toFormattedText(doc: UODEDocument): string {
  if (!doc.blocks.length) return doc.text;
  const lines: string[] = [];
  for (const b of doc.blocks) {
    switch (b.type) {
      case "heading":
        lines.push("#".repeat(b.level ?? 2) + " " + b.text);
        break;
      case "list-item":
        lines.push(/^[-*•·\d]/.test(b.text) ? b.text : "- " + b.text);
        break;
      case "table":
        if (b.table) {
          for (const row of b.table) lines.push("| " + row.join(" | ") + " |");
        } else {
          lines.push(b.text);
        }
        break;
      case "slide":
      case "sheet":
        lines.push("\n" + b.text);
        break;
      case "speaker-note":
        lines.push("> 🗒 " + b.text);
        break;
      default:
        lines.push(b.text);
    }
  }
  return lines.join("\n");
}
