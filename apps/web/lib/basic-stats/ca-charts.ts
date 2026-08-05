// 내용분석 자체 그래프 엔진 — methodos-f15.
// 데이터시각화 모듈(Plotly/viz)에 연동하지 않고, 내용분석 결과에서 직접 SVG 차트를 생성한다.
// 차트 유형은 두 문헌(Beautiful Visualization, O'Reilly 2010 / Visualization for Social Data
// Science, Beecham 2026)에서 사회·텍스트 자료에 자주 쓰이는 형태를 분석해 선정:
//   막대·가로막대·누적막대·묶음막대·롤리팝(빈도/순위), 선·영역(추세), 파이·도넛(구성비),
//   히트맵·행렬(교차/공출현), 버블(2축 강조), 워드클라우드(어휘 빈도), 네트워크(공출현 관계),
//   트리맵(범주-하위범주 계층), 레이더(다차원 비교).

export type CaChartType =
  | "bar" | "hbar" | "stacked" | "grouped" | "line" | "area"
  | "pie" | "donut" | "lollipop" | "heatmap" | "bubble"
  | "wordcloud" | "network" | "treemap" | "radar"
  // 확장(Beautiful Visualization / Visualization for Social Data Science 분석 반영)
  | "scatter" | "histogram" | "boxplot" | "slope" | "waffle"
  | "dotstrip" | "polar" | "radialbar" | "sankey" | "streamgraph"
  | "parallel" | "arc" | "bump" | "dumbbell" | "stackedarea";

export interface CaSeries { name: string; values: number[]; }
export interface CaNode { id: string; weight?: number; group?: number; }
export interface CaEdge { a: string; b: string; w: number; }
export interface CaTreeItem { label: string; value: number; group?: string; }

export interface CaChartSpec {
  type: CaChartType;
  title?: string;
  labels: string[];        // 범주/축 라벨 (막대·선·파이·히트맵 행 등)
  cols?: string[];         // 히트맵/누적/묶음의 열(시리즈 라벨)
  series: CaSeries[];      // 1개 이상 시리즈
  nodes?: CaNode[];        // network
  edges?: CaEdge[];        // network
  tree?: CaTreeItem[];     // treemap
  unit?: string;           // 값 단위(예: "건", "%")
  note?: string;
}

