# CHANGELOG-RDOS-v16 (s17)

> **Package:** `AI-Research-OS_RDOS_-s17.zip`
> **Focus:** Make KO ↔ EN ↔ ZH switching actually take effect on **every RDOS (Aspiring Researcher Plan) page** and on **mobile for both plans** (RDOS and AI-Research-OS / Researcher Plan).

---

## 1) Two distinct root causes found

### A. Mobile had no language switcher on the Researcher (AROS) plan
`components/dashboard/dashboard-shell.tsx` renders the KO/EN/ZH switcher only inside the **desktop top tab bar**, which is `hidden md:flex` — i.e. removed below 768px. The separate **mobile header** (shown `md:hidden`) contained only the logo, with **no switcher at all**. Result: on phones/tablets a Researcher-plan user literally had no control to change language, so "전환이 전혀 반영되지 않음".

**Fix:** the mobile header now renders `ThemeToggleCompact` + `LanguageSwitcher (compact)` to the right of the logo, inside the `md:hidden` header. The header changed from `justify-center` (logo only) to `justify-between` (logo left, controls right), and the wordmark got `whitespace-nowrap` so it can't wrap next to the new controls.

The RDOS shell (`components/rdos/rdos-shell.tsx`) already exposed a compact switcher in its mobile header — so its *switcher UI* worked — but see cause B for why switching still appeared to do nothing on RDOS.

### B. RDOS curriculum content was untranslated data
Every RDOS learning page (`basics, structure, design, method, reading, apa, writing, tutor`) renders `RDOS_LESSON_CONTENT[key]` from `lib/rdos/lesson-content.ts`, which is authored **only in Korean** (module label/intro/objectives/rewards + 60 lesson titles/subtitles + 60 lesson bodies + 1,200 quiz questions). Because these are *data*, not `t()` calls, flipping the locale changed nothing on the lesson list, headers, objectives, or lesson titles. The RDOS dashboard's mission cards and competency bars had the same problem — their labels come from the RDOS kernel (`packages/rdos-core/src/derive.ts`) as Korean strings.

**Fix:** a new localization layer, `lib/rdos/rdos-content-i18n.ts`:
- `MODULE_I18N[locale][moduleKey]` — full EN + ZH translations of every module's `label`, `provides`, `intro`, `objectives[]`, and `reward[]` (8 modules × 3 locales).
- `LESSON_META_I18N[locale][lessonId]` — EN + ZH `title` + `subtitle` for **all 60 lessons**.
- `localizeLessonContent(content, locale)` — merges the above over the Korean source; lesson **bodies** and **quiz** items fall back to Korean when a translation isn't supplied (chrome still switches). Korean is a pure pass-through (identity).
- `localizeMissionLabel(key, field, fallback, locale)` — resolves a kernel-provided mission `label`/`provides` to the current locale by module key.
- `LESSON_BODY_I18N` — an empty, shape-typed store so lesson **bodies/quizzes** can be translated incrementally without touching this file.

Wired in:
- `components/rdos/rdos-lesson-view.tsx` — localizes the incoming `content` via `useMemo(localizeLessonContent(rawContent, locale))`. Now the lesson list, progress header, objectives grid, reward chips, and every lesson's title/subtitle respond to KO/EN/ZH on all devices.
- `components/rdos/rdos-dashboard-view.tsx` — mission status panel, "Learning Menu" cards (`title` + `provides`), and the competency bars are all localized. Competency labels use a new `rdos.dashboard.competencyLabels.<key>` block (matched by the kernel's `CompetencyKey`).

New i18n keys added to `ko-rdos / en-rdos / zh-rdos` under `rdos.dashboard.competencyLabels`: `researchLiteracy, academicLiteracy, thinkingLiteracy, methodLiteracy, writingLiteracy, aiLiteracy`.

---

## 2) Marketing navbar breakpoint consistency (carry-over polish)

`components/marketing/navbar.tsx`: the desktop action cluster (switcher + admin + login + signup) was `hidden lg:flex` while the nav-links were `xl:flex` and the hamburger `xl:hidden`. In the 1024–1280px band this produced a hamburger *and* a half-populated desktop bar. Aligned the action cluster to `hidden xl:flex` so the desktop chrome appears as one unit at ≥1280px, and everything below uses the mobile sheet (which already contains the switcher, login, and signup). No page loses access to language switching at any width.

---

## 3) Files modified / added

**New:**
- `apps/web/lib/rdos/rdos-content-i18n.ts` — RDOS curriculum localization layer (module + lesson structural translations, mission label resolver, incremental body store).

**Modified:**
- `apps/web/components/dashboard/dashboard-shell.tsx` — mobile header now carries the language switcher (Researcher-plan mobile fix).
- `apps/web/components/rdos/rdos-lesson-view.tsx` — applies `localizeLessonContent`.
- `apps/web/components/rdos/rdos-dashboard-view.tsx` — localizes missions + competency labels.
- `apps/web/components/marketing/navbar.tsx` — breakpoint consistency.
- `apps/web/lib/i18n/locales/ko-rdos.ts`, `en-rdos.ts`, `zh-rdos.ts` — added `dashboard.competencyLabels`.

---

## 4) Verification performed (pre-package)

- **Syntax parse** (TypeScript 5.6, TSX-aware) of all changed/added files → `All files parse OK.`
- **Shape parity** of `ko-rdos / en-rdos / zh-rdos` after adding `competencyLabels` → both pairs `OK` (no key present in one locale but missing in another; `t()` never echoes a raw key).
- **Structural completeness** of `rdos-content-i18n.ts`: automated check confirms **all 60 lesson metas present in EN and in ZH**, and all 8 module keys present in ko/en/zh.
- **Functional test** of the localizer against a representative `LessonContent`:
  - EN → `label: Research Basics`, `provides: Research fundamentals`, lesson `b1` → `What Is Research / The essence of scholarly inquiry`; Korean body correctly retained as fallback.
  - ZH → `label: 研究基础`, lesson `b1` → `什么是研究`.
  - KO → pure pass-through (identity, no allocation).
  - `localizeMissionLabel` resolves per-locale (`design/provides` ZH → `撰写研究问题`) and passes through for KO.

---

## 5) Coverage summary — where KO/EN/ZH now switches

**Researcher (AI-Research-OS) plan**
- Desktop / tablet: already worked; unchanged.
- **Mobile: now has a switcher** in the top header (previously absent) → chrome and all previously-localized pages switch.

**Aspiring Researcher (RDOS) plan — all pages**
- Shell (sidebar, tablet rail, mobile header/bottom-nav/full-menu sheet): already localized.
- **Dashboard**: mission cards, mission-status panel, competency bars now localized.
- **All 8 learning pages** (basics/structure/design/method/reading/apa/writing/tutor): module label, intro, objectives, rewards, and every lesson's **title + subtitle** now switch KO/EN/ZH on desktop, tablet, and mobile.

---

## 6) Known remaining content gap (documented, incrementally fillable)

The deep prose corpora — each lesson's **HTML body** and its **~20 quiz questions** (60 lessons ≈ 1,200 questions), plus the knowledge-core term definitions in `lib/rdos/knowledge-core.ts` — remain Korean. These require professional translation with subject-matter review, not a mechanical swap. The infrastructure to localize them is now in place: drop entries into `LESSON_BODY_I18N[locale][lessonId] = { content, quiz }` and they surface automatically with **no further code changes**. Until then, opening a lesson body shows Korean prose while all surrounding navigation/labels are fully localized.
