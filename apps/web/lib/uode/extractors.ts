/**
 * UODE — Parsing Layer (포맷별 추출 엔진)
 *
 * 각 엔진은 원본 파일을 입력받아 { text, blocks } 형태의
 * 정규화 직전 중간 산출물을 반환한다.
 *
 * 엔진 구성 (첨부 IA 대응):
 *   Word Engine        → DOCX XML Parser + Paragraph/Table Engine
 *   Spreadsheet Engine → Workbook/Worksheet/Table Engine
 *   Presentation Engine→ Slide/Shape/Speaker-Note Engine
 *   Hancom Engine      → HWPX XML Engine / HWP Binary(텍스트 추출)
 *   PDF Engine         → Text Layer Engine + reading-order
 *   Plaintext Engine   → TXT/MD passthrough
 */

import type { DocumentBlock } from "./types";
import {
  ensurePdfJs,
  ensureMammoth,
  ensureXLSX,
  ensureJSZip,
  ensureCFB,
  ensurePako,
} from "./loaders";

export interface ExtractResult {
  text: string;
  blocks: DocumentBlock[];
  pageCount: number;
  needsOCR: boolean;
  notes: string[];
}

function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target!.result as ArrayBuffer);
    r.onerror = () => reject(new Error("파일 읽기 실패"));
    r.readAsArrayBuffer(file);
  });
}

// ── 헤딩 추정 휴리스틱 ──────────────────────────────
function guessBlockType(line: string): DocumentBlock["type"] {
  const t = line.trim();
  if (!t) return "paragraph";
  if (/^#{1,6}\s/.test(t)) return "heading";
  if (/^(\d+\.|[-*•·])\s/.test(t)) return "list-item";
  if (
    t.length <= 80 &&
    /^[0-9IVX]+[.)]?\s+\S/.test(t) &&
    !/[.!?]$/.test(t)
  )
    return "heading";
  return "paragraph";
}

function headingLevel(line: string): number | undefined {
  const m = line.match(/^(#{1,6})\s/);
  if (m) return m[1].length;
  return undefined;
}

function linesToBlocks(text: string, page?: number): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const lines = text.split(/\r?\n/);
  let idx = 0;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const type = guessBlockType(line);
    blocks.push({
      index: idx++,
      type,
      text: line,
      level: type === "heading" ? headingLevel(line) ?? 2 : undefined,
      page,
    });
  }
  return blocks;
}

// ══════════════════════════════════════════════════
// PDF Engine — Text Layer Engine (reading-order 복원)
// ══════════════════════════════════════════════════
export async function extractPdf(
  file: File,
  maxPages: number,
  onPage?: (cur: number, total: number) => void
): Promise<ExtractResult> {
  const pdfjsLib = await ensurePdfJs();
  if (!pdfjsLib) throw new Error("PDF.js 로드 실패");

  const buf = await readArrayBuffer(file);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pageLimit = Math.min(doc.numPages, maxPages);

  const blocks: DocumentBlock[] = [];
  let fullText = "";
  let blockIdx = 0;
  let totalGlyphs = 0;

  for (let i = 1; i <= pageLimit; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // y좌표로 줄 그룹핑 → reading order 복원
    const lineMap: Record<number, string> = {};
    tc.items.forEach((item: any) => {
      if (!item.str) return;
      totalGlyphs += item.str.length;
      const y = item.transform ? Math.round(item.transform[5]) : 0;
      lineMap[y] = (lineMap[y] || "") + item.str;
    });
    const sortedY = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a);
    const pageText = sortedY.map((y) => lineMap[y]).join("\n");
    fullText += pageText + "\n\n";

    for (const b of linesToBlocks(pageText, i)) {
      blocks.push({ ...b, index: blockIdx++ });
    }
    onPage?.(i, pageLimit);
  }

  // 텍스트가 거의 없으면 스캔본(OCR 필요)로 판단
  const needsOCR = totalGlyphs < pageLimit * 20;

  return {
    text: fullText.trim(),
    blocks,
    pageCount: doc.numPages,
    needsOCR,
    notes: needsOCR
      ? ["텍스트 레이어가 빈약합니다. 스캔 PDF일 수 있어 OCR이 필요합니다."]
      : [],
  };
}

