import type { ProofCategory } from "./categories";

export interface ProofRule {
  id: string;
  category: ProofCategory;
  subLabel: string;
  /** 전역(g) 플래그가 있는 정규식. */
  pattern: RegExp;
  /** 매치된 문자열을 올바른 표현으로 바꾼다. */
  fix: (match: string) => string;
  reason: string;
  /** 규칙 기반의 확실한 오류만 true. 문맥 판단이 필요한 문체 항목은 false. */
  autoApplicable: boolean;
}

/**
 * 국립국어원 한글 맞춤법 기준의 확정적 오류 패턴.
 * 여기 실린 규칙은 문맥과 무관하게 항상 틀린 표기이므로 자동 적용 대상이다.
 */
export const PROOF_RULES: ProofRule[] = [
  // ── 이중피동 (문법) ──
  {
    id: "double-passive-doeojida",
    category: "grammar",
    subLabel: "이중피동",
    pattern: /되어지(다|는|며|고|므로)/g,
    fix: (m) => m.replace("되어지", "되"),
    reason: "‘되다’가 이미 피동인데 ‘–어지다’를 겹쳐 썼습니다(이중피동). 학위논문 심사에서 가장 자주 지적되는 오류입니다.",
    autoApplicable: true,
  },
  {
    id: "double-passive-doeojyeotda",
    category: "grammar",
    subLabel: "이중피동",
    pattern: /되어졌(다|으며|고)/g,
    fix: (m) => m.replace("되어졌", "되었"),
    reason: "‘되다’의 과거형에 ‘–어지다’를 겹쳐 쓴 이중피동입니다. ‘되었다’로 충분합니다.",
    autoApplicable: true,
  },
  {
    id: "double-passive-doeojil",
    category: "grammar",
    subLabel: "이중피동",
    pattern: /되어질/g,
    fix: () => "될",
    reason: "‘되다’의 미래형에 ‘–어지다’를 겹쳐 쓴 이중피동입니다. ‘될’로 충분합니다.",
    autoApplicable: true,
  },
  {
    id: "passive-natana-jyeoss",
    category: "grammar",
    subLabel: "이중피동",
    pattern: /나타나\s?졌(으며|다|고)/g,
    fix: (m) => m.replace(/나타나\s?졌/, "나타났"),
    reason: "‘나타나다’는 이미 자동사인데 보조용언 ‘–지다’를 붙였습니다. ‘나타났다’가 올바른 표기입니다.",
    autoApplicable: true,
  },

  // ── 번역투 (학술 문체) ──
  {
    id: "translationese-e-isseoseo",
    category: "academic-style",
    subLabel: "번역투",
    pattern: /에\s?있어서/g,
    fix: () => "에서",
    reason: "‘~에 있어서’는 일본어 어법을 그대로 옮긴 번역투입니다. 조사 ‘에서’ 또는 ‘의’로 충분합니다.",
    autoApplicable: true,
  },
  {
    id: "wordiness-lago-hal-su-isseul-geosida",
    category: "academic-style",
    subLabel: "군더더기",
    pattern: /라고\s?할\s?수\s?있을\s?것이다/g,
    fix: () => "다",
    reason: "단정을 피하려다 문장만 길어진 군더더기 표현입니다. 간결하게 단정형으로 바꾸는 편이 좋습니다.",
    autoApplicable: false,
  },
  {
    id: "hedge-geot-gatda",
    category: "academic-style",
    subLabel: "추측 표현",
    pattern: /인\s?것\s?같다/g,
    fix: () => "으로 보인다",
    reason: "‘~인 것 같다’는 구어적 추측입니다. 학술 문장은 근거를 곁들인 절제된 추정(‘~으로 보인다’, ‘~일 가능성이 있다’)을 씁니다.",
    autoApplicable: false,
  },
  {
    id: "hedge-amado",
    category: "academic-style",
    subLabel: "추측 표현",
    pattern: /아마도/g,
    fix: () => "",
    reason: "‘아마도’는 구어적 추측 부사입니다. 근거 있는 해석으로 바꾸거나 삭제하세요.",
    autoApplicable: false,
  },

  // ── 사이시옷 · 두음법칙 등 (맞춤법) ──
  { id: "spell-chotjeom", category: "spelling", subLabel: "사이시옷", pattern: /촛점/g, fix: () => "초점", reason: "한자어 ‘초점(焦點)’은 사이시옷을 적지 않습니다.", autoApplicable: true },
  { id: "spell-gaesu", category: "spelling", subLabel: "사이시옷", pattern: /갯수/g, fix: () => "개수", reason: "한자어 ‘개수(個數)’는 사이시옷을 적지 않습니다.", autoApplicable: true },
  { id: "spell-sitga", category: "spelling", subLabel: "사이시옷", pattern: /싯가/g, fix: () => "시가", reason: "한자어 ‘시가(時價)’는 사이시옷을 적지 않습니다.", autoApplicable: true },
  { id: "spell-daetga", category: "spelling", subLabel: "사이시옷", pattern: /댓가/g, fix: () => "대가", reason: "한자어 ‘대가(代價)’는 사이시옷을 적지 않습니다.", autoApplicable: true },
  { id: "spell-myeochil", category: "spelling", subLabel: "표기 오류", pattern: /몇일/g, fix: () => "며칠", reason: "‘몇 일’이 아니라 하나의 낱말 ‘며칠’로 적습니다.", autoApplicable: true },
  { id: "spell-wenji", category: "spelling", subLabel: "표기 오류", pattern: /웬지/g, fix: () => "왠지", reason: "‘왠지(왜인지)’가 올바른 표기입니다.", autoApplicable: true },
  { id: "spell-waenil", category: "spelling", subLabel: "표기 오류", pattern: /왠일/g, fix: () => "웬일", reason: "‘웬일’이 올바른 표기입니다(‘왠’은 ‘왜인’의 준말일 때만 씁니다).", autoApplicable: true },
  { id: "spell-doebwatda", category: "spelling", subLabel: "되/돼", pattern: /됬(다|고|으며|어|던)/g, fix: (m) => m.replace("됬", "됐"), reason: "‘됬다’는 잘못된 표기입니다. ‘되었다’의 준말은 ‘됐다’입니다.", autoApplicable: true },

  // ── 띄어쓰기 (맞춤법) ──
  { id: "spacing-bol-ttae", category: "spelling", subLabel: "띄어쓰기", pattern: /볼때/g, fix: () => "볼 때", reason: "의존명사 ‘때’는 앞말과 띄어 씁니다.", autoApplicable: true },
  { id: "spacing-geureomedo-bulguhago", category: "spelling", subLabel: "띄어쓰기", pattern: /그럼에도불구하고/g, fix: () => "그럼에도 불구하고", reason: "‘불구하고’는 앞말과 띄어 씁니다.", autoApplicable: true },
  { id: "spacing-hangaji", category: "spelling", subLabel: "띄어쓰기", pattern: /할수있다/g, fix: () => "할 수 있다", reason: "의존명사 ‘수’는 앞말과 띄어 씁니다.", autoApplicable: true },
];

/** 한 개념에 여러 표기가 섞여 있는지 검사하기 위한 용어군. */
export interface TermVariantGroup {
  id: string;
  canonical: string;
  variants: string[];
}

export const TERM_VARIANT_GROUPS: TermVariantGroup[] = [
  { id: "mz-generation", canonical: "MZ세대", variants: ["MZ세대", "MZ 세대", "엠지세대", "엠지 세대"] },
  { id: "organizational-commitment", canonical: "조직몰입", variants: ["조직몰입", "조직 몰입"] },
  { id: "turnover-intention", canonical: "이직의도", variants: ["이직의도", "이직 의도"] },
];
