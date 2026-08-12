/**
 * Config — 모노레포 공유 설정, 상수, 디자인 토큰
 */

/* ── 디자인 토큰 (원본 index.html CSS에서 추출) ── */
export const COLORS = {
  bg: "#0d0f14",
  bg2: "#13161e",
  bg3: "#1a1e2a",
  bg4: "#222637",
  surface: "#1e2230",
  border: "rgba(255, 255, 255, 0.07)",
  border2: "rgba(255, 255, 255, 0.13)",
  text: "#e8eaf0",
  text2: "#9ba3b8",
  text3: "#626880",
  accent: "#6c8cff",
  accent2: "#4a6cf7",
  gold: "#e8b84b",
  teal: "#3ecfb2",
  coral: "#ff7066",
  purple: "#a78bfa",
  green: "#5ebd7c",
  pink: "#ec4899",
} as const;

/* ── 엔진 메타데이터 ── */
export const ENGINE_ICONS: Record<string, { icon: string; color: string }> = {
  structure:  { icon: "⬡", color: COLORS.accent },
  chat:       { icon: "◈", color: COLORS.teal },
  editor:     { icon: "✍", color: COLORS.purple },
  analyzer:   { icon: "🔬", color: "#f59e0b" },
  validation: { icon: "🛡", color: COLORS.coral },
  workflow:   { icon: "📋", color: COLORS.gold },
  advisor:    { icon: "👨‍🏫", color: COLORS.pink },
  library:    { icon: "📚", color: COLORS.green },
  critique:   { icon: "📝", color: "#f472b6" },
};

/* ── 논문 유형 ── */
export const THESIS_TYPES = [
  { value: "quantitative", label: "양적 연구", en: "Quantitative" },
  { value: "qualitative", label: "질적 연구", en: "Qualitative" },
  { value: "mixed", label: "혼합 연구", en: "Mixed Methods" },
  { value: "experimental", label: "실험 연구", en: "Experimental" },
] as const;

/* ── 검증 유형 ── */
export const VALIDATION_TYPES = [
  { value: "logic", label: "논리 검증", severity: "error" },
  { value: "methodology", label: "방법론 검증", severity: "warning" },
  { value: "citation", label: "인용 검증", severity: "warning" },
  { value: "structure", label: "구조 검증", severity: "error" },
  { value: "tone", label: "어조 검증", severity: "info" },
  { value: "hallucination", label: "환각 체크", severity: "error" },
  { value: "plagiarism", label: "표절 검사", severity: "error" },
] as const;

/* ── 워크플로우 단계 ── */
export const WORKFLOW_PHASES = [
  { value: "planning", label: "기획", order: 1 },
  { value: "literature_review", label: "문헌 검토", order: 2 },
  { value: "methodology", label: "방법론 설계", order: 3 },
  { value: "data_collection", label: "데이터 수집", order: 4 },
  { value: "analysis", label: "분석", order: 5 },
  { value: "writing", label: "작성", order: 6 },
  { value: "revision", label: "수정·교정", order: 7 },
  { value: "submission", label: "제출", order: 8 },
] as const;

/* ── Gemini 모델 옵션 ── */
export const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "빠른 응답, 비용 효율적" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "고품질 출력, 복잡한 작업" },
] as const;

/* ── 인용 포맷 ── */
export const CITATION_FORMATS = [
  { value: "apa7", label: "APA 7th Edition" },
  { value: "mla9", label: "MLA 9th Edition" },
  { value: "chicago", label: "Chicago Manual of Style" },
  { value: "ieee", label: "IEEE" },
  { value: "vancouver", label: "Vancouver" },
] as const;

/* ── API 경로 상수 ── */
export const API_ROUTES = {
  AI_GENERATE: "/ai/generate",
  PROJECTS: "/projects",
  CITATIONS: "/citations",
  VALIDATION: "/validation",
  WORKFLOWS: "/workflows",
  PARSERS: "/parsers",
} as const;