// ══════════════════════════════════════════════════
// Word Engine — DOCX (mammoth)
// ══════════════════════════════════════════════════
export async function extractDocx(file: File): Promise<ExtractResult> {
  const mammoth = await ensureMammoth();
  if (!mammoth) throw new Error("mammoth 로드 실패");
  const buf = await readArrayBuffer(file);

  // 1차: HTML 변환 → 구조 보존 (heading/list/table)
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const blocks = htmlToBlocks(html);
  const text = blocks.map(blockToText).join("\n");

  return {
    text: text.trim(),
    blocks,
    pageCount: 1,
    needsOCR: false,
    notes: [],
  };
}

function blockToText(b: DocumentBlock): string {
  if (b.type === "table" && b.table) {
    return b.table.map((row) => row.join("\t")).join("\n");
  }
  return b.text;
}

/** mammoth HTML → DocumentBlock[] (DOMParser 사용) */
function htmlToBlocks(html: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let idx = 0;
  if (typeof window === "undefined" || !("DOMParser" in window)) {
    // 비브라우저 fallback: 태그 제거
    const stripped = html.replace(/<[^>]+>/g, "\n").replace(/\n{2,}/g, "\n");
    return linesToBlocks(stripped);
  }
  const docu = new DOMParser().parseFromString(html, "text/html");
  const walk = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      blocks.push({
        index: idx++,
        type: "heading",
        text: (el.textContent || "").trim(),
        level: parseInt(tag[1], 10),
      });
    } else if (tag === "p") {
      const txt = (el.textContent || "").trim();
      if (txt) blocks.push({ index: idx++, type: "paragraph", text: txt });
    } else if (tag === "li") {
      const txt = (el.textContent || "").trim();
      if (txt) blocks.push({ index: idx++, type: "list-item", text: txt });
    } else if (tag === "table") {
      const rows: string[][] = [];
      el.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("td,th").forEach((td) =>
          cells.push((td.textContent || "").trim())
        );
        if (cells.length) rows.push(cells);
      });
      blocks.push({
        index: idx++,
        type: "table",
        text: rows.map((r) => r.join("\t")).join("\n"),
        table: rows,
      });
      return; // 테이블 내부는 더 내려가지 않음
    } else {
      Array.from(el.children).forEach(walk);
      return;
    }
  };
  Array.from(docu.body.children).forEach(walk);
  return blocks;
}

// ══════════════════════════════════════════════════
// Spreadsheet Engine — XLSX/XLS (SheetJS)
// ══════════════════════════════════════════════════
export async function extractXlsx(file: File): Promise<ExtractResult> {
  const XLSX = await ensureXLSX();
  if (!XLSX) throw new Error("SheetJS 로드 실패");
  const buf = await readArrayBuffer(file);
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });

  const blocks: DocumentBlock[] = [];
  let idx = 0;
  let fullText = "";

  wb.SheetNames.forEach((name: string, sheetNum: number) => {
    const sheet = wb.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const cleanRows = rows
      .map((r) => r.map((c) => String(c ?? "").trim()))
      .filter((r) => r.some((c) => c.length > 0));

    blocks.push({
      index: idx++,
      type: "heading",
      text: `[시트] ${name}`,
      level: 2,
      page: sheetNum + 1,
    });
    if (cleanRows.length) {
      blocks.push({
        index: idx++,
        type: "table",
        text: cleanRows.map((r) => r.join("\t")).join("\n"),
        table: cleanRows,
        page: sheetNum + 1,
      });
    }
    fullText +=
      `# ${name}\n` + cleanRows.map((r) => r.join("\t")).join("\n") + "\n\n";
  });

  return {
    text: fullText.trim(),
    blocks,
    pageCount: wb.SheetNames.length,
    needsOCR: false,
    notes: [],
  };
}

