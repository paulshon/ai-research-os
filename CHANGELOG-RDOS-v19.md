# CHANGELOG — RDOS / AI-Research-OS v19 (s19)

## Landing page logo (EN)

- Navbar and footer wordmark use `whitespace-nowrap` so **AI Research OS** stays on one line when switching to English (matches design mock-up).

## Knowledge Core — full KO / EN / ZH switching

- New `apps/web/lib/rdos/knowledge-content-i18n.ts` localizes:
  - 5 learning objectives
  - 12 L0 modules (domain + item tags)
  - 8 thesis chapters (title, role, principle, description)
  - 31 research terms (definition, analogy, usage)
  - 12 knowledge lessons (title, subtitle, HTML content, 20-question quizzes each)
- `rdos-knowledge-view.tsx` applies localization via `useMemo` + `localizeKnowledge*` helpers.
- Term search placeholder updated for Chinese (EN/ZH locale files).
- ZH shell menu: Dashboard / Research Basics → 看板 / 研究基础.

## RDOS menu learning pages

- `lesson-body-i18n-data.ts` (generated) supplies EN/ZH lesson HTML bodies and quiz items for all 60 menu lessons; merged into `LESSON_BODY_I18N` in `rdos-content-i18n.ts`.
- Lesson list chrome was already localized in v16/v17; bodies and quizzes now follow locale.

## Scholar certification page

- Badge labels use `localizeBadge()` instead of raw Korean kernel strings.

## Regeneration scripts

- `node scripts/generate-knowledge-content-i18n.mjs`
- `node scripts/generate-lesson-body-i18n.mjs`

## Verification

- `apps/web`: `npm run typecheck` — OK
- `apps/web`: `npm run build` — OK
