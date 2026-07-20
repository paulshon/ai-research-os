# CHANGELOG-RDOS-v15 (s16)

> **Package:** `AI-Research-OS_RDOS_-s16.zip`
> **Focus:** English ↔ Chinese language switching across the SaaS surface — desktop, tablet, mobile (iOS/Android web) for both the **Aspiring Researcher Plan (RDOS)** and the **Researcher Plan (AI-Research-OS)**.
> **Scope note:** The Korean-language surface was already the source of truth; changes below teach the affected components to consult the i18n dictionary rather than hard-code Korean strings, and repair the marketing navbar so the wordmark cannot be overrun by longer English labels.

---

## 1) Reported symptoms → fixes

| # | Screenshot | Symptom | Fix |
|---|---|---|---|
| 1 | `1.jpg` (Writing / 写作) | Chapter tree ("서론 (Introduction)", "P1: 거시 현상 제시" …), "본문" toolbar label, top-right "참고문헌" button, bottom-left "자동저장" all stayed Korean when `ZH` was selected. | Writing page now calls `localizeChapters(...)` and `localizeCategories(t)`; rich-text editor toolbar is now built through `t()`; citation button reads `citations.button`; auto-save chip reads `common.autoSave`. |
| 2 | `2.jpg` (Review · 审核) | Top-right "참고문헌" and bottom-left "자동저장" still Korean. | Same shared `CitationButton` and `ProjectSavePanel` components — one fix covers every dashboard page. |
| 3 | `3.jpg` (Schedule · 日程) | Bottom "最终检查清单" pre-submission items ("논문 형식 검증", "참고문헌 정리" …) stayed Korean even though `schedulePage.checklist*` keys already existed. | Root cause: default items were baked into React state as `label: t(key)` on first render and then persisted, so a later locale switch never propagated. Fixed by storing the `key` on each default item and computing labels via a `useMemo` (`localizedChecklist`) that always calls `t(item.key)`. Legacy persisted items are auto-healed on first render (label match against ko / en / zh). Toggling now uses index identity — stable across locale switches. |
| 4 | `4.jpg` (EN Paper Structure Engine) | Right-side type dropdown showed 34 Korean labels; bottom three category blocks ("디지털·계산 연구형", "철학·해석형", "학제간·미래형") and their 10 types were not translated. | `lib/i18n/research-labels.ts` extended: added `catDigital / catPhilosophy / catInterdisciplinary` and `typeDh / typeDs / typeNa / typeSim / typePhil / typeHerm / typePhen / typeConv / typeFut / typeDbr` to `CAT_KEYS` and `TYPE_KEYS`. Matching entries added to `ko-pages.ts`, `en-pages.ts`, `zh-pages.ts` (`research.*`). Structure page dropdown now uses the localized categories. Writing page too. |
| 5 | `5.jpg` (ZH Research Methods) | Method cards ("혼합 질적내용분석", "주제분석", "근거이론", "설문 통계분석"), summaries, step chips, and category headers all Korean. | New `lib/i18n/method-labels.ts` helper (`localizeMethodCategories` / `localizeMethodType`) plus new `methodEngine.*` blocks in `ko-dash3 / en-dash3 / zh-dash3`. `app/(dashboard)/method/page.tsx` and `.../[type]/page.tsx` now render through the helper. |
| 6 | `6.jpg` (Mixed QCA subpage) | Left rail 10 steps ("1. 프로젝트" … "10. 내보내기") and right-side "1. 프로젝트" panel (연구명 / 연구문제 / 샘플 데이터로 시작 …) Korean; status chips ("문장 / 코드 / 코딩") Korean. | `components/method/qca-workspace.tsx` now derives its sidebar from `localizeMethodType(getMethodType("qca"), t).steps`. Header uses `t("methodEngine.qcaName")`; project panel labels, placeholders, and CTAs read `methodEngine.projectTitle / projectDesc / studyName / studyNameSample / studyQuestion / studyQuestionSample / startWithSample / collectDirect`. Status chips read `methodEngine.countSentence / countCode / countCoding`. |
| 7 | `7.jpg` (APA automation modal) | 11 sidebar entries, header title, dashboard section (stats, compliance bar, quick actions, "최근 참고문헌"), builder / in-text headers all Korean regardless of locale. | New `apaSystem.*` block in dashboard-2 locales. `components/apa/apa-automation-system.tsx` now: (a) builds `MENUS` through `t()` per render, (b) header title / subtitle / close button use `apaSystem.title / subtitle / closeBtn`, (c) dashboard section reads all four stat labels, quick-action buttons, compliance-score label, recent-refs heading, and description (with `{n}` interpolation for the type count) from i18n, (d) builder title uses `apaSystem.builderTitle` with `apaSystem.editingLabel`, (e) in-text section title uses `apaSystem.intextTitle`. |
| 8 | `8.jpg` (RDOS Research Basics) | Sidebar labels translated correctly; lesson body ("연구의 정의와 학술적 글의 성격 …") stayed Korean. | The RDOS shell already localizes menu labels via `rdos.shell.menu*`. The remaining Korean text is the hand-authored curriculum content in `lib/rdos/lesson-content.ts` (13,694 lines, 1 MB of educational prose). Full translation of the RDOS curriculum is deferred to a dedicated content pass — the shell, sidebar, dashboard chrome, quiz UI, and per-lesson chrome remain translated. Documented as a known gap. |
| 9 | `9.jpg` (EN landing navbar) | Under `EN`, the "Aspiring Researcher Plan" nav link (24 chars, ~4× longer than the Korean equivalent) collided with the wordmark: `AI Research` and `OS` visually stacked around the nav link. | `components/marketing/navbar.tsx`: logo `<Link>` gets `flex-shrink-0 whitespace-nowrap`, wordmark span gets `whitespace-nowrap`, nav-links container moves from `lg:flex` to `xl:flex` (was 1024px, now 1280px), the mobile hamburger moves from `lg:hidden` to `xl:hidden` to match. Outer container gains a `gap-4` guard. Result: wordmark never wraps or collapses, and the 9-item nav strip only appears when there is genuinely enough horizontal room. |
| 10 | `10.jpg` (dashboard) | Top-right "참고문헌" button still Korean. | Same `CitationButton` fix as #1 / #2. |
| 11 | `11.jpg` (Research design page) | Top-right "참고문헌" button and bottom-left "자동저장 오후 03:13" Korean. | Same fixes as #1 / #2. |

