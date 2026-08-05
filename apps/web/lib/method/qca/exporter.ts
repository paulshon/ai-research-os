/**
 * exporter.ts — export engine.
 * Faithful port of core/exporter.py. The engine produces structured data
 * (sheet row arrays, report sections, CSV/JSON strings); the page turns the
 * workbook spec into an .xlsx via SheetJS and the report into DOCX/markdown.
 */
import type { QcaProject } from "./project";
import * as cb from "./codebook";
import * as cat from "./category";
import * as interp from "./interpret";

export interface SheetSpec {
  name: string;
  header: string[];
  rows: (string | number)[][];
}

export function buildResultsWorkbook(project: QcaProject): SheetSpec[] {
  const sheets: SheetSpec[] = [];

  // Codebook
  const cbRows = cb.codebookToRows(project);
  sheets.push({
    name: "Codebook",
    header: cbRows.length ? Object.keys(cbRows[0]) : [],
    rows: cbRows.map((r) => Object.values(r)),
  });

  // Coding
  sheets.push({
    name: "Coding",
    header: ["문장ID", "원문", "코드", "상위범주", "신뢰도", "방식", "상태"],
    rows: project.coding_results().map((r) => [
      r.sentence_id, r.sentence_text, r.code_name, r.meta_category, r.confidence, r.source, r.status,
    ]),
  });

  // Categories
  sheets.push({
    name: "Categories",
    header: ["범주", "상위범주", "빈도", "정의"],
    rows: project.categories().map((c) => [c.name, c.meta_category, c.freq, c.description]),
  });

  // MetaCategories
  sheets.push({
    name: "MetaCategories",
    header: ["상위범주", "빈도", "하위범주"],
    rows: cat.metaCategorySummary(project).map((m) => [
      m.meta, m.freq, m.subs.map(([n, f]) => `${n}(${f})`).join(", "),
    ]),
  });

  // Themes
  sheets.push({
    name: "Themes",
    header: ["주제", "설명", "구성범주"],
    rows: project.themes().map((t) => [t.name, t.description, t.members.join(", ")]),
  });

  // Networks
  sheets.push({
    name: "Networks",
    header: ["유형", "노드1", "노드2", "가중치"],
    rows: project.edges().map((e) => [e.net_type, e.source_node, e.target_node, e.weight]),
  });

  return sheets;
}

export interface ReportSpec {
  title: string;
  sections: Array<{ title: string; body: string }>;
  categoryTable: { header: string[]; rows: string[][] };
  metaTable: { header: string[]; rows: string[][] };
}

export async function buildReport(
  project: QcaProject,
  refine?: (title: string, draft: string) => Promise<string>
): Promise<ReportSpec> {
  const name = project.get_meta("name", "Research Report");
  await interp.generateAll(project, refine);
  const titles: Record<interp.SectionKey, string> = {
    methodology: "1. 연구방법",
    results: "2. 결과",
    discussion: "3. 논의",
    conclusion: "4. 결론",
  };
  const sections = (Object.keys(titles) as interp.SectionKey[]).map((sec) => ({
    title: titles[sec],
    body: project.get_interpretation(sec),
  }));
  return {
    title: `${name} — 내용분석 보고서`,
    sections,
    categoryTable: {
      header: ["범주", "상위범주", "빈도"],
      rows: project.categories().map((c) => [c.name, c.meta_category, String(c.freq)]),
    },
    metaTable: {
      header: ["상위범주(메타)", "빈도"],
      rows: cat.metaCategorySummary(project).map((m) => [m.meta, String(m.freq)]),
    },
  };
}

export function exportCodingCsv(project: QcaProject): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ["sentence_id", "text", "code", "meta_category", "confidence", "source", "status"].join(","),
  ];
  for (const r of project.coding_results()) {
    lines.push(
      [r.sentence_id, r.sentence_text, r.code_name, r.meta_category, r.confidence, r.source, r.status]
        .map(esc)
        .join(",")
    );
  }
  return "\uFEFF" + lines.join("\n");
}

export function exportFullJson(project: QcaProject): string {
  const data = {
    project: project.get_meta("name", ""),
    research_question: project.get_meta("research_question", ""),
    documents: project.documents(),
    codes: project.codes(),
    coding: project.coding_results(),
    categories: project.categories(),
    themes: project.themes(),
    networks: project.edges(),
  };
  return JSON.stringify(data, null, 2);
}
