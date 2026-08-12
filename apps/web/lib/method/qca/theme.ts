/**
 * theme.ts — theme (discourse) generation engine.
 * Faithful port of core/theme.py. Groups sub-categories (codes) by their
 * meta-category into higher-order themes, named after the meta-category label.
 */
import type { QcaProject } from "./project";
import { Counter } from "./counter";

export interface ThemeRow {
  name: string;
  members: string[];
  freq: number;
  description: string;
}

export function generateThemes(project: QcaProject): ThemeRow[] {
  const metaGroups: Record<string, string[]> = {};
  const codeFreq = new Counter<string>();
  for (const c of project.categories()) {
    (metaGroups[c.meta_category] ??= []).push(c.name);
    codeFreq.add(c.name, c.freq);
  }

  project.clear_themes();
  const themes: ThemeRow[] = [];
  for (const [meta, members] of Object.entries(metaGroups)) {
    if (!meta) continue;
    const total = members.reduce((a, m) => a + codeFreq.get(m), 0);
    const name = meta;
    const desc = `하위범주 ${members.join(", ")} 를 포괄하는 상위 담론 (총 ${total}건)`;
    project.add_theme(name, desc, members, total);
    themes.push({ name, members, freq: total, description: desc });
  }

  themes.sort((a, b) => b.freq - a.freq);
  return themes;
}
