/**
 * importer.ts — corpus ingestion engine (100% local).
 * Faithful port of core/importer.py. File parsing (xlsx/csv) is done by the
 * caller via SheetJS and passed in as rows; this module owns sentence
 * splitting, text-column detection, and one-row-per-sentence ingestion.
 */
import type { QcaProject } from "./project";

// Python: r'(?<=[.!?。．！？])\s+|\n+'
const SENT_SPLIT = /(?<=[.!?。．！？])\s+|\n+/;

export function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(SENT_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
}

const TEXT_CANDIDATES = [
  "text", "sentence", "content", "본문", "문장", "내용", "원문", "abstract", "body",
];
const TITLE_CANDIDATES = ["title", "제목", "doc", "document", "id"];

function detectTextColumn(columns: string[], rows: Record<string, unknown>[]): string {
  for (const c of columns) {
    if (TEXT_CANDIDATES.includes(String(c).trim().toLowerCase())) return c;
  }
  // longest average text length
  let best = columns[0];
  let bestLen = -1;
  for (const c of columns) {
    let total = 0;
    let n = 0;
    for (const r of rows) {
      total += String(r[c] ?? "").length;
      n++;
    }
    const avg = n ? total / n : 0;
    if (avg > bestLen) {
      best = c;
      bestLen = avg;
    }
  }
  return best;
}

/** Import tabular data: one row = one sentence (each cell may split further). */
export function importTabularRows(
  project: QcaProject,
  columns: string[],
  rows: Record<string, unknown>[],
  srcName: string
): { docId: number; sentences: number } {
  const textCol = detectTextColumn(columns, rows);
  const docId = project.add_document(srcName, "", srcName);
  let pos = 0;
  const full: string[] = [];
  for (const row of rows) {
    const cell = row[textCol];
    if (cell === null || cell === undefined) continue;
    const cellStr = String(cell).trim();
    if (!cellStr) continue;
    const sents = splitSentences(cellStr);
    const list = sents.length ? sents : [cellStr];
    for (const sent of list) {
      project.add_sentence(docId, sent, pos);
      full.push(sent);
      pos += 1;
    }
  }
  project.setDocumentFullText(docId, full.join("\n"));
  project.commit();
  void TITLE_CANDIDATES; // title column detection parity (not used downstream)
  return { docId, sentences: pos };
}

/** Import pasted/plain text: whole text = one document, split into sentences. */
export function importRawText(
  project: QcaProject,
  title: string,
  text: string
): { docId: number; sentences: number } {
  const docId = project.add_document(title, text, "paste");
  const sents = splitSentences(text);
  sents.forEach((s, i) => project.add_sentence(docId, s, i));
  project.commit();
  return { docId, sentences: sents.length };
}
