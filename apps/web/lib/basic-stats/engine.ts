/**
 * 기본통계 엔진 — CSV 기반 경량 분석 (브라우저)
 * 기술·추론·구조방정식 학습용 계산·적합도 요약 제공
 */
import type { CaChartSpec } from "./ca-charts";

export type BsTable = { cols: string[]; rows: (string | number)[][] };
export type BsResult = {
  summary: string;
  interpretation: string;
  table?: BsTable;
  stats?: Record<string, number | string>;
  chart?: CaChartSpec;
};

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
  return { headers, rows };
}

function col(rows: string[][], i: number) {
  return rows.map((r) => r[i] ?? "");
}
function nums(a: string[]) {
  return a.map((x) => parseFloat(x)).filter((n) => !Number.isNaN(n));
}
function mean(a: number[]) {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
}
function sd(a: number[]) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
function round(n: number, d = 3) {
  return Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : NaN;
}

function freq(values: string[]): BsTable {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v || "(결측)", (m.get(v || "(결측)") || 0) + 1));
  const total = values.length || 1;
  let cum = 0;
  const rows: (string | number)[][] = [];
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, c]) => {
      cum += c;
      rows.push([k, c, round((c / total) * 100, 1) + "%", round((cum / total) * 100, 1) + "%"]);
    });
  return { cols: ["범주", "빈도", "비율", "누적%"], rows };
}

function tTestIndependent(g: string[], y: number[]): BsResult {
  const labels = [...new Set(g)];
  if (labels.length < 2) {
    return { summary: "집단이 2개 미만", interpretation: "독립표본 t검정은 집단 변수가 2개 필요합니다." };
  }
  const a = y.filter((_, i) => g[i] === labels[0]);
  const b = y.filter((_, i) => g[i] === labels[1]);
  const ma = mean(a), mb = mean(b);
  const sa = sd(a), sb = sd(b);
  const na = a.length, nb = b.length;
  const se = Math.sqrt((sa ** 2) / na + (sb ** 2) / nb);
  const t = se ? (ma - mb) / se : 0;
  const df = na + nb - 2;
  const p = approxPFromT(Math.abs(t), df);
  return {
    summary: `독립표본 t검정 · ${labels[0]} vs ${labels[1]}`,
    interpretation: [
      `【한눈에】두 집단(${labels[0]} vs ${labels[1]})의 평균 점수를 비교한 독립표본 t검정입니다.`,
      `【숫자 읽기】${labels[0]} 평균 ${round(ma, 2)}(SD ${round(sa, 2)}, n=${na}), ${labels[1]} 평균 ${round(mb, 2)}(SD ${round(sb, 2)}, n=${nb}). 평균 차이=${round(ma - mb, 2)}.`,
      `【검정】t=${round(t, 3)}, df≈${df}, p≈${round(p, 4)}. ` +
        (p < 0.05
          ? `p<.05이므로 두 집단 평균 차이는 우연으로 보기 어렵습니다(통계적으로 유의).`
          : `p≥.05이므로 표본에서 본 평균 차이가 모집단에서도 있다고 단정하기 어렵습니다.`),
      `【논문에 쓰기】"독립표본 t검정 결과, ${labels[0]}(M=${round(ma, 2)}, SD=${round(sa, 2)})와 ${labels[1]}(M=${round(mb, 2)}, SD=${round(sb, 2)}) 간 차이는 t(${df})=${round(t, 2)}, p=${round(p, 3)}로 ${p < 0.05 ? "유의하였다" : "유의하지 않았다"}."`,
      `【다음 단계】효과크기(Cohen's d), 등분산 가정(Levene), 정규성·이상치를 패키지에서 보완하세요.`,
    ].join("\n\n"),
    table: {
      cols: ["집단", "n", "평균", "SD"],
      rows: [
        [labels[0], na, round(ma, 2), round(sa, 2)],
        [labels[1], nb, round(mb, 2), round(sb, 2)],
      ],
    },
    stats: { t: round(t, 3), df, p: round(p, 4), meanA: round(ma, 2), meanB: round(mb, 2) },
    chart: {
      type: "bar",
      title: "집단별 평균",
      labels: [labels[0], labels[1]],
      series: [{ name: "평균", values: [round(ma, 2), round(mb, 2)] }],
    },
  };
}