// CSV/TSV — Spreadsheet Engine 경량 경로
export async function extractCsv(file: File): Promise<ExtractResult> {
  const raw = await file.text();
  const delim = file.name.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  const rows = raw
    .split(/\r?\n/)
    .filter((l) => l.trim().length)
    .map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, "").trim()));
  const blocks: DocumentBlock[] = [
    {
      index: 0,
      type: "table",
      text: rows.map((r) => r.join("\t")).join("\n"),
      table: rows,
    },
  ];
  return {
    text: rows.map((r) => r.join("\t")).join("\n"),
    blocks,
    pageCount: 1,
    needsOCR: false,
    notes: [],
  };
}

// ══════════════════════════════════════════════════
// Presentation Engine — PPTX (JSZip + slide XML)
// ══════════════════════════════════════════════════
export async function extractPptx(file: File): Promise<ExtractResult> {
  const JSZip = await ensureJSZip();
  if (!JSZip) throw new Error("JSZip 로드 실패");
  const buf = await readArrayBuffer(file);
  const zip = await JSZip.loadAsync(buf);

  // slideN.xml 정렬
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)![1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)![1], 10);
      return na - nb;
    });
  const noteNames = Object.keys(zip.files).filter((n) =>
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)
  );

  const blocks: DocumentBlock[] = [];
  let idx = 0;
  let fullText = "";

  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.files[slideNames[i]].async("string");
    const runs = extractOoxmlText(xml);
    const slideText = runs.join("\n");
    blocks.push({
      index: idx++,
      type: "slide",
      text: `[슬라이드 ${i + 1}]`,
      page: i + 1,
    });
    for (const line of runs) {
      if (line.trim())
        blocks.push({
          index: idx++,
          type: "paragraph",
          text: line.trim(),
          page: i + 1,
        });
    }
    fullText += `# 슬라이드 ${i + 1}\n${slideText}\n\n`;
  }

  // 발표자 노트
  for (let i = 0; i < noteNames.length; i++) {
    const xml = await zip.files[noteNames[i]].async("string");
    const noteText = extractOoxmlText(xml).join(" ").trim();
    if (noteText) {
      blocks.push({
        index: idx++,
        type: "speaker-note",
        text: noteText,
        page: i + 1,
      });
      fullText += `[노트 ${i + 1}] ${noteText}\n`;
    }
  }

  return {
    text: fullText.trim(),
    blocks,
    pageCount: slideNames.length,
    needsOCR: false,
    notes: [],
  };
}

/** OOXML <a:t> 텍스트 런 추출 */
function extractOoxmlText(xml: string): string[] {
  const out: string[] = [];
  const re = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(decodeXmlEntities(m[1]));
  }
  return out;
}

// ══════════════════════════════════════════════════
// Hancom Engine — HWPX (JSZip + section XML)
// ══════════════════════════════════════════════════
export async function extractHwpx(file: File): Promise<ExtractResult> {
  const JSZip = await ensureJSZip();
  if (!JSZip) throw new Error("JSZip 로드 실패");
  const buf = await readArrayBuffer(file);
  const zip = await JSZip.loadAsync(buf);

  const sectionNames = Object.keys(zip.files)
    .filter((n) => /^Contents\/section\d+\.xml$/i.test(n))
    .sort();

  const blocks: DocumentBlock[] = [];
  let idx = 0;
  let fullText = "";

  for (const sn of sectionNames) {
    const xml = await zip.files[sn].async("string");
    // HWPX 본문 텍스트는 <hp:t> 또는 <t> 런에 위치
    const runs = extractHwpxText(xml);
    for (const line of runs) {
      if (line.trim()) {
        const type = guessBlockType(line);
        blocks.push({ index: idx++, type, text: line.trim() });
        fullText += line.trim() + "\n";
      }
    }
    fullText += "\n";
  }

  if (!fullText.trim()) {
    return {
      text: "",
      blocks: [],
      pageCount: 0,
      needsOCR: false,
      notes: [
        "HWPX 본문 텍스트를 추출하지 못했습니다. 텍스트를 직접 붙여넣어 주세요.",
      ],
    };
  }

  return {
    text: fullText.trim(),
    blocks,
    pageCount: sectionNames.length,
    needsOCR: false,
    notes: [],
  };
}

