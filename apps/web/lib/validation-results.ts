export interface ValidationResultItem {
  severity: string;
  title: string;
  desc: string;
  score?: number;
}

const ARRAY_KEYS = [
  "results",
  "findings",
  "items",
  "data",
  "issues",
  "validation",
  "검증결과",
  "결과",
];

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function normalizeSeverity(raw: unknown): string {
  const s = String(raw ?? "info").toLowerCase();
  if (s.includes("error") || s.includes("fail") || s.includes("오류") || s.includes("심각")) {
    return "error";
  }
  if (s.includes("warn") || s.includes("주의") || s.includes("경고")) {
    return "warning";
  }
  if (s.includes("pass") || s.includes("ok") || s.includes("success") || s.includes("통과")) {
    return "success";
  }
  return "info";
}

function normalizeItem(raw: unknown, index: number): ValidationResultItem {
  if (typeof raw === "string") {
    return { severity: "info", title: `항목 ${index + 1}`, desc: raw };
  }
  if (typeof raw !== "object" || raw === null) {
    return { severity: "info", title: `항목 ${index + 1}`, desc: String(raw ?? "") };
  }

  const o = raw as Record<string, unknown>;
  const title =
    pickString(o, [
      "title",
      "name",
      "issue",
      "finding",
      "label",
      "category",
      "항목",
      "제목",
      "문제",
    ]) || `검증 항목 ${index + 1}`;

  const desc = pickString(o, [
    "desc",
    "description",
    "detail",
    "message",
    "content",
    "text",
    "recommendation",
    "suggestion",
    "feedback",
    "설명",
    "내용",
    "권고",
  ]);

  const scoreRaw = o.score ?? o.points ?? o.점수;
  const score =
    typeof scoreRaw === "number"
      ? scoreRaw
      : typeof scoreRaw === "string" && scoreRaw.trim()
        ? Number.parseInt(scoreRaw, 10)
        : undefined;

  return {
    severity: normalizeSeverity(o.severity ?? o.level ?? o.type ?? o.status ?? o.등급),
    title,
    desc: desc || title,
    score: Number.isFinite(score) ? score : undefined,
  };
}

function extractArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  for (const key of ARRAY_KEYS) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return null;
}

/** Parse Gemini validation output into display-ready items. */
export function parseValidationResponse(raw: string): ValidationResultItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (jsonMatch?.[1] ?? trimmed).trim();

  try {
    const parsed = JSON.parse(candidate) as unknown;
    const arr = extractArray(parsed);
    if (arr && arr.length > 0) {
      return arr.map((item, i) => normalizeItem(item, i)).filter((r) => r.desc || r.title);
    }
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const single = normalizeItem(parsed, 0);
      if (single.desc) return [single];
    }
  } catch {
    /* fall through to plain-text parsing */
  }

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((line, i) => ({
      severity: "info",
      title: `검증 항목 ${i + 1}`,
      desc: line,
    }));
  }

  return [{ severity: "info", title: "AI 검증 결과", desc: trimmed }];
}