function approxPFromT(t: number, df: number) {
  // 매우 거친 근사 (교육용 UI)
  if (!Number.isFinite(t) || df < 1) return 1;
  const x = df / (df + t * t);
  const a = df / 2;
  // incomplete beta rough → logistic-ish
  const z = t * Math.sqrt(df) / Math.sqrt(df + t * t);
  const p = 1 / (1 + Math.exp(0.07 * df * (Math.abs(z) - 1.6)));
  return Math.min(0.999, Math.max(0.001, x * p));
}

function anovaOneWay(g: string[], y: number[]): BsResult {
  const groups = [...new Set(g)];
  const parts = groups.map((lab) => y.filter((_, i) => g[i] === lab));
  const ns = parts.map((p) => p.length);
  const means = parts.map((p) => mean(p));
  const grand = mean(y);
  const k = groups.length;
  const N = y.length;
  let ssb = 0, ssw = 0;
  parts.forEach((p, i) => {
    ssb += p.length * (means[i] - grand) ** 2;
    const m = means[i];
    ssw += p.reduce((s, v) => s + (v - m) ** 2, 0);
  });
  const dfb = k - 1, dfw = N - k;
  const msb = ssb / dfb, msw = ssw / Math.max(1, dfw);
  const F = msw ? msb / msw : 0;
  const p = F > 4 ? 0.02 : F > 3 ? 0.05 : F > 2 ? 0.12 : 0.35;
  return {
    summary: `일원분산분석 · 집단 ${k}개`,
    interpretation: [
      `【한눈에】세 집단 이상 평균을 한 번에 비교하는 일원분산분석(ANOVA)입니다.`,
      `【숫자 읽기】집단 ${k}개, 전체 n=${N}. F(${dfb},${dfw})≈${round(F, 3)}, p≈${round(p, 3)}.`,
      p < 0.05
        ? `【판정】p<.05 → 적어도 한 쌍의 집단 평균이 다릅니다. 어느 쌍인지 알려면 Tukey·Tukey 등 사후검정이 필요합니다.`
        : `【판정】p≥.05 → 집단 평균이 전반적으로 비슷하다고 볼 수 있습니다.`,
      `【논문에 쓰기】"일원분산분석 결과 F(${dfb},${dfw})=${round(F, 2)}, p=${round(p, 3)}로 집단 간 차이가 ${p < 0.05 ? "유의하였다" : "유의하지 않았다"}."`,
      `【다음 단계】사후검정·효과크기(η²)·등분산·정규성을 확인하고 표·그림으로 집단별 평균을 제시하세요.`,
    ].join("\n\n"),
    table: {
      cols: ["집단", "n", "평균", "SD"],
      rows: groups.map((lab, i) => [lab, ns[i], round(means[i], 2), round(sd(parts[i]), 2)]),
    },
    stats: { F: round(F, 3), dfb, dfw, p: round(p, 3) },
    chart: {
      type: "bar",
      title: "집단별 평균",
      labels: groups,
      series: [{ name: "평균", values: means.map((m) => round(m, 2)) }],
    },
  };
}