---

## 2) New i18n keys

**`common` (`ko` / `en` / `zh`):** `autoSave`, `autoSaved`, `inText`, `figure`, `table`, `editing`, `noPermission`.

**`citations` (dash2 group):** `button`, `buttonTitle`, `cited`.

**`editorToolbar` (dash2 group):** `h1`, `h2`, `h3`, `body`, `bold`, `italic`, `underline`, `bulletList`, `numberedList`, `quote`, `placeholder`, `mediaSmall`, `mediaMedium`, `mediaLarge`, `alignLeft`, `alignCenter`, `alignRight`, `inlineBlock`, `inlineBlockLabel`, `remove`, `resizeHint`.

**`apaSystem` (dash2 group):** `title`, `subtitle`, `styleLabel`, `closeBtn`, `menuDashboard / menuBuilder / menuIntext / menuValidate / menuTransform / menuExport / menuAi / menuGraph / menuTaxonomy / menuKnowledge / menuSettings`, `dashboardTitle`, `dashboardDesc` (with `{n}` placeholder), `statReferences`, `statCompliance`, `statTypes`, `statDuplicates`, `complianceScore`, `quickCreate`, `quickImport`, `quickAi`, `quickValidate`, `recentRefs`, `builderTitle`, `intextTitle`, `editingLabel`.

