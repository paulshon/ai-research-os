/**
 * UODE — Adapter Layer
 *
 * 작동 구현(processDocument → UODEDocument)을 spec 패키지의
 * UniversalDocumentObject(@ai-research-os/document-core)로 변환한다.
 * 또한 추출 텍스트에서 참고문헌/DOI를 뽑아 citation-core와 연결한다.
 */

import type { UODEDocument } from "./types";
import type {
  UniversalDocumentObject,
  ParsedSection,
  ParsedReference,
  DocumentFormat as SpecFormat,
  OCRStatus,
} from "@ai-research-os/document-core";

/** 섹션 타입 추정 (heading 텍스트 기반) */
function classifySection(heading: string): ParsedSection["type"] {
  const h = heading.toLowerCase();
  if (/abstract|초록|요약/.test(h)) return "abstract";
  if (/introduction|서론|들어가/.test(h)) return "introduction";
  if (/method|방법|연구방법/.test(h)) return "methodology";
  if (/result|결과/.test(h)) return "results";
  if (/discussion|논의|고찰/.test(h)) return "discussion";
  if (/conclusion|결론|맺음/.test(h)) return "conclusion";
  if (/reference|참고문헌|references|bibliography/.test(h)) return "references";
  if (/acknowledg|감사/.test(h)) return "acknowledgments";
  if (/appendix|부록/.test(h)) return "appendix";
  return "body";
}

/** working format → spec format (csv/rtf는 근사) */
function toSpecFormat(fmt: UODEDocument["format"]): SpecFormat {
  switch (fmt) {
    case "csv":
      return "xlsx";
    case "rtf":
      return "docx";
    default:
      return fmt as SpecFormat;
  }
}

/** 추출 텍스트의 references 섹션에서 참고문헌 라인 분리 */
export function extractReferenceLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex((l) =>
    /^\s*(references|참고문헌|bibliography|works cited)\s*$/i.test(l.trim())
  );
  const pool = startIdx >= 0 ? lines.slice(startIdx + 1) : lines;

  const refs: string[] = [];
  let buffer = "";
  for (const raw of pool) {
    const line = raw.trim();
    if (!line) {
      if (buffer) {
        refs.push(buffer.trim());
        buffer = "";
      }
      continue;
    }
    // 새 참고문헌 시작 휴리스틱: [1] / 1. / 저자, (연도)
    const isNewEntry =
      /^\[\d+\]/.test(line) ||
      /^\d+\.\s/.test(line) ||
      /^[A-Z][a-zÀ-ÿ]+,?\s+[A-Z]\./.test(line) ||
      /^[가-힣]{2,4}\s*\(?\d{4}/.test(line);
    if (isNewEntry && buffer) {
      refs.push(buffer.trim());
      buffer = line;
    } else {
      buffer = buffer ? buffer + " " + line : line;
    }
  }
  if (buffer) refs.push(buffer.trim());

  return refs
    .filter((r) => r.length >= 15 && /\d{4}/.test(r))
    .slice(0, 300);
}

/**
 * 작동 UODEDocument → spec UniversalDocumentObject 변환
 */
export function toUniversalDocument(
  doc: UODEDocument
): UniversalDocumentObject {
  const sections: ParsedSection[] = [];
  let order = 0;
  let currentHeading = "";
  let currentBody = "";
  let currentType: ParsedSection["type"] = "body";

  const flush = () => {
    if (currentBody.trim() || currentHeading) {
      sections.push({
        id: `sec-${order}`,
        type: currentType,
        heading: currentHeading || undefined,
        content: currentBody.trim(),
        order: order++,
      });
    }
    currentBody = "";
  };

  for (const b of doc.blocks) {
    if (b.type === "heading") {
      flush();
      currentHeading = b.text;
      currentType = classifySection(b.text);
    } else if (b.type === "table" && b.table) {
      currentBody += "\n" + b.table.map((r) => r.join("\t")).join("\n") + "\n";
    } else {
      currentBody += b.text + "\n";
    }
  }
  flush();

  if (sections.length === 0 && doc.text) {
    sections.push({
      id: "sec-0",
      type: "body",
      content: doc.text,
      order: 0,
    });
  }

  const refLines = extractReferenceLines(doc.text);
  const references: ParsedReference[] = refLines.map((raw, i) => {
    const doiM = raw.match(/10\.\d{4,}\/\S+/);
    const yearM = raw.match(/\b(19|20)\d{2}\b/);
    return {
      id: `ref-${i}`,
      rawText: raw,
      doi: doiM ? doiM[0].replace(/[.,;)\]]+$/, "") : undefined,
      year: yearM ? parseInt(yearM[0], 10) : undefined,
      confidence: doiM ? 45 : 25,
    };
  });

  const ocrStatus: OCRStatus = doc.needsOCR ? "detected" : "not_needed";

  return {
    id: `uode-${doc.checksum}`,
    filename: doc.fileName,
    format: toSpecFormat(doc.format),
    contentType: references.length > 3 ? "scholarly_article" : "general_document",
    title: deriveTitle(doc),
    authors: [],
    keywords: [],
    sections,
    tables: doc.blocks
      .filter((b) => b.type === "table" && b.table)
      .map((b, i) => ({
        id: `tbl-${i}`,
        headers: b.table![0] ?? [],
        rows: b.table!.slice(1),
        pageNumber: b.page,
      })),
    figures: [],
    references,
    fullText: doc.text,
    ocrStatus,
    language: doc.language,
    pageCount: doc.pageCount,
    confidence: doc.confidence,
    processedAt: doc.processedAt,
    pipelineLog: [
      {
        layer: "parsing",
        status: doc.notes.length ? "warning" : "success",
        message:
          `${doc.engine} · ${doc.charCount}자 · ${doc.wordCount}단어` +
          (doc.notes.length ? ` · ${doc.notes.join("; ")}` : ""),
        timestamp: doc.processedAt,
      },
    ],
  };
}

/** 첫 heading 또는 파일명에서 제목 추정 */
function deriveTitle(doc: UODEDocument): string {
  const firstHeading = doc.blocks.find((b) => b.type === "heading");
  if (firstHeading && firstHeading.text.length >= 5)
    return firstHeading.text.slice(0, 200);
  const firstPara = doc.blocks.find(
    (b) => b.type === "paragraph" && b.text.length >= 10
  );
  if (firstPara) return firstPara.text.slice(0, 120);
  return doc.fileName.replace(/\.[^.]+$/, "");
}