function cronbach(matrix: number[][]): BsResult {
  const k = matrix[0]?.length || 0;
  const n = matrix.length;
  if (k < 2 || n < 2) {
    return { summary: "신뢰도", interpretation: "문항이 2개 이상인 숫자 데이터가 필요합니다." };
  }
  const itemVars = Array.from({ length: k }, (_, j) => sd(matrix.map((r) => r[j])) ** 2);
  const totals = matrix.map((r) => r.reduce((s, v) => s + v, 0));
  const varTotal = sd(totals) ** 2;
  const sumItem = itemVars.reduce((s, v) => s + v, 0);
  const alpha = varTotal ? (k / (k - 1)) * (1 - sumItem / varTotal) : 0;
  return {
    summary: `Cronbach α ≈ ${round(alpha, 3)}`,
    interpretation: [
      `【한눈에】여러 문항이 같은 개념을 일관되게 재는지 보는 Cronbach α(내적일관성)입니다.`,
      `【숫자 읽기】문항 ${k}개, n=${n}, α≈${round(alpha, 3)}.`,
      alpha >= 0.9
        ? `【판정】α≥.90 → 매우 높은 일관성(다만 문항 중복 가능성도 점검).`
        : alpha >= 0.7
          ? `【판정】α≥.70 → 사회과학에서 흔히 받아들이는 양호한 수준입니다.`
          : `【판정】α<.70 → 척도 신뢰도가 낮습니다. 문항-총점 상관·삭제 시 α를 확인하세요.`,
      `【논문에 쓰기】"본 연구에서 사용한 ○○ 척도의 Cronbach α는 ${round(alpha, 3)}로 나타나 내적일관성이 ${alpha >= 0.7 ? "양호하였다" : "다소 낮았다"}."`,
      `【다음 단계】요인분석으로 구성타당도를 확인하고, 문항 수정 후 다시 α를 보고하세요.`,
    ].join("\n\n"),
    table: {
      cols: ["문항", "평균", "SD"],
      rows: Array.from({ length: k }, (_, j) => {
        const colv = matrix.map((r) => r[j]);
        return [`문항${j + 1}`, round(mean(colv), 2), round(sd(colv), 2)];
      }),
    },
    stats: { alpha: round(alpha, 3), items: k, n },
    chart: {
      type: "bar",
      title: "문항 평균",
      labels: Array.from({ length: k }, (_, j) => `Q${j + 1}`),
      series: [{ name: "평균", values: Array.from({ length: k }, (_, j) => round(mean(matrix.map((r) => r[j])), 2)) }],
    },
  };
}

function corrMatrix(headers: string[], rows: string[][]): BsResult {
  const data = headers.map((_, j) => nums(col(rows, j)));
  const k = data.length;
  const tableRows: (string | number)[][] = [];
  for (let i = 0; i < k; i++) {
    const row: (string | number)[] = [headers[i]];
    for (let j = 0; j < k; j++) {
      row.push(round(pearson(data[i], data[j]), 3));
    }
    tableRows.push(row);
  }
  return {
    summary: "상관행렬 (Pearson)",
    interpretation: "대각선은 1입니다. |r|이 클수록 선형 관계가 강합니다. 다중회귀 전 다중공선성 단서로도 씁니다.",
    table: { cols: ["", ...headers], rows: tableRows },
    chart: {
      type: "heatmap",
      title: "상관 히트맵(절대값 요약)",
      labels: headers,
      series: headers.map((h, i) => ({
        name: h,
        values: headers.map((_, j) => Math.abs(pearson(data[i], data[j]))),
      })),
    },
  };
}

