export type ProofCategory =
  | "spelling"
  | "grammar"
  | "academic-style"
  | "notation"
  | "terminology"
  | "readability";

export const PROOF_CATEGORY_ORDER: ProofCategory[] = [
  "spelling",
  "grammar",
  "academic-style",
  "notation",
  "terminology",
  "readability",
];

export const PROOF_CATEGORY_LABEL: Record<ProofCategory, string> = {
  spelling: "맞춤법",
  grammar: "문법",
  "academic-style": "학술 문체",
  notation: "표기 규범",
  terminology: "용어 일관성",
  readability: "문장 길이",
};

export const PROOF_CATEGORY_BADGE: Record<ProofCategory, "danger" | "warn" | "info"> = {
  spelling: "danger",
  grammar: "danger",
  "academic-style": "warn",
  notation: "warn",
  terminology: "info",
  readability: "warn",
};