/** HWPX 본문 런 추출 (<hp:t>, <t>) */
function extractHwpxText(xml: string): string[] {
  const out: string[] = [];
  const re = /<(?:hp:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:hp:)?t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(decodeXmlEntities(m[1]));
  }
  // 줄 구분(<hp:lineBreak/>, 문단)을 위해 paragraph 단위로도 합산
  return out;
}

// ══════════════════════════════════════════════════
// Hancom Engine — HWP 5.x 바이너리 (best-effort 텍스트 스캔)
// ══════════════════════════════════════════════════
// ══════════════════════════════════════════════════
// Hancom Engine — HWP 5.x 바이너리 (정식 레코드 파서, v11)
//   OLE2(CFB) 컨테이너 → BodyText/Section* 스트림(zlib raw deflate)
//   → 레코드 워크 → HWPTAG_PARA_TEXT(67)에서 UTF-16LE 본문 추출.
//   hwp.js(hahnlee/hwp.js)와 동일한 파일 구조/레코드 규칙을 따른다.
//   라이브러리: XLSX.CFB(기존 로더 재사용) + pako(CDN). 추가 npm 의존성 없음.
//   실패 시 PrvText UTF-16 스캔(best-effort)으로 폴백.
// ══════════════════════════════════════════════════
const HWPTAG_PARA_TEXT = 0x10 + 51; // 67
// 본문 텍스트 레코드 내 제어문자 분류(HWP5 스펙)
const HWP_CHAR_CONTROLS = new Set<number>([0, 10, 13]); // char control (1 wchar)
const HWP_EXT_CONTROLS = new Set<number>([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
]); // inline/extended control (8 wchar)

function hwpParseParaText(
  view: DataView,
  start: number,
  size: number
): string {
  let i = start;
  const end = start + size;
  let s = "";
  while (i + 1 < end) {
    const c = view.getUint16(i, true);
    if (HWP_CHAR_CONTROLS.has(c)) {
      if (c === 10 || c === 13) s += "\n";
      i += 2;
    } else if (HWP_EXT_CONTROLS.has(c)) {
      i += 16; // inline/extended control = 8 wchar
    } else {
      s += String.fromCharCode(c);
      i += 2;
    }
  }
  return s;
}

function hwpParseSection(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 0;
  let text = "";
  while (pos + 4 <= bytes.length) {
    const header = view.getUint32(pos, true);
    pos += 4;
    const tagID = header & 0x3ff;
    let recSize = (header >> 20) & 0xfff;
    if (recSize === 0xfff) {
      recSize = view.getUint32(pos, true);
      pos += 4;
    }
    const start = pos;
    if (tagID === HWPTAG_PARA_TEXT) {
      text += hwpParseParaText(view, start, recSize) + "\n";
    }
    pos = start + recSize;
  }
  return text;
}

