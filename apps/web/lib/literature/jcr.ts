/**
 * Clarivate JCR(2025년 JIF, 2026년 공개) 조회. 데이터: ./jcr-2026.json (scripts/build-jcr-data.cjs 로 엑셀에서 생성).
 * L1(공개 API) 검색 결과는 저널 이름만 있어서 이름으로 맞춘다. 여러 저널이 쓰는 일반명("Innovation" 등)은 오결합되기 쉬워
 * ISSN 이 있을 때만 맞춘다.
 */
import raw from "./jcr-2026.json";

export interface JcrInfo {
  name: string;
  issn: string;
  eissn: string;
  /** JIF. 0.05 는 JCR 표기 "<0.1" 을 뜻한다. 값이 없으면 null */
  jif: number | null;
  /** "Q1".."Q4" 또는 "" */
  q: string;
  jif5: number | null;
  /** 소문자 색인 키: scie, ssci, ahci, esci */
  indexes: string[];
  category: string;
}

export const JCR_VERSION: string = (raw as any).version;

type Rec = [string, string, string, number | null, string, number | null, number, string];
const DATA = (raw as any).data as Rec[];

let byIssn: Map<string, number> | null = null;
let byName: Map<string, number> | null = null;

export function normJournalName(s: string): string {
  return String(s ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");
}

function build() {
  if (byName) return;
  byIssn = new Map();
  byName = new Map();
  DATA.forEach((r, i) => {
    if (r[1]) byIssn!.set(r[1], i);
    if (r[2] && !byIssn!.has(r[2])) byIssn!.set(r[2], i);
    const n = normJournalName(r[0]);
    if (n && !byName!.has(n)) byName!.set(n, i);
  });
}

// 서로 다른 여러 저널이 쓰는 일반적인 이름. (Nature, Science, Cell, Lancet, Sensors 같은 고유한 한 단어 저널명은 그대로 맞춘다.)
const AMBIGUOUS = new Set([
  "innovation", "innovations", "perspectives", "review", "reviews", "research", "education", "technology", "communication", "communications",
  "medicine", "society", "studies", "journal", "letters", "reports", "bulletin", "annals", "proceedings", "transactions", "science and technology",
  "theory", "practice", "development", "management", "policy", "history", "culture", "economics", "psychology", "sociology", "nursing",
]);

const EDITION_KEYS: [number, string][] = [[1, "scie"], [2, "ssci"], [4, "ahci"], [8, "esci"]];

function toInfo(r: Rec): JcrInfo {
  return {
    name: r[0], issn: r[1], eissn: r[2], jif: r[3], q: r[4], jif5: r[5],
    indexes: EDITION_KEYS.filter(([bit]) => r[6] & bit).map(([, k]) => k),
    category: r[7],
  };
}

/** 저널 이름(과 있으면 ISSN)으로 JCR 정보를 찾는다. 못 찾으면 null. */
export function lookupJcr(journal: string, issn?: string): JcrInfo | null {
  build();
  const key = String(issn ?? "").trim().toUpperCase();
  if (key && byIssn!.has(key)) return toInfo(DATA[byIssn!.get(key)!]);
  const n = normJournalName(journal);
  if (!n) return null;
  if (!key && AMBIGUOUS.has(n)) return null; // 여러 저널이 같은 이름을 쓰는 일반명은 ISSN 없이는 맞추지 않는다
  const i = byName!.get(n);
  return i === undefined ? null : toInfo(DATA[i]);
}

/** JIF 표시용 문자열("<0.1" 포함) */
export function fmtJif(jif: number | null | undefined): string {
  if (jif === null || jif === undefined) return "–";
  return jif === 0.05 ? "<0.1" : jif >= 100 ? jif.toFixed(0) : jif.toFixed(1);
}
