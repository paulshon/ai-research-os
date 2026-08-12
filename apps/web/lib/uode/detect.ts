/**
 * UODE — File Detection Layer
 *
 * 역할: 업로드 파일의 포맷 판별
 *   - 확장자 기반 1차 판별
 *   - MIME 타입 보조 판별
 *   - magic byte (signature) 최종 판별
 */

import type { DocumentFormat, FormatCategory } from "./types";

/** 확장자 → 포맷 매핑 */
const EXT_MAP: Record<string, DocumentFormat> = {
  pdf: "pdf",
  docx: "docx",
  doc: "doc",
  xlsx: "xlsx",
  xlsm: "xlsx",
  xls: "xls",
  csv: "csv",
  tsv: "csv",
  pptx: "pptx",
  ppt: "ppt",
  hwpx: "hwpx",
  hwp: "hwp",
  txt: "txt",
  text: "txt",
  md: "md",
  markdown: "md",
  rtf: "rtf",
};

/** MIME → 포맷 매핑 */
const MIME_MAP: Record<string, DocumentFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "text/tab-separated-values": "csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/x-hwp": "hwp",
  "application/haansofthwp": "hwp",
  "application/hwp+zip": "hwpx",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
};

/** 포맷 → 카테고리 */
export function categoryOf(format: DocumentFormat): FormatCategory {
  switch (format) {
    case "docx":
    case "doc":
    case "rtf":
      return "word";
    case "xlsx":
    case "xls":
    case "csv":
      return "spreadsheet";
    case "pptx":
    case "ppt":
      return "presentation";
    case "hwpx":
    case "hwp":
      return "hancom";
    case "pdf":
      return "pdf";
    case "txt":
    case "md":
      return "plaintext";
    default:
      return "unknown";
  }
}

/** 파일명에서 확장자 추출 */
export function extensionOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/** 확장자/MIME 기반 1차 포맷 판별 */
export function detectFormatByName(
  fileName: string,
  mime?: string
): DocumentFormat {
  const ext = extensionOf(fileName);
  if (ext && EXT_MAP[ext]) return EXT_MAP[ext];
  if (mime && MIME_MAP[mime]) return MIME_MAP[mime];
  return "unknown";
}

/**
 * magic byte 기반 정밀 판별.
 * ZIP 컨테이너(docx/xlsx/pptx/hwpx)는 헤더만으로 구분 불가하므로
 * 확장자 힌트와 결합해 최종 판별한다.
 */
export async function detectFormat(
  file: File
): Promise<DocumentFormat> {
  const byName = detectFormatByName(file.name, file.type);

  // 평문류는 추가 검사 불필요
  if (byName === "txt" || byName === "md" || byName === "csv") return byName;

  try {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());

    // %PDF
    if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
      return "pdf";
    }
    // PK.. (ZIP 컨테이너): docx/xlsx/pptx/hwpx
    if (head[0] === 0x50 && head[1] === 0x4b) {
      // 확장자 힌트를 신뢰. 없으면 OOXML 컨테이너 추가 분석 필요.
      if (
        byName === "docx" ||
        byName === "xlsx" ||
        byName === "pptx" ||
        byName === "hwpx"
      )
        return byName;
      return "docx"; // 기본 OOXML 추정
    }
    // OLE2 (구형 doc/xls/ppt/hwp): D0 CF 11 E0
    if (
      head[0] === 0xd0 &&
      head[1] === 0xcf &&
      head[2] === 0x11 &&
      head[3] === 0xe0
    ) {
      if (byName === "doc" || byName === "xls" || byName === "ppt" || byName === "hwp")
        return byName;
      return "hwp"; // HWP 5.x도 OLE2 컨테이너 사용
    }
  } catch {
    // magic byte 읽기 실패 시 이름 기반 결과 사용
  }

  return byName;
}

/** 사람이 읽을 수 있는 포맷 레이블 */
export function formatLabel(format: DocumentFormat): string {
  const map: Record<DocumentFormat, string> = {
    pdf: "PDF",
    docx: "Word (DOCX)",
    doc: "Word 97-2003 (DOC)",
    xlsx: "Excel (XLSX)",
    xls: "Excel 97-2003 (XLS)",
    csv: "CSV",
    pptx: "PowerPoint (PPTX)",
    ppt: "PowerPoint 97-2003 (PPT)",
    hwpx: "한글 (HWPX)",
    hwp: "한글 (HWP)",
    txt: "Text",
    md: "Markdown",
    rtf: "RTF",
    unknown: "Unknown",
  };
  return map[format] || "Unknown";
}