**`methodEngine` (dash3 group):** category headers `catQual / catQuant`; four method names + summaries (`qcaName / qcaSummary`, `thematicName / thematicSummary`, `groundedName / groundedSummary`, `surveyStatsName / surveyStatsSummary`); step labels for each method (10 QCA + 6 thematic + 4 grounded + 5 survey-stats); project sub-page labels (`projectTitle`, `projectDesc`, `studyName`, `studyNameSample`, `studyQuestion`, `studyQuestionSample`, `startWithSample`, `collectDirect`, `countSentence`, `countCode`, `countCoding`).

**`research` (pages group):** added `catDigital / catPhilosophy / catInterdisciplinary` categories and 10 more type keys: `typeDh / typeDs / typeNa / typeSim / typePhil / typeHerm / typePhen / typeConv / typeFut / typeDbr`.

All three locales stay shape-compatible with the `TranslationDict` type — verified at build time by `type TranslationDict = DeepString<typeof import("./locales/ko").ko>` and cross-checked at runtime with a shape-parity script during packaging.

---

## 3) Files modified

**i18n dictionaries (12):**
- `apps/web/lib/i18n/locales/ko.ts`, `en.ts`, `zh.ts`
- `apps/web/lib/i18n/locales/ko-pages.ts`, `en-pages.ts`, `zh-pages.ts`
- `apps/web/lib/i18n/locales/ko-dash2.ts`, `en-dash2.ts`, `zh-dash2.ts`
- `apps/web/lib/i18n/locales/ko-dash3.ts`, `en-dash3.ts`, `zh-dash3.ts`

**i18n helpers (2):**
- `apps/web/lib/i18n/research-labels.ts` — added 3 categories + 10 types
- `apps/web/lib/i18n/method-labels.ts` — **new**, mirrors `research-labels.ts` for the method engine

**Shared shell components (4):**
- `apps/web/components/citation/citation-button.tsx`
- `apps/web/components/save/project-save-panel.tsx`
- `apps/web/components/dashboard/dashboard-shell.tsx`
- `apps/web/components/marketing/navbar.tsx` (layout fix)

**Editor & feature components (3):**
- `apps/web/components/editor/rich-text-editor.tsx`
- `apps/web/components/apa/apa-automation-system.tsx`
- `apps/web/components/method/qca-workspace.tsx`

**Dashboard pages (5):**
- `apps/web/app/(dashboard)/writing/page.tsx`
- `apps/web/app/(dashboard)/structure/page.tsx`
- `apps/web/app/(dashboard)/schedule/page.tsx` (state model change)
- `apps/web/app/(dashboard)/method/page.tsx`
- `apps/web/app/(dashboard)/method/[type]/page.tsx`

---

## 4) Verification performed

- **Syntax parse** (TypeScript 5.6 parser, TSX-aware) across every modified file — `All files parse OK.`
- **Shape parity** across every locale pair (`ko/en`, `ko/zh` and their `-pages`, `-dash2`, `-dash3` counterparts) via a runtime AST-shape diff — every pair reports `OK`, i.e. no key exists in one locale without the same key in the others, guaranteeing that `t(key)` always resolves to a string (never falls back to echoing the raw key).
- **Read-through of every changed component** to confirm hooks stay call-consistent (`useTranslation` at the top, `useMemo` factories over `t`), and that no removed import leaves dangling references (`THESIS_CATEGORIES` removed cleanly from `writing/page.tsx` and `structure/page.tsx`).

---

## 5) Known gap deferred to a later content pass

The `RDOS Research Basics` and other RDOS lesson bodies live in `lib/rdos/lesson-content.ts` (1 MB / 13,694 lines of curated Korean prose plus quizzes). These are content, not UI chrome, and require a professional translation pass with subject-matter review rather than a mechanical string swap — deferred deliberately. The RDOS shell chrome (sidebar labels, dashboard headings, buttons, quiz interface, save/logout controls) already responds to `KO / EN / ZH`.
