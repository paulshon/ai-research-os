# CHANGELOG — RDOS / AI-Research-OS v18 (s18)

## i18n (KO ↔ EN ↔ ZH) — full-page locale switching

### Landing
- Hero headline unified to single-line `landing.heroHeadline` (fixes EN wrapping to 3 lines)
- Eyebrow and track section labels use locale keys

### RDOS dashboard
- Level names, badges, alignment chain steps, and conflict messages localized via `rdos-display-i18n.ts`
- Growth roadmap and scholar certification views use locale-aware level labels
- Case-paper lesson titles (`case-basics`, `case-design`, `case-method`, `case-reading`) added to EN/ZH lesson meta

### AI-Research-OS — Research Methods (Mixed QCA)
- All 10 QCA workspace steps, panels, stats, toasts, and export cards wired to `methodEngine.*` keys (ko/en/zh)

### APA Citation Automation System
- Taxonomy/family/type labels localized via `apa-i18n.ts` (15 families, 40+ types)
- Panel UI (intext, validate, transform, export, AI, graph, taxonomy, knowledge, settings) uses `apaSystem.*` keys

### Schedule — final checklist
- Legacy persisted checklist items match labels across ko/en/zh when locale switches

## Responsive
- All changes apply to desktop, tablet, and mobile layouts (existing responsive shells unchanged)