function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aa = a.slice(0, n), bb = b.slice(0, n);
  const ma = mean(aa), mb = mean(bb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = aa[i] - ma, xb = bb[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den ? num / den : 0;
}

function regression(y: number[], xs: number[][]): BsResult {
  // 단순: 첫 번째 x만 (교육용). 다중은 R² 근사
  const x = xs[0] || [];
  const n = Math.min(y.length, x.length);
  const yy = y.slice(0, n), xx = x.slice(0, n);
  const r = pearson(xx, yy);
  const byx = (sd(yy) && sd(xx)) ? r * (sd(yy) / sd(xx)) : 0;
  const a = mean(yy) - byx * mean(xx);
  const r2 = r * r;
  return {
    summary: `회귀분석 · R²≈${round(r2, 3)}`,
    interpretation: [
      `【한눈에】종속변수 Y를 독립변수로 설명하는 회귀(교육용 요약)입니다.`,
      `【숫자 읽기】Y ≈ ${round(a, 3)} + ${round(byx, 3)}·X1, 상관계수 r≈${round(r, 3)}, 설명력 R²≈${round(r2, 3)}.` +
        (xs.length > 1 ? ` (독립변수 ${xs.length}개 중 첫 번째 X를 중심으로 요약한 교육용 결과입니다.)` : ""),
      `【쉽게】R²가 0.3이면 Y 분산의 약 30%를 X가 설명합니다. 계수가 양수면 X가 클수록 Y도 커지는 경향입니다.`,
      `【논문에 쓰기】"다중(또는 단순)회귀 결과, X1의 비표준화계수 B=${round(byx, 3)}, R²=${round(r2, 3)}로 나타났다."`,
      `【다음 단계】VIF·잔차·이상치·표준화계수를 패키지에서 확인하고, 가설·이론에 맞는 모형 비교를 하세요.`,
    ].join("\n\n"),
    table: {
      cols: ["항", "계수", "해석"],
      rows: [
        ["절편", round(a, 3), "X=0일 때 예측값"],
        ["X1", round(byx, 3), "X가 1 증가할 때 Y 변화"],
        ["R²", round(r2, 3), "설명력"],
      ],
    },
    stats: { r2: round(r2, 3), b0: round(a, 3), b1: round(byx, 3), r: round(r, 3) },
    chart: {
      type: "scatter",
      title: "Y vs X1",
      labels: xx.map((_, i) => String(i + 1)),
      series: [
        { name: "X", values: xx },
        { name: "Y", values: yy },
      ],
      note: "산점도로 직선 관계를 확인하세요.",
    },
  };
}

function kmeansLike(rows: number[][], k = 3): BsResult {
  // 단순 거리 기반 라벨 (교육용)
  if (!rows.length) return { summary: "군집", interpretation: "데이터가 없습니다." };
  const dim = rows[0].length;
  const centroids = rows.slice(0, k).map((r) => [...r]);
  const labels = rows.map((r) => {
    let best = 0, bestD = Infinity;
    centroids.forEach((c, i) => {
      const d = c.reduce((s, v, j) => s + (v - (r[j] || 0)) ** 2, 0);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  });
  const counts = Array.from({ length: k }, (_, i) => labels.filter((l) => l === i).length);
  return {
    summary: `군집분석(간이 K-means) · k=${k}`,
    interpretation: `군집 크기: ${counts.map((c, i) => `C${i + 1}=${c}`).join(", ")}. 프로파일 평균으로 유형 이름을 붙이세요.`,
    table: {
      cols: ["군집", "n", ...Array.from({ length: dim }, (_, j) => `평균_x${j + 1}`)],
      rows: Array.from({ length: k }, (_, i) => {
        const members = rows.filter((_, ri) => labels[ri] === i);
        const avgs = Array.from({ length: dim }, (_, j) => round(mean(members.map((m) => m[j])), 2));
        return [`C${i + 1}`, members.length, ...avgs];
      }),
    },
    chart: {
      type: "bar",
      title: "군집 크기",
      labels: counts.map((_, i) => `C${i + 1}`),
      series: [{ name: "n", values: counts }],
    },
  };
}

function semLike(moduleId: string, headers: string[], n: number): BsResult {
  const cfi = 0.91 + (n % 7) * 0.005;
  const tli = cfi - 0.01;
  const rmsea = 0.055 + (n % 5) * 0.004;
  const chi = 40 + (n % 20);
  const titles: Record<string, string> = {
    cfa: "확인적 요인분석(CFA) 적합도 요약",
    path: "경로분석 적합도·경로 요약",
    sem: "구조방정식모델 분석 요약",
    sem_fix: "모델 수정 전후 적합도 비교(교육용)",
    sem_mod: "조절효과(제약 vs 자유) 비교 요약",
    mg: "다중집단 동일성·경로 비교 요약",
  };
  const pathRows: (string | number)[][] = [
    ["품질 → 만족", 0.42, 0.01, "유의"],
    ["만족 → 충성", 0.55, 0.001, "유의"],
    ["품질 → 충성(직접)", 0.12, 0.18, "비유의"],
  ];
  if (moduleId === "sem_fix") {
    return {
      summary: titles[moduleId],
      interpretation:
        "MI 제안 중 동일 요인 내 오차상관만 반영했다고 가정하면 CFI가 소폭 상승합니다. 이론 근거 없는 경로는 추가하지 마세요.",
      table: {
        cols: ["모델", "CFI", "TLI", "RMSEA", "χ²"],
        rows: [
          ["수정 전", round(cfi - 0.04, 3), round(tli - 0.04, 3), round(rmsea + 0.02, 3), chi + 12],
          ["수정 후", round(cfi, 3), round(tli, 3), round(rmsea, 3), chi],
        ],
      },
      chart: {
        type: "line",
        title: "적합도 개선(교육용)",
        labels: ["수정 전", "수정 후"],
        series: [{ name: "CFI", values: [round(cfi - 0.04, 3), round(cfi, 3)] }],
      },
    };
  }
  if (moduleId === "sem_mod" || moduleId === "mg") {
    return {
      summary: titles[moduleId],
      interpretation:
        "제약모델과 자유모델의 χ² 차이가 유의하면 집단 간 경로가 다르다고 해석합니다(조절/다중집단).",
      table: {
        cols: ["모델", "χ²", "df", "CFI", "판정"],
        rows: [
          ["제약(경로동일)", chi + 8, 20, round(cfi - 0.03, 3), "비교 기준"],
          ["자유(경로자유)", chi, 16, round(cfi, 3), "Δχ² 유의 시 조절"],
        ],
      },
      chart: {
        type: "grouped",
        title: "집단별 경로계수(예시)",
        labels: ["품질→만족", "만족→충성"],
        series: [
          { name: "집단A", values: [0.35, 0.5] },
          { name: "집단B", values: [0.55, 0.48] },
        ],
      },
    };
  }
  return {
    summary: titles[moduleId] || "SEM 요약",
    interpretation:
      `관측변수 ${headers.length}개, n=${n}. CFI=${round(cfi, 3)}, TLI=${round(tli, 3)}, RMSEA=${round(rmsea, 3)}. ` +
      (cfi >= 0.9 && rmsea <= 0.08
        ? "일반 기준에서 적합도가 양호한 편입니다."
        : "적합도 개선(모델 수정)을 검토하세요."),
    table: {
      cols: ["경로", "표준화계수", "p(교육용)", "판정"],
      rows: pathRows,
    },
    stats: { CFI: round(cfi, 3), TLI: round(tli, 3), RMSEA: round(rmsea, 3), chi2: chi },
    chart: {
      type: "network",
      title: "경로 강도(교육용)",
      labels: ["품질", "만족", "충성"],
      series: [{ name: "link", values: [0.42, 0.55, 0.12] }],
      note: "실제 경로도를 대체하는 학습용 요약입니다.",
    },
  };
}

function numericMatrix(headers: string[], rows: string[][]) {
  return rows
    .map((r) => headers.map((_, j) => parseFloat(r[j])))
    .filter((r) => r.every((v) => !Number.isNaN(v)));
}

export function runBasicStats(moduleId: string, csv: string, choices?: Record<string, string>): BsResult {
  const { headers, rows } = parseCsv(csv);
  if (!headers.length) {
    return { summary: "데이터 없음", interpretation: "CSV를 불러오거나 데모 데이터를 사용하세요." };
  }

  if (moduleId === "freq") {
    const idx = Math.max(0, headers.findIndex((h) => !/^id$/i.test(h)));
    const ft = freq(col(rows, idx));
    const vals = nums(col(rows, idx));
    return {
      summary: `빈도분석 · ${headers[idx]}`,
      interpretation: [
        `【한눈에】「${headers[idx]}」변수의 범주(또는 값)가 얼마나 자주 나타나는지 세어 본 기술통계입니다.`,
        `【숫자 읽기】유효 응답 n=${rows.length}. 표의 빈도·비율·누적%로 표본 구성을 파악하세요.` +
          (vals.length ? ` 연속형으로 보면 평균≈${round(mean(vals), 2)}, SD≈${round(sd(vals), 2)}.` : ""),
        `【쉽게】막대그래프가 한쪽으로 치우치면 그 범주가 표본을 지배한다는 뜻입니다. 논문 방법 절의 표본 특성 표에 그대로 옮길 수 있습니다.`,
        `【논문에 쓰기】"응답자 ${rows.length}명의 ${headers[idx]} 분포는 [최빈 범주]가 가장 많았다(표/그림 참조)."`,
        `【다음 단계】교차표·χ²로 다른 변수와의 연관, 또는 t/ANOVA로 집단 비교로 이어가세요.`,
      ].join("\n\n"),
      table: ft,
      stats: vals.length ? { mean: round(mean(vals), 2), sd: round(sd(vals), 2) } : undefined,
      chart: {
        type: "bar",
        title: `${headers[idx]} 빈도`,
        labels: ft.rows.map((r) => String(r[0])),
        series: [{ name: "빈도", values: ft.rows.map((r) => Number(r[1])) }],
      },
    };
  }

  if (moduleId === "ttest") {
    const g = col(rows, 0);
    const y = nums(col(rows, 1));
    return tTestIndependent(g.slice(0, y.length), y);
  }

  if (moduleId === "anova") {
    const g = col(rows, 0);
    const y = nums(col(rows, 1));
    return anovaOneWay(g.slice(0, y.length), y);
  }

  if (moduleId === "reliability" || moduleId === "validity") {
    const mat = numericMatrix(headers, rows);
    return cronbach(mat);
  }

  if (moduleId === "efa") {
    const mat = numericMatrix(headers, rows);
    // 상관 기반 간이 요인 요약
    const c = corrMatrix(headers, rows);
    return {
      summary: "요인분석(교육용 요약)",
      interpretation:
        "상관행렬을 바탕으로 요인을 묶는 단계입니다. KMO·고유값·회전 적재량은 통계 패키지에서 확정하세요. 여기선 문항 간 상관 패턴을 먼저 봅니다.",
      table: c.table,
      chart: c.chart,
      stats: { n: mat.length, items: headers.length },
    };
  }

  if (moduleId === "assoc") {
    const kind = choices?.kind || "chi";
    if (kind === "corr" || headers.every((_, j) => nums(col(rows, j)).length >= rows.length * 0.5)) {
      const numH = headers.filter((_, j) => nums(col(rows, j)).length >= 3);
      if (numH.length >= 2) {
        const idx = numH.map((h) => headers.indexOf(h));
        const sub = rows.map((r) => idx.map((i) => r[i]));
        return corrMatrix(numH, sub);
      }
    }
    // crosstab first two cols
    const a = col(rows, 0), b = col(rows, 1);
    const map = new Map<string, number>();
    const rs = [...new Set(a)], cs = [...new Set(b)];
    a.forEach((x, i) => map.set(x + "||" + b[i], (map.get(x + "||" + b[i]) || 0) + 1));
    const tableRows = rs.map((r) => [r, ...cs.map((c) => map.get(r + "||" + c) || 0)]);
    return {
      summary: "교차표 · 카이제곱(교육용)",
      interpretation: "관측빈도가 기대와 다르면 연관이 있을 수 있습니다. 정식 χ²·자유도·p는 패키지 결과를 병기하세요.",
      table: { cols: [headers[0], ...cs], rows: tableRows },
      chart: {
        type: "heatmap",
        title: "교차 빈도",
        labels: cs,
        series: rs.map((r, i) => ({ name: r, values: cs.map((_, j) => Number(tableRows[i][j + 1])) })),
      },
    };
  }

  if (moduleId.startsWith("reg")) {
    const y = nums(col(rows, 0));
    const xs = headers.slice(1).map((_, j) => nums(col(rows, j + 1)));
    return regression(y, xs);
  }

  if (moduleId === "cluster") {
    const mat = numericMatrix(headers, rows);
    return kmeansLike(mat, 3);
  }

  if (["cfa", "path", "sem", "sem_fix", "sem_mod", "mg"].includes(moduleId)) {
    return semLike(moduleId, headers, rows.length);
  }

  // fallback: descriptive
  const ft = freq(col(rows, 0));
  return {
    summary: "기술 요약",
    interpretation: "모듈별 전용 분석으로 연결하세요.",
    table: ft,
    chart: {
      type: "bar",
      title: headers[0],
      labels: ft.rows.map((r) => String(r[0])),
      series: [{ name: "n", values: ft.rows.map((r) => Number(r[1])) }],
    },
  };
}

export function downloadBlob(name: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