export async function extractHwp(file: File): Promise<ExtractResult> {
  const buf = new Uint8Array(await readArrayBuffer(file));

  // 1) 정식 경로: CFB + pako 레코드 파서
  try {
    const CFB = await ensureCFB();
    const pako = await ensurePako();
    if (CFB?.read && CFB?.find && pako) {
      const cfb = CFB.read(buf, { type: "buffer" });
      const fh = CFB.find(cfb, "FileHeader");
      if (fh?.content) {
        const rawHead = fh.content as Uint8Array;
        const head =
          rawHead instanceof Uint8Array ? Uint8Array.from(rawHead) : Uint8Array.from(rawHead as any);
        const hv = new DataView(head.buffer, head.byteOffset, head.byteLength);
        const sig = String.fromCharCode(...Array.from(head.slice(0, 17)));
        if (sig === "HWP Document File") {
          const flags = hv.getUint32(36, true);
          const compressed = (flags & 1) === 1;
          const paths: string[] = (cfb.FullPaths as string[])
            .filter((p) => /BodyText\/Section\d+$/i.test(p))
            .sort();
          const blocks: DocumentBlock[] = [];
          let idx = 0;
          let fullText = "";
          for (const sp of paths) {
            const ent = CFB.find(cfb, sp);
            if (!ent?.content) continue;
            let bytes = ent.content as Uint8Array;
            if (!(bytes instanceof Uint8Array)) bytes = Uint8Array.from(bytes);
            if (compressed) {
              try {
                bytes = pako.inflateRaw(bytes);
              } catch {
                try {
                  bytes = pako.inflate(bytes);
                } catch {
                  continue;
                }
              }
            }
            const secText = hwpParseSection(bytes);
            for (const line of secText.split(/\n/)) {
              const t = line.trim();
              if (t) {
                blocks.push({ index: idx++, type: guessBlockType(t), text: t });
              }
            }
            fullText += secText + "\n";
          }
          if (fullText.trim().length >= 10) {
            return {
              text: fullText.trim(),
              blocks,
              pageCount: Math.max(1, paths.length),
              needsOCR: false,
              notes: [],
            };
          }
        }
      }
    }
  } catch {
    /* 정식 파서 실패 → 폴백 */
  }

  // 2) 폴백: PrvText UTF-16LE 프리뷰 스캔(best-effort)
  const text = scanUtf16(buf);
  if (text.trim().length < 20) {
    return {
      text: "",
      blocks: [],
      pageCount: 0,
      needsOCR: false,
      notes: [
        "HWP 본문을 추출하지 못했습니다. HWPX로 저장 후 업로드하거나, " +
          "데스크탑/서버 변환기(LibreOffice)로 PDF 변환 후 업로드해 주세요.",
      ],
    };
  }
  return {
    text: text.trim(),
    blocks: linesToBlocks(text),
    pageCount: 1,
    needsOCR: false,
    notes: ["HWP 프리뷰 텍스트(부분)를 추출했습니다. 정확도가 낮을 수 있습니다."],
  };
}

/** 바이트 스트림에서 연속 UTF-16LE 한글/ASCII 시퀀스 추출 */
function scanUtf16(buf: Uint8Array): string {
  let out = "";
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const code = buf[i] | (buf[i + 1] << 8);
    const isHangul = code >= 0xac00 && code <= 0xd7a3;
    const isAscii = code >= 0x20 && code <= 0x7e;
    const isJamo = code >= 0x3130 && code <= 0x318f;
    if (isHangul || isAscii || isJamo) out += String.fromCharCode(code);
    else if (code === 0x0a || code === 0x0d) out += "\n";
    else out += out.endsWith(" ") ? "" : " ";
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
}

// ══════════════════════════════════════════════════
// Plaintext Engine — TXT / MD
// ══════════════════════════════════════════════════
export async function extractPlain(file: File): Promise<ExtractResult> {
  const text = await file.text();
  return {
    text: text.trim(),
    blocks: linesToBlocks(text),
    pageCount: 1,
    needsOCR: false,
    notes: [],
  };
}

// ── 공통 유틸 ──────────────────────────────────────
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&amp;/g, "&");
}

export const __uode_internal = { linesToBlocks, guessBlockType, decodeXmlEntities, scanUtf16 };
