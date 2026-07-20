/**
 * category.ts — category generation engine (100% local).
 * Faithful port of core/category.py. Aggregates coding results into category
 * frequency/density and rolls them up into meta-categories.
 */
import type { QcaProject } from "./project";
import { Counter } from "./counter";

export interface CategoryRow {
  name: string;
  meta: string;
  freq: number;
  density: number;
}

export function buildCategories(project: QcaProject): CategoryRow[] {
  const rows = project.coding_results().filter((r) => r.status !== "rejected");
  const total = rows.length || 1;

  const byCode = new Counter<string>();
  const metaOf: Record<string, string> = {};
  const descOf: Record<string, string> = {};
  for (const c of project.codes()) {
    metaOf[c.name] = c.meta_category;
    descOf[c.name] = c.definition;
  }
  for (const r of rows) byCode.add(r.code_name);

  project.clear_categories();
  const result: CategoryRow[] = [];
  for (const [name, freq] of byCode.mostCommon()) {
    const meta = metaOf[name] ?? "";
    const density = round(freq / total, 4);
    project.add_category(name, meta, descOf[name] ?? "", freq);
    result.push({ name, meta, freq, density });
  }
  return result;
}

export interface MetaSummary {
  meta: string;
  freq: number;
  subs: Array<[string, number]>;
}

export function metaCategorySummary(project: QcaProject): MetaSummary[] {
  const cats = project.categories();
  const meta: Record<string, { freq: number; subs: Array<[string, number]> }> = {};
  for (const c of cats) {
    const m = (meta[c.meta_category] ??= { freq: 0, subs: [] });
    m.freq += c.freq;
    m.subs.push([c.name, c.freq]);
  }
  const out: MetaSummary[] = Object.entries(meta).map(([m, v]) => ({
    meta: m,
    freq: v.freq,
    subs: v.subs,
  }));
  out.sort((a, b) => b.freq - a.freq);
  return out;
}

function round(x: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