// 차트 유형 메타(선택 UI·설명용)
export const CA_CHART_META: { type: CaChartType; name: string; desc: string; needs: string }[] = [
  { type: "bar", name: "세로 막대", desc: "범주별 빈도를 크기로 비교", needs: "범주×값" },
  { type: "hbar", name: "가로 막대", desc: "라벨이 길거나 항목이 많을 때 순위 비교", needs: "범주×값" },
  { type: "lollipop", name: "롤리팝", desc: "막대의 잉크를 줄여 순위를 강조", needs: "범주×값" },
  { type: "pie", name: "파이", desc: "전체 대비 각 범주의 구성비", needs: "구성비" },
  { type: "donut", name: "도넛", desc: "구성비 + 가운데 총계 강조", needs: "구성비" },
  { type: "treemap", name: "트리맵", desc: "범주-하위범주의 크기 계층", needs: "계층×값" },
  { type: "stacked", name: "누적 막대", desc: "문서별 범주 구성을 한 막대에 누적", needs: "행×열 행렬" },
  { type: "grouped", name: "묶음 막대", desc: "문서별 범주를 나란히 비교", needs: "행×열 행렬" },
  { type: "heatmap", name: "히트맵(행렬)", desc: "교차표·공출현을 색 농도로", needs: "행×열 행렬" },
  { type: "line", name: "선", desc: "연도 등 순서축의 추세", needs: "순서축×값" },
  { type: "area", name: "영역", desc: "추세 + 누적량 강조", needs: "순서축×값" },
  { type: "bubble", name: "버블", desc: "빈도·비율을 원 크기로", needs: "범주×값" },
  { type: "radar", name: "레이더", desc: "여러 지표를 한 도형으로 비교", needs: "다지표" },
  { type: "wordcloud", name: "워드클라우드", desc: "어휘 빈도를 글자 크기로", needs: "어휘×빈도" },
  { type: "network", name: "네트워크", desc: "함께 나온 범주의 관계망", needs: "공출현 쌍" },
  // 확장 유형
  { type: "scatter", name: "산점도", desc: "값의 분포를 점으로(순위×값)", needs: "범주×값" },
  { type: "histogram", name: "히스토그램", desc: "값의 도수분포", needs: "값 분포" },
  { type: "boxplot", name: "박스플롯", desc: "사분위·중앙값 분포 요약", needs: "값 분포" },
  { type: "slope", name: "기울기 그래프", desc: "두 시점/그룹 간 변화", needs: "행×2열" },
  { type: "waffle", name: "와플", desc: "100칸 격자로 구성비", needs: "구성비" },
  { type: "dotstrip", name: "닷 스트립", desc: "값을 한 축의 점으로", needs: "범주×값" },
  { type: "polar", name: "폴라(방사)", desc: "각 범주를 부채꼴 길이로", needs: "범주×값" },
  { type: "radialbar", name: "방사형 막대", desc: "원형 축의 막대", needs: "범주×값" },
  { type: "sankey", name: "생키", desc: "범주 간 흐름·연결량", needs: "관계 쌍" },
  { type: "arc", name: "아크 다이어그램", desc: "한 축 위 관계를 호로 연결", needs: "관계 쌍" },
  { type: "streamgraph", name: "스트림그래프", desc: "누적 흐름의 변화", needs: "행×열 행렬" },
  { type: "stackedarea", name: "누적 영역", desc: "구성의 누적 추세", needs: "행×열 행렬" },
  { type: "parallel", name: "평행좌표", desc: "여러 축을 가로지르는 선", needs: "행×열 행렬" },
  { type: "bump", name: "범프(순위)", desc: "순위 변화 추적", needs: "행×열 행렬" },
  { type: "dumbbell", name: "덤벨", desc: "두 값 사이 격차", needs: "행×2열" },
];

// 데이터 모양별 적용 가능한 전체 차트 카탈로그(두 문헌 분석 기반 — 마지막 단계 그래프에서 자유 선택)
const CAT = ["bar", "hbar", "lollipop", "dotstrip", "pie", "donut", "waffle", "treemap", "bubble", "polar", "radialbar", "scatter", "histogram", "boxplot"] as CaChartType[];
const MATRIX = ["heatmap", "stacked", "grouped", "stackedarea", "streamgraph", "parallel", "bump", "radar"] as CaChartType[];
const RELATION = ["network", "sankey", "arc", "heatmap"] as CaChartType[];
const TREND = ["line", "area", "stackedarea", "bar", "slope", "bump", "scatter"] as CaChartType[];
export const ALL_CATEGORY_TYPES = CAT;
export const ALL_MATRIX_TYPES = MATRIX;
export const ALL_RELATION_TYPES = RELATION;
export const ALL_TREND_TYPES = TREND;

// 각 데이터에 적합한 차트 유형 후보(워크벤치 선택지) — 마지막 단계 그래프는 전체 카탈로그 노출
export const CHART_OPTIONS_BY_DATA: Record<string, CaChartType[]> = {
  freqCategory: CAT,
  freqTerm: ["wordcloud", "hbar", "bar", "bubble", "treemap", "dotstrip", "waffle"],
  crosstab: MATRIX,
  cooccur: RELATION,
  reliability: ["bar", "hbar", "radar", "lollipop", "dotstrip", "polar", "radialbar"],
  trend: TREND,
};

// ── 빌더: 내용분석 결과 → ChartSpec ──
interface FreqLike { label?: string; term?: string; code?: string; n?: number; count?: number; pct?: number; }

export function specFromFreq(rows: FreqLike[], type: CaChartType = "bar", unit = "건"): CaChartSpec {
  const top = rows.slice(0, 14);
  return {
    type, unit,
    labels: top.map((r) => r.label || r.term || r.code || ""),
    series: [{ name: "빈도", values: top.map((r) => Number(r.n ?? r.count ?? 0)) }],
  };
}

export function specFromTerms(rows: FreqLike[], type: CaChartType = "wordcloud"): CaChartSpec {
  const top = rows.slice(0, 40);
  return {
    type, unit: "회",
    labels: top.map((r) => r.term || r.label || ""),
    series: [{ name: "빈도", values: top.map((r) => Number(r.count ?? r.n ?? 0)) }],
  };
}

export interface CrosstabLike { rowLabels: string[]; cols: string[]; matrix: number[][]; }
export function specFromCrosstab(ct: CrosstabLike, type: CaChartType = "heatmap"): CaChartSpec {
  return {
    type, unit: "건",
    labels: ct.rowLabels,
    cols: ct.cols,
    series: ct.rowLabels.map((nm, i) => ({ name: nm, values: ct.matrix[i] || [] })),
  };
}

export interface CoOccurLike { a: string; b: string; count: number; }
export function specFromCooccur(pairs: CoOccurLike[], type: CaChartType = "network"): CaChartSpec {
  const nodeW: Record<string, number> = {};
  pairs.forEach((p) => { nodeW[p.a] = (nodeW[p.a] || 0) + p.count; nodeW[p.b] = (nodeW[p.b] || 0) + p.count; });
  const nodes: CaNode[] = Object.entries(nodeW).map(([id, w]) => ({ id, weight: w }));
  const edges: CaEdge[] = pairs.map((p) => ({ a: p.a, b: p.b, w: p.count }));
  if (type === "heatmap") {
    const ids = nodes.map((n) => n.id);
    const idx: Record<string, number> = {}; ids.forEach((id, i) => (idx[id] = i));
    const m = ids.map(() => ids.map(() => 0));
    pairs.forEach((p) => { m[idx[p.a]][idx[p.b]] = p.count; m[idx[p.b]][idx[p.a]] = p.count; });
    return { type, labels: ids, cols: ids, series: ids.map((nm, i) => ({ name: nm, values: m[i] })), unit: "동시" };
  }
  return { type, labels: nodes.map((n) => n.id), series: [{ name: "공출현", values: nodes.map((n) => n.weight || 0) }], nodes, edges, unit: "동시" };
}

export interface RelLike { label: string; pct: number; }
export function specFromReliability(rows: RelLike[], type: CaChartType = "bar"): CaChartSpec {
  return { type, unit: "%", labels: rows.map((r) => r.label), series: [{ name: "일치율", values: rows.map((r) => r.pct) }] };
}

export function specFromTrend(labels: string[], values: number[], type: CaChartType = "line", unit = "건"): CaChartSpec {
  return { type, unit, labels, series: [{ name: "추세", values }] };
}

// 엔진 결과에 저장된 직렬화 가능한 데이터(kind+data)에서 차트 유형만 바꿔 재생성.
export type ChartKind = "freq" | "terms" | "reliability" | "crosstab" | "cooccur" | "trend";
export function buildChartByKind(kind: ChartKind, data: any, type: CaChartType): CaChartSpec {
  switch (kind) {
    case "freq": return specFromFreq(data || [], type);
    case "terms": return specFromTerms(data || [], type);
    case "reliability": return specFromReliability(data || [], type);
    case "crosstab": return specFromCrosstab(data, type);
    case "cooccur": return specFromCooccur(data || [], type);
    case "trend": return specFromTrend(data?.labels || [], data?.values || [], type);
    default: return { type, labels: [], series: [] };
  }
}

// 색상 팔레트(라이트/다크 양쪽에서 식별 가능, 색약 고려한 정성 팔레트)
export const CA_PALETTE = [
  "#534AB7", "#2E86C1", "#16A085", "#E67E22", "#C0392B",
  "#8E44AD", "#27AE60", "#D4A017", "#2C7BB6", "#D7191C",
  "#7B6CF6", "#1ABC9C",
];
export const palette = (i: number) => CA_PALETTE[i % CA_PALETTE.length];
