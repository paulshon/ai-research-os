// LLB 데이터 분석 대시보드(A~J) — 서버 계산. 검색 조건에 일치한 논문 집합(검색 화면과 같은 기준)을 ClickHouse 에서 집계한다.
// 큰 집합은 SQL 로 직접 집계하고, 텍스트·네트워크 분석처럼 논문 단위 계산이 필요한 것은 순위 상위 N편 표본을 쓴다.
// 이 파일은 생성 파일이 아니므로 직접 수정해도 된다.

import { buildSearch, networkLlb } from "@/lib/literature/llb-search";
import { ch, topWids, loadRefs } from "@/lib/literature/llb-network";
import { analyzeGraph, buildGraph, type NetRecord } from "@/lib/literature/network-graph";
import {
  METHODS, OBJECTS, clusterTerms, correlation, kmeans, lorenz, lsa, mainPath, ols, pca2, raoStirling, thematicEvolution, tfidf, tokenize,
} from "@/lib/literature/text-analytics";
import { anova, autocorr1, cagr, changePoints, chi2Test, fitGrowth, hedgesCI, holm, holtForecast, kaplanMeier, kruskal, lifecycle, mannKendall, mannKendallTFPW, pettitt, welch } from "@/lib/literature/panel-stats";

const DB = process.env.LLB_DB || "openalex";
const T = `${DB}.lit_papers`;

export const SECTIONS = [
  "trend", "impact", "journal", "author", "geo", "topic_year", "topic_evo", "topic_rs", "topic_map", "topic_gap", "funding", "citation", "model", "quality", "longitudinal", "cross",
] as const;
export type Section = (typeof SECTIONS)[number];

export interface Scope { where: string; params: Record<string, unknown>; staged: boolean; matched: number }

/** 검색 화면과 같은 기준의 WHERE(관련도 정렬은 제목 일치 단계, 그 밖의 정렬은 제목·초록 일치) */
export async function matchScope(opts: any): Promise<Scope> {
  const s = buildSearch({ ...opts, limit: 200, offset: 0 });
  const pick = (sql: string, re: RegExp) => { const m = re.exec(sql); if (!m) throw new Error("검색 SQL 의 형식이 바뀌었습니다(llb-dashboard.ts 확인 필요)"); return m[1]; };
  const where = s.staged ? pick(s.count1, /FINAL WHERE ([\s\S]*) LIMIT 100001\)/) : pick(s.countSql, /FINAL WHERE ([\s\S]*) FORMAT JSONEachRow/);
  const r = await ch(`SELECT count() AS n FROM ${T} WHERE ${where} FORMAT JSONEachRow`, s.params, 110);
  return { where, params: s.params, staged: !!s.staged, matched: Number(r[0]?.n ?? 0) };
}

const num = (x: unknown) => Number(x ?? 0) || 0;
const rows = (sc: Scope, sql: string, t = 110) => ch(sql.replace(/\$W/g, () => sc.where).replace(/\$T/g, () => T), sc.params, t);
/** 일치 집합이 크면 해시로 줄여 약 target 행만 읽는다(분모는 같이 돌려준다) */
const hashMod = (sc: Scope, target: number) => Math.max(1, Math.ceil(sc.matched / target));

// ───────────────────────── A. 규모·동향 ─────────────────────────
async function trend(sc: Scope) {
  const [yearType, fieldYear, hier, langYear] = await Promise.all([
    rows(sc, `SELECT year, type, count() n FROM $T WHERE $W AND year BETWEEN 1980 AND 2027 GROUP BY year, type ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT field, year, count() n FROM $T WHERE $W AND field != '' AND year BETWEEN 1980 AND 2027 GROUP BY field, year FORMAT JSONEachRow`),
    rows(sc, `SELECT domain, field, subfield, topic, count() n FROM $T WHERE $W AND topic != '' GROUP BY domain, field, subfield, topic ORDER BY n DESC LIMIT 700 FORMAT JSONEachRow`),
    rows(sc, `SELECT year, lang, count() n, avg(ko_ratio) ko FROM $T WHERE $W AND year BETWEEN 1980 AND 2027 GROUP BY year, lang FORMAT JSONEachRow`),
  ]);
  return { yearType: yearType.map((r) => ({ year: num(r.year), type: String(r.type), n: num(r.n) })), fieldYear: fieldYear.map((r) => ({ field: String(r.field), year: num(r.year), n: num(r.n) })),
    hierarchy: hier.map((r) => ({ domain: String(r.domain), field: String(r.field), subfield: String(r.subfield), topic: String(r.topic), n: num(r.n) })),
    langYear: langYear.map((r) => ({ year: num(r.year), lang: String(r.lang), n: num(r.n), ko: num(r.ko) })) };
}

// ───────────────────────── B. 영향력 ─────────────────────────
async function impact(sc: Scope) {
  const mod = hashMod(sc, 400000);
  const [bins, tot, fwciYear, fieldFwci, top, fwciTop, aging] = await Promise.all([
    rows(sc, `SELECT toUInt8(floor(log2(cited + 1))) b, count() n, sum(cited) s FROM $T WHERE $W GROUP BY b ORDER BY b FORMAT JSONEachRow`),
    rows(sc, `SELECT count() n, sum(cited) s, quantile(0.5)(cited) p50, quantile(0.9)(cited) p90, quantile(0.99)(cited) p99, countIf(cited = 0) zero, max(cited) mx FROM $T WHERE $W FORMAT JSONEachRow`),
    rows(sc, `SELECT year, count() n, avgIf(fwci_oa, fwci_oa_known = 1) f, quantileIf(0.5)(fwci_oa, fwci_oa_known = 1) fm, sum(top1pct) t1, sum(top10pct) t10 FROM $T WHERE $W AND year BETWEEN 1990 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT field, year, avgIf(fwci_oa, fwci_oa_known = 1) f, count() n FROM $T WHERE $W AND field != '' AND year BETWEEN 2000 AND 2027 GROUP BY field, year HAVING n >= 10 FORMAT JSONEachRow`),
    rows(sc, `SELECT wid, title, year, cited, round(fwci_oa, 1) f, journal, first_author, cite_norm_pct cp FROM $T WHERE $W ORDER BY cited DESC LIMIT 20 FORMAT JSONEachRow`),
    rows(sc, `SELECT wid, title, year, cited, round(fwci_oa, 1) f, journal, first_author, cite_norm_pct cp, is_oa FROM $T WHERE $W AND fwci_oa_known = 1 AND cited >= 20 ORDER BY (0.5 * cite_norm_pct + 0.3 * least(fwci_oa, 20) / 20 + 0.2 * log(1 + cited) / 12) DESC LIMIT 15 FORMAT JSONEachRow`),
    rows(sc, `SELECT year, c.1 - year AS age, sum(c.2) cites, uniqExact(wid) papers FROM (SELECT wid, year, arrayJoin(JSONExtract(counts_by_year, 'Array(Tuple(UInt16, UInt32))')) c FROM $T WHERE $W AND year IN (2005, 2010, 2015, 2020) AND has_ext = 1 AND cityHash64(wid) % ${Math.max(1, Math.ceil(sc.matched / 4 / 30000))} = 0) WHERE age BETWEEN 0 AND 12 GROUP BY year, age ORDER BY year, age FORMAT JSONEachRow`, 115),
  ]);
  const lz = lorenz(bins.map((r) => ({ n: num(r.n), s: num(r.s) })));
  const t = tot[0] ?? {};
  return {
    bins: bins.map((r) => ({ b: num(r.b), n: num(r.n), s: num(r.s) })), total: { n: num(t.n), s: num(t.s), p50: num(t.p50), p90: num(t.p90), p99: num(t.p99), zero: num(t.zero), max: num(t.mx) },
    lorenz: lz.points, gini: lz.gini, topShare1: lz.topShare(0.01), topShare10: lz.topShare(0.1),
    fwciYear: fwciYear.map((r) => ({ year: num(r.year), n: num(r.n), f: num(r.f), fm: num(r.fm), t1: num(r.t1), t10: num(r.t10) })),
    fieldFwci: fieldFwci.map((r) => ({ field: String(r.field), year: num(r.year), f: num(r.f), n: num(r.n) })),
    topCited: top.map((r) => ({ wid: num(r.wid), title: String(r.title), year: num(r.year), cited: num(r.cited), f: num(r.f), journal: String(r.journal), author: String(r.first_author) })),
    keyPapers: fwciTop.map((r) => { const score = 0.5 * num(r.cp) + 0.3 * Math.min(num(r.f), 20) / 20 + 0.2 * Math.log(1 + num(r.cited)) / 12; return { wid: num(r.wid), title: String(r.title), year: num(r.year), cited: num(r.cited), f: num(r.f), journal: String(r.journal), author: String(r.first_author), cp: num(r.cp), score, parts: [0.5 * num(r.cp), 0.3 * Math.min(num(r.f), 20) / 20, 0.2 * Math.log(1 + num(r.cited)) / 12] }; }),
    aging: aging.map((r) => ({ year: num(r.year), age: num(r.age), cites: num(r.cites), papers: num(r.papers) })), hashMod: mod,
  };
}

// ───────────────────────── C. 저널·출판 ─────────────────────────
async function journal(sc: Scope) {
  const [cover, byType, jr, quart, jifHist, upset, pub, srcType, cats] = await Promise.all([
    rows(sc, `SELECT count() n, countIf(has_jcr = 1) jcr, countIf(source_type = 'journal') jn FROM $T WHERE $W FORMAT JSONEachRow`),
    rows(sc, `SELECT type, count() n, countIf(has_jcr = 1) jcr FROM $T WHERE $W GROUP BY type ORDER BY n DESC FORMAT JSONEachRow`),
    rows(sc, `SELECT journal, journal_id, count() n, sum(cited) c, avgIf(jif, jif > 0) jif, any(jif_q) q, any(publisher) pub, avg(is_oa) oa FROM $T WHERE $W AND journal != '' GROUP BY journal, journal_id ORDER BY n DESC LIMIT 60 FORMAT JSONEachRow`),
    rows(sc, `SELECT jif_q q, count() n FROM $T WHERE $W AND has_jcr = 1 GROUP BY q ORDER BY q FORMAT JSONEachRow`),
    rows(sc, `SELECT floor(least(jif, 40) / 2) * 2 b, count() n FROM $T WHERE $W AND jif > 0 GROUP BY b ORDER BY b FORMAT JSONEachRow`),
    rows(sc, `SELECT in_scie, in_ssci, in_ahci, in_esci, in_scopus, in_doaj, in_kci, count() n FROM $T WHERE $W GROUP BY in_scie, in_ssci, in_ahci, in_esci, in_scopus, in_doaj, in_kci ORDER BY n DESC FORMAT JSONEachRow`),
    rows(sc, `SELECT publisher, count() n, sum(cited) c FROM $T WHERE $W AND publisher != '' GROUP BY publisher ORDER BY n DESC LIMIT 25 FORMAT JSONEachRow`),
    rows(sc, `SELECT source_type, count() n FROM $T WHERE $W GROUP BY source_type ORDER BY n DESC FORMAT JSONEachRow`),
    rows(sc, `SELECT cat, count() n, quantile(0.25)(jif) q1, quantile(0.5)(jif) q2, quantile(0.75)(jif) q3, min(jif) lo, max(jif) hi FROM (SELECT arrayJoin(splitByString('; ', jcr_categories)) cat, jif FROM $T WHERE $W AND has_jcr = 1 AND jif > 0) GROUP BY cat HAVING n >= 5 ORDER BY n DESC LIMIT 14 FORMAT JSONEachRow`),
  ]);
  const journals = jr.map((r) => ({ journal: String(r.journal), id: num(r.journal_id), n: num(r.n), c: num(r.c), jif: num(r.jif), q: String(r.q || ""), publisher: String(r.pub || ""), oa: num(r.oa) }));
  // 투고처 추천 점수: 주제 적합(편수) 0.55 + 사분위 0.30 + 평균 인용 0.15 — JCR 이 있는 저널만
  const maxN = Math.max(1, ...journals.map((j) => j.n)), maxC = Math.max(1, ...journals.map((j) => j.c / Math.max(1, j.n)));
  const qw: Record<string, number> = { Q1: 1, Q2: 0.65, Q3: 0.35, Q4: 0.15 };
  const recommend = journals.filter((j) => j.jif > 0 && qw[j.q]).map((j) => ({ ...j, score: 0.55 * Math.log(1 + j.n) / Math.log(1 + maxN) + 0.3 * qw[j.q] + 0.15 * (j.c / Math.max(1, j.n)) / maxC })).sort((a, b) => b.score - a.score).slice(0, 15);
  return {
    coverage: { n: num(cover[0]?.n), jcr: num(cover[0]?.jcr), journalType: num(cover[0]?.jn) }, byType: byType.map((r) => ({ type: String(r.type), n: num(r.n), jcr: num(r.jcr) })),
    journals, quartiles: quart.map((r) => ({ q: String(r.q), n: num(r.n) })), jifHist: jifHist.map((r) => ({ b: num(r.b), n: num(r.n) })),
    upset: upset.map((r) => ({ sets: (["scie", "ssci", "ahci", "esci", "scopus", "doaj", "kci"] as const).filter((k) => num(r["in_" + k]) === 1), n: num(r.n) })),
    publishers: pub.map((r) => ({ publisher: String(r.publisher), n: num(r.n), c: num(r.c) })), sourceTypes: srcType.map((r) => ({ type: String(r.source_type || "(없음)"), n: num(r.n) })),
    categories: cats.map((r) => ({ cat: String(r.cat), n: num(r.n), q1: num(r.q1), q2: num(r.q2), q3: num(r.q3), lo: num(r.lo), hi: num(r.hi) })), recommend,
  };
}

// ───────────────────────── D. 저자·협력 ─────────────────────────
async function author(sc: Scope) {
  const bound = Math.max(1, Math.ceil(sc.matched / 250000));
  const [teamYear, teamHist, lotka, topAuthors, firstAuthors] = await Promise.all([
    rows(sc, `SELECT year, count() n, avg(n_authors) a, quantile(0.5)(n_authors) m, countIf(n_authors = 1) solo FROM $T WHERE $W AND n_authors > 0 AND year BETWEEN 1980 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT multiIf(n_authors <= 5, toString(n_authors), n_authors <= 10, '6-10', n_authors <= 20, '11-20', n_authors <= 50, '21-50', '51+') b, count() n FROM $T WHERE $W AND n_authors > 0 GROUP BY b FORMAT JSONEachRow`),
    rows(sc, `SELECT n, count() m FROM (SELECT a, count() n FROM (SELECT arrayJoin(author_ids) a FROM $T WHERE $W AND n_authors <= 60 AND cityHash64(wid) % ${bound} = 0) GROUP BY a) GROUP BY n ORDER BY n FORMAT JSONEachRow`, 115),
    rows(sc, `SELECT a.1 id, any(a.2) name, count() n, sum(cited) c FROM (SELECT arrayJoin(arrayZip(author_ids, author_names)) a, cited FROM $T WHERE $W AND n_authors <= 60 AND length(author_ids) = length(author_names) AND cityHash64(wid) % ${bound} = 0) GROUP BY id ORDER BY n DESC LIMIT 20 FORMAT JSONEachRow`, 115),
    rows(sc, `SELECT first_author, count() n, sum(cited) c FROM $T WHERE $W AND first_author != '' GROUP BY first_author ORDER BY n DESC LIMIT 15 FORMAT JSONEachRow`),
  ]);
  const ly = lotka.map((r) => ({ n: num(r.n), m: num(r.m) }));
  // Lotka: log m = log C − α log n 의 기울기(α) 를 최소제곱으로 추정(n ≤ 20)
  const pts = ly.filter((p) => p.n >= 1 && p.n <= 20 && p.m > 0).map((p) => [Math.log(p.n), Math.log(p.m)]);
  let alpha = 0; if (pts.length >= 3) { const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length; alpha = -pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / Math.max(1e-9, pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0)); }
  return {
    teamYear: teamYear.map((r) => ({ year: num(r.year), n: num(r.n), a: num(r.a), m: num(r.m), solo: num(r.solo) })), teamHist: teamHist.map((r) => ({ b: String(r.b), n: num(r.n) })),
    lotka: ly, alpha, topAuthors: topAuthors.map((r) => ({ id: String(r.id), name: String(r.name), n: num(r.n), c: num(r.c) })), firstAuthors: firstAuthors.map((r) => ({ name: String(r.first_author), n: num(r.n), c: num(r.c) })), sampled: bound > 1 ? bound : 0,
  };
}

// ───────────────────────── E. 기관·국가 ─────────────────────────
async function geo(sc: Scope) {
  const [countries, pairs, intl, instType, kr, krCollab, inst] = await Promise.all([
    rows(sc, `SELECT c, count() n, sum(cited) cs, avgIf(fwci_oa, fwci_oa_known = 1) f FROM (SELECT arrayJoin(arrayDistinct(countries)) c, cited, fwci_oa, fwci_oa_known FROM $T WHERE $W) GROUP BY c ORDER BY n DESC LIMIT 200 FORMAT JSONEachRow`),
    rows(sc, `SELECT p.1 a, p.2 b, count() n FROM (SELECT arrayJoin(arrayFlatten(arrayMap(i -> arrayMap(j -> (cs[i], cs[j]), range(i + 1, length(cs) + 1)), range(1, length(cs))))) p FROM (SELECT arraySort(arrayDistinct(arraySlice(countries, 1, 10))) cs FROM $T WHERE $W AND length(countries) > 1)) GROUP BY a, b ORDER BY n DESC LIMIT 500 FORMAT JSONEachRow`, 115),
    rows(sc, `SELECT year, count() n, countIf(length(arrayDistinct(countries)) > 1) intl, countIf(length(countries) > 0) withc FROM $T WHERE $W AND year BETWEEN 1980 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT year, t, count() n FROM (SELECT year, arrayJoin(arrayDistinct(inst_types)) t FROM $T WHERE $W AND year BETWEEN 1990 AND 2027) GROUP BY year, t FORMAT JSONEachRow`),
    rows(sc, `SELECT year, count() n, countIf(is_kr = 1) kr FROM $T WHERE $W AND year BETWEEN 1980 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT c, count() n FROM (SELECT arrayJoin(arrayDistinct(countries)) c FROM $T WHERE $W AND is_kr = 1) WHERE c != 'KR' GROUP BY c ORDER BY n DESC LIMIT 15 FORMAT JSONEachRow`),
    rows(sc, `SELECT inst, count() n, sum(cited) c FROM (SELECT arrayJoin(arrayDistinct(inst_names)) inst, cited FROM $T WHERE $W) GROUP BY inst ORDER BY n DESC LIMIT 30 FORMAT JSONEachRow`, 115),
  ]);
  return {
    countries: countries.map((r) => ({ c: String(r.c), n: num(r.n), cs: num(r.cs), f: num(r.f) })), pairs: pairs.map((r) => ({ a: String(r.a), b: String(r.b), n: num(r.n) })),
    intl: intl.map((r) => ({ year: num(r.year), n: num(r.n), intl: num(r.intl), withc: num(r.withc) })), instType: instType.map((r) => ({ year: num(r.year), t: String(r.t), n: num(r.n) })),
    kr: kr.map((r) => ({ year: num(r.year), n: num(r.n), kr: num(r.kr) })), krCollab: krCollab.map((r) => ({ c: String(r.c), n: num(r.n) })), institutions: inst.map((r) => ({ name: String(r.inst), n: num(r.n), c: num(r.c) })),
  };
}

// ───────────────────────── F. 주제·지식 구조 ─────────────────────────
async function topicYear(sc: Scope) {
  const r = await rows(sc, `SELECT topic, year, count() n FROM $T WHERE $W AND topic != '' AND year BETWEEN 1995 AND 2027 AND topic IN (SELECT topic FROM $T WHERE $W AND topic != '' GROUP BY topic ORDER BY count() DESC LIMIT 24) GROUP BY topic, year ORDER BY year FORMAT JSONEachRow`);
  return { rows: r.map((x) => ({ topic: String(x.topic), year: num(x.year), n: num(x.n) })) };
}

interface TextRec extends NetRecord { abstract: string; topic: string; field: string; subfield: string }
const widCache = new Map<string, { at: number; p: Promise<number[]> }>();
/** 같은 검색의 상위 wid 를 한 번만 구해(최대 4,000) 여러 분석이 나눠 쓴다 — 관련도 순위 계산이 가장 오래 걸린다 */
function sharedWids(opts: any, n: number): Promise<number[]> {
  const key = JSON.stringify(opts), hit = widCache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.p.then((l) => l.slice(0, n));
  const p = topWids(opts, 4000); widCache.set(key, { at: Date.now(), p });
  p.catch(() => widCache.delete(key));
  if (widCache.size > 6) widCache.delete([...widCache.keys()][0]);
  return p.then((l) => l.slice(0, n));
}
async function textSample(opts: any, n: number, withAbstract: boolean): Promise<TextRec[]> {
  const wids = await sharedWids(opts, n);
  const out: TextRec[] = [];
  for (let i = 0; i < wids.length; i += 1000) {
    const chunk = wids.slice(i, i + 1000).map((w) => Math.trunc(Number(w))).filter((w) => w > 0);
    const rs = await ch(`SELECT wid, title, ${withAbstract ? "substring(abstract, 1, 800)" : "''"} AS abs, year, cited, journal, topic, field, subfield, keywords, concepts, mesh_terms, author_names, countries FROM ${T} WHERE wid IN (${chunk.join(",")}) FORMAT JSONEachRow`, {}, 110);
    for (const r of rs) {
      const arr = (x: unknown) => (Array.isArray(x) ? x.map(String) : []);
      out.push({ id: `W${r.wid}`, wid: num(r.wid), title: String(r.title ?? ""), abstract: String(r.abs ?? ""), year: num(r.year), cited: num(r.cited), journal: String(r.journal ?? ""), topic: String(r.topic ?? ""), field: String(r.field ?? ""), subfield: String(r.subfield ?? ""),
        authors: arr(r.author_names), keywords: arr(r.keywords), institutions: [], countries: arr(r.countries), funders: [], mesh: arr(r.mesh_terms), concepts: arr(r.concepts), rank: i + out.length });
    }
  }
  const rank = new Map(wids.map((w, i) => [w, i + 1]));
  return out.map((r) => ({ ...r, rank: rank.get(r.wid!) ?? 1e9 })).sort((a, b) => a.rank! - b.rank!);
}

async function topicEvo(opts: any) {
  const recs = (await textSample(opts, 4000, false)).filter((r) => r.year > 0);
  if (recs.length < 30) return { periods: [], nodes: [], links: [], note: "표본이 작아 계산할 수 없습니다" };
  const ys = recs.map((r) => r.year).sort((a, b) => a - b), K = Math.min(4, new Set(ys).size);
  const cuts = Array.from({ length: K }, (_, i) => ys[Math.min(ys.length - 1, Math.ceil((ys.length * (i + 1)) / K) - 1)]);
  const ends = [...new Set(cuts)];
  const periods: { label: string; communities: { members: string[]; weight: number; terms: string[] }[]; papers: number }[] = [];
  let lo = ys[0];
  for (const hi of ends) {
    const part = recs.filter((r) => r.year >= lo && r.year <= hi);
    if (part.length >= 15) {
      const g = buildGraph(part, "coword", { maxNodes: 90, maxEdges: 500 });
      const m = analyzeGraph(g.nodes, g.edges);
      const byC = new Map<number, typeof g.nodes>(); g.nodes.forEach((n) => { const c = m.perNode.get(n.id)!.community; (byC.get(c) ?? byC.set(c, []).get(c)!).push(n); });
      const comms = [...byC.values()].filter((l) => l.length >= 3).map((l) => ({ members: l.map((n) => n.label), weight: l.reduce((s, n) => s + n.count, 0), terms: [...l].sort((a, b) => m.perNode.get(b.id)!.strength - m.perNode.get(a.id)!.strength).slice(0, 3).map((n) => n.label) })).sort((a, b) => b.weight - a.weight).slice(0, 7);
      periods.push({ label: lo === hi ? `${lo}` : `${lo}–${hi}`, communities: comms, papers: part.length });
    }
    lo = hi + 1;
  }
  const ev = thematicEvolution(periods);
  return { ...ev, periodPapers: periods.map((p) => p.papers), sample: recs.length };
}

async function topicRs(opts: any) {
  const recs = await textSample(opts, 4000, false);
  const rs = raoStirling(recs.map((r) => r.concepts), 150);
  const withC = recs.map((r, i) => ({ r, rs: rs.rs[i] })).filter((x) => x.r.concepts.length >= 2);
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
  const byYear = new Map<number, number[]>(), byField = new Map<string, number[]>();
  for (const x of withC) { if (x.r.year > 0) (byYear.get(x.r.year) ?? byYear.set(x.r.year, []).get(x.r.year)!).push(x.rs); if (x.r.field) (byField.get(x.r.field) ?? byField.set(x.r.field, []).get(x.r.field)!).push(x.rs); }
  const hist = Array.from({ length: 10 }, (_, i) => ({ lo: i / 10, n: 0 })); withC.forEach((x) => { hist[Math.min(9, Math.floor(x.rs * 10))].n++; });
  // 개념 거리 히트맵: 상위 24개 개념을 평균 연결 순서로 정렬
  const C = Math.min(24, rs.concepts.length), ids = [...Array(C).keys()];
  const order: number[] = []; if (C) { const rest = new Set(ids); let cur = 0; order.push(cur); rest.delete(cur); while (rest.size) { let best = -1, bd = Infinity; for (const j of rest) { const d = rs.dist[cur][j]; if (d < bd) { bd = d; best = j; } } order.push(best); rest.delete(best); cur = best; } }
  // 분야 간 유사도: 분야별 개념 빈도 벡터의 코사인
  const fieldVec = new Map<string, Map<string, number>>();
  for (const r of recs) if (r.field) { const m = fieldVec.get(r.field) ?? new Map<string, number>(); fieldVec.set(r.field, m); r.concepts.forEach((c) => m.set(c, (m.get(c) ?? 0) + 1)); }
  const fields = [...fieldVec.entries()].sort((a, b) => [...b[1].values()].reduce((s, v) => s + v, 0) - [...a[1].values()].reduce((s, v) => s + v, 0)).slice(0, 12).map(([f]) => f);
  const cos = (a: Map<string, number>, b: Map<string, number>) => { let d = 0, na = 0, nb = 0; for (const [k, v] of a) { na += v * v; d += v * (b.get(k) ?? 0); } for (const v of b.values()) nb += v * v; return d / (Math.sqrt(na * nb) || 1); };
  return {
    n: withC.length, mean: mean(withC.map((x) => x.rs)), byYear: [...byYear.entries()].filter(([, l]) => l.length >= 15).sort((a, b) => a[0] - b[0]).map(([year, l]) => ({ year, rs: mean(l), n: l.length })),
    byField: [...byField.entries()].filter(([, l]) => l.length >= 15).map(([field, l]) => ({ field, rs: mean(l), n: l.length })).sort((a, b) => b.rs - a.rs), hist,
    top: [...withC].sort((a, b) => b.rs - a.rs).slice(0, 10).map((x) => ({ title: x.r.title, year: x.r.year, cited: x.r.cited, rs: x.rs, concepts: x.r.concepts.slice(0, 4) })),
    conceptHeat: { names: order.map((i) => rs.concepts[i]), m: order.map((a) => order.map((b) => rs.dist[a][b])) },
    fieldHeat: { names: fields, m: fields.map((a) => fields.map((b) => cos(fieldVec.get(a)!, fieldVec.get(b)!))) },
  };
}

async function topicMap(opts: any) {
  const recs = (await textSample(opts, 2200, true)).filter((r) => r.title.length > 5).slice(0, 1800);
  if (recs.length < 40) return { points: [], clusters: [], note: "표본이 작아 계산할 수 없습니다" };
  const docs = recs.map((r) => tokenize(`${r.title} ${r.title} ${r.abstract}`));
  const m = tfidf(docs, { minDf: 3, maxDfShare: 0.4, maxVocab: 4000 });
  const E = lsa(m, 14, 5), xy = pca2(E), k = Math.max(3, Math.min(9, Math.round(Math.sqrt(recs.length / 8))));
  const asg = kmeans(E, k, 5), terms = clusterTerms(m, asg, k, 5);
  const clusters = Array.from({ length: k }, (_, c) => {
    const mem = recs.map((r, i) => ({ r, i })).filter((x) => asg[x.i] === c);
    const ys = mem.map((x) => x.r.year).filter((y) => y > 0);
    return { id: c, size: mem.length, terms: terms[c], yearMean: ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : 0, citedMean: mem.length ? mem.reduce((s, x) => s + x.r.cited, 0) / mem.length : 0,
      top: [...mem].sort((a, b) => b.r.cited - a.r.cited).slice(0, 3).map((x) => ({ title: x.r.title, year: x.r.year, cited: x.r.cited })) };
  });
  const xs = xy.map((p) => p.x), ysv = xy.map((p) => p.y), mx = Math.max(...xs.map(Math.abs), 1e-9), my = Math.max(...ysv.map(Math.abs), 1e-9);
  return { points: recs.map((r, i) => ({ x: xy[i].x / mx, y: xy[i].y / my, c: asg[i], title: r.title, year: r.year, cited: r.cited })), clusters, vocab: m.vocab.length, docs: recs.length };
}

async function topicGap(opts: any) {
  // 순위 상위 4,000편(주제 변천·학제성·토픽 지도와 같은 표본, 같은 캐시)의 제목+초록을 사전과 대조한다.
  // (예전에는 일치 집합 전체에서 초록을 읽어 큰 검색에서 3분 넘게 걸렸다 — 초록은 일치 논문이 표 전체에 흩어져 있어 거의 모든 블록을 읽어야 했기 때문)
  const recs = (await textSample(opts, 4000, true)).filter((r) => r.topic);
  const cols = [...METHODS.map((l) => ({ ...l, kind: "method" })), ...OBJECTS.map((l) => ({ ...l, kind: "object" }))];
  const byTopic = new Map<string, number>(); recs.forEach((r) => byTopic.set(r.topic, (byTopic.get(r.topic) ?? 0) + 1));
  const topics = [...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([t]) => t), tset = new Set(topics);
  const lows = cols.map((l) => l.terms.map((t) => t.toLowerCase()));
  const n = new Map<string, number>(), cnt = new Map<string, number[]>();
  for (const r of recs) {
    if (!tset.has(r.topic)) continue;
    const txt = (r.title + " " + r.abstract.slice(0, 600)).toLowerCase();
    n.set(r.topic, (n.get(r.topic) ?? 0) + 1);
    const row = cnt.get(r.topic) ?? cnt.set(r.topic, new Array(cols.length).fill(0)).get(r.topic)!;
    lows.forEach((terms, i) => { if (terms.some((t) => txt.includes(t))) row[i]++; });
  }
  const N = [...n.values()].reduce((s, v) => s + v, 0), colTot = cols.map((_, i) => topics.reduce((s, t) => s + (cnt.get(t)?.[i] ?? 0), 0));
  const matrix = topics.map((t) => cols.map((_, i) => { const o = cnt.get(t)?.[i] ?? 0, e = ((n.get(t) ?? 0) * colTot[i]) / Math.max(1, N); return { o, e, ratio: e > 0 ? o / e : 0 }; }));
  return { topics, rowN: topics.map((t) => n.get(t) ?? 0), cols: cols.map((c) => ({ id: c.id, label: c.label, kind: c.kind })), matrix, sampled: 0, total: N };
}

// ───────────────────────── G. 재원·오픈액세스 ─────────────────────────
async function funding(sc: Scope) {
  const [funded, topFunders, oaYear, oaAdv, apc, awards] = await Promise.all([
    rows(sc, `SELECT length(funders) > 0 f, count() n, avg(cited) c, quantile(0.5)(cited) m, avgIf(fwci_oa, fwci_oa_known = 1) fw FROM $T WHERE $W GROUP BY f FORMAT JSONEachRow`),
    rows(sc, `SELECT fu, count() n, avg(cited) c, avgIf(fwci, fwci > 0) fw FROM (SELECT arrayJoin(arrayDistinct(funders)) fu, cited, fwci_oa fwci FROM $T WHERE $W) GROUP BY fu ORDER BY n DESC LIMIT 20 FORMAT JSONEachRow`),
    rows(sc, `SELECT year, oa_status s, count() n FROM $T WHERE $W AND year BETWEEN 1995 AND 2027 GROUP BY year, s FORMAT JSONEachRow`),
    rows(sc, `SELECT oa_status s, count() n, avg(cited) c, quantile(0.5)(cited) m, avgIf(fwci_oa, fwci_oa_known = 1) fw FROM $T WHERE $W GROUP BY s ORDER BY n DESC FORMAT JSONEachRow`),
    rows(sc, `SELECT journal, jif, apc_usd apc, cited FROM $T WHERE $W AND apc_usd > 0 AND jif > 0 AND cityHash64(wid) % ${hashMod(sc, 4000)} = 0 LIMIT 1500 FORMAT JSONEachRow`),
    rows(sc, `SELECT year, count() n, sum(n_awards) a, countIf(n_awards > 0) w FROM $T WHERE $W AND year BETWEEN 1995 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
  ]);
  return {
    funded: funded.map((r) => ({ funded: num(r.f) === 1, n: num(r.n), c: num(r.c), m: num(r.m), fw: num(r.fw) })), topFunders: topFunders.map((r) => ({ name: String(r.fu), n: num(r.n), c: num(r.c), fw: num(r.fw) })),
    oaYear: oaYear.map((r) => ({ year: num(r.year), s: String(r.s || "(미상)"), n: num(r.n) })), oaAdv: oaAdv.map((r) => ({ s: String(r.s || "(미상)"), n: num(r.n), c: num(r.c), m: num(r.m), fw: num(r.fw) })),
    apc: apc.map((r) => ({ journal: String(r.journal), jif: num(r.jif), apc: num(r.apc), cited: num(r.cited) })), awards: awards.map((r) => ({ year: num(r.year), n: num(r.n), a: num(r.a), w: num(r.w) })),
  };
}

// ───────────────────────── H. 인용 구조 ─────────────────────────
async function citation(opts: any) {
  const wids = await sharedWids({ ...opts, sort: "cited" }, 260);
  // 참고문헌 연령(Price 지수): 표본 논문 120편의 참고문헌 출판연도 분포
  const refMap = await loadRefs(wids.slice(0, 120));
  const paperYear = new Map<number, number>();
  for (let i = 0; i < wids.length; i += 1000) for (const r of await ch(`SELECT wid, year FROM ${T} WHERE wid IN (${wids.slice(i, i + 1000).join(",")}) FORMAT JSONEachRow`, {}, 100)) paperYear.set(num(r.wid), num(r.year));
  const refIds = [...new Set([...refMap.values()].flat())].slice(0, 20000), refYear = new Map<number, number>();
  for (let i = 0; i < refIds.length; i += 4000) for (const r of await ch(`SELECT wid, year FROM ${T} WHERE wid IN (${refIds.slice(i, i + 4000).join(",")}) FORMAT JSONEachRow`, {}, 100)) refYear.set(num(r.wid), num(r.year));
  const ages: number[] = [];
  for (const [w, list] of refMap) { const py = paperYear.get(w); if (!py) continue; for (const x of list) { const ry = refYear.get(x); if (ry && ry <= py) ages.push(py - ry); } }
  const hist = Array.from({ length: 16 }, (_, i) => ({ age: i, n: ages.filter((a) => (i === 15 ? a >= 15 : a === i)).length }));
  const price = ages.length ? ages.filter((a) => a <= 5).length / ages.length : 0;
  // 주경로: 상위 인용 논문들의 인용 관계에서 SPC 주경로
  const net = await networkLlb(wids);
  const info = new Map<number, { title: string; year: number; cited: number; author: string }>();
  for (let i = 0; i < wids.length; i += 1000) for (const r of await ch(`SELECT wid, title, year, cited, first_author FROM ${T} WHERE wid IN (${wids.slice(i, i + 1000).join(",")}) FORMAT JSONEachRow`, {}, 100)) info.set(num(r.wid), { title: String(r.title), year: num(r.year), cited: num(r.cited), author: String(r.first_author) });
  const nodes = [...info.entries()].map(([w, v]) => ({ id: `w${w}`, year: v.year }));
  const cites = (net.citations ?? []).map((c: any) => ({ citing: `w${num(c.citing)}`, cited: `w${num(c.cited)}` }));
  const mp = mainPath(nodes, cites);
  return {
    refAge: { hist, price, n: ages.length, papers: refMap.size },
    mainPath: { path: mp.path.map((id) => ({ id, ...(info.get(Number(id.slice(1))) ?? { title: "", year: 0, cited: 0, author: "" }) })), edges: mp.edges, nodes: nodes.length, edgesAll: cites.length },
  };
}

// ───────────────────────── I. 예측·통계 모델 ─────────────────────────
async function model(sc: Scope, onlyYear?: number) {
  const mod = hashMod(sc, 30000), now = 2026;
  const r = await rows(sc, `SELECT wid, cited, year, n_authors, n_refs, abstract_len, is_oa, jif, has_jcr, type, length(arrayDistinct(countries)) nc, length(funders) > 0 funded, is_kr FROM $T WHERE $W AND ${onlyYear ? `year = ${Math.trunc(onlyYear)}` : `year BETWEEN 1990 AND ${now}`} AND cityHash64(wid) % ${mod} = 0 LIMIT 40000 FORMAT JSONEachRow`, 115);
  const names = ["절편", "저자 수(로그)", "참고문헌 수(로그)", "초록 길이(로그)", "오픈액세스", "연구비 지원", "국제 공동(2개국 이상)", "한국 소속", "JCR 있음", "JIF(로그, JCR 있을 때)", "논문 나이(로그)", "리뷰", "프리프린트", "학술대회 논문", "학위논문"];
  const feats = r.map((x) => [1, Math.log1p(num(x.n_authors)), Math.log1p(num(x.n_refs)), Math.log1p(num(x.abstract_len)), num(x.is_oa), num(x.funded), num(x.nc) > 1 ? 1 : 0, num(x.is_kr), num(x.has_jcr), num(x.has_jcr) ? Math.log1p(num(x.jif)) : 0, Math.log1p(Math.max(0, now - num(x.year))), x.type === "review" ? 1 : 0, x.type === "preprint" ? 1 : 0, x.type === "conference-paper" ? 1 : 0, x.type === "dissertation" ? 1 : 0]);
  const y = r.map((x) => Math.log1p(num(x.cited)));
  if (feats.length < 200) return { n: feats.length, note: "표본이 작아 회귀를 계산할 수 없습니다" };
  // 연속 변수는 표준화해 계수 크기를 비교할 수 있게 한다(이진 변수는 그대로)
  const cont = new Set([1, 2, 3, 9, 10]), scale = new Map<number, [number, number]>();
  cont.forEach((j) => { const col = feats.map((f) => f[j]), mu = col.reduce((s, v) => s + v, 0) / col.length, sd = Math.sqrt(col.reduce((s, v) => s + (v - mu) ** 2, 0) / col.length) || 1; scale.set(j, [mu, sd]); });
  const X = feats.map((f) => f.map((v, j) => (scale.has(j) ? (v - scale.get(j)![0]) / scale.get(j)![1] : v)));
  const keep = names.map((_, j) => j).filter((j) => j === 0 || X.some((row) => row[j] !== X[0][j]));   // 상수 열(예: 학위논문이 없는 집합)은 뺀다
  const fit = ols(X.map((row) => keep.map((j) => row[j])), y, keep.map((j) => names[j]));
  const pred = X.map((row) => keep.reduce((s, j, i) => s + row[j] * fit.coef[i], 0));
  const resid = y.map((v, i) => v - pred[i]);
  const idx = resid.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 10);
  const titles = new Map<number, { title: string; year: number; cited: number }>();
  const widList = idx.map(([, i]) => num(r[i].wid));
  for (const t of await ch(`SELECT wid, title, year, cited FROM ${T} WHERE wid IN (${widList.join(",")}) FORMAT JSONEachRow`, {}, 100)) titles.set(num(t.wid), { title: String(t.title), year: num(t.year), cited: num(t.cited) });
  const corrNames = ["저자 수", "참고문헌 수", "초록 길이", "OA", "지원", "국제", "JIF", "나이", "인용(로그)"];
  const corr = correlation([1, 2, 3, 4, 5, 6, 9, 10].map((j) => feats.map((f) => f[j])).concat([y]));
  // 저널 군집: 저널별 [편수(로그), JIF, 평균 인용(로그), OA 비율] → k-means + PCA
  const jr = await rows(sc, `SELECT journal, count() n, avg(cited) c, avgIf(jif, jif > 0) jif, avg(is_oa) oa FROM $T WHERE $W AND journal != '' GROUP BY journal HAVING n >= 3 ORDER BY n DESC LIMIT 200 FORMAT JSONEachRow`);
  let journals: any[] = [];
  if (jr.length >= 12) {
    const F = jr.map((x) => [Math.log1p(num(x.n)), Math.log1p(num(x.jif)), Math.log1p(num(x.c)), num(x.oa)]);
    const cols = F[0].map((_, j) => { const c = F.map((f) => f[j]), mu = c.reduce((s, v) => s + v, 0) / c.length, sd = Math.sqrt(c.reduce((s, v) => s + (v - mu) ** 2, 0) / c.length) || 1; return [mu, sd]; });
    const Z = F.map((f) => f.map((v, j) => (v - cols[j][0]) / cols[j][1])), xy = pca2(Z), asg = kmeans(Z, 4, 9);
    const mx = Math.max(...xy.map((p) => Math.abs(p.x)), 1e-9), my = Math.max(...xy.map((p) => Math.abs(p.y)), 1e-9);
    journals = jr.map((x, i) => ({ journal: String(x.journal), n: num(x.n), c: num(x.c), jif: num(x.jif), oa: num(x.oa), x: xy[i].x / mx, y: xy[i].y / my, k: asg[i] }));
  }
  return {
    n: fit.n, r2: fit.r2, names: fit.names, coef: fit.coef, se: fit.se, t: fit.t, corr: { names: corrNames, m: corr },
    outliers: idx.map(([res, i]) => ({ ...(titles.get(num(r[i].wid)) ?? { title: "", year: 0, cited: 0 }), residual: res })), journals, sampled: mod > 1 ? mod : 0,
  };
}

// ───────────────────────── J. 품질·검색 설계 ─────────────────────────
async function quality(sc: Scope) {
  const [comp, flags, flow] = await Promise.all([
    rows(sc, `SELECT year, count() n, countIf(has_abstract = 1) abs, countIf(doi != '') doi, countIf(journal != '') jn, countIf(length(author_names) > 0) au, countIf(length(inst_names) > 0) inst, countIf(length(countries) > 0) cn, countIf(oa_status != '') oa, countIf(length(keywords) > 0) kw, countIf(has_jcr = 1) jcr, countIf(length(funders) > 0) fu, countIf(length(mesh_terms) > 0) mesh, countIf(pmid > 0) pmid FROM $T WHERE $W AND year BETWEEN 1990 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT year, count() n, sum(is_retracted) ret, countIf(meta_conflict > 0) conf, sum(is_paratext) para FROM $T WHERE $W AND year BETWEEN 1990 AND 2027 GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT count() n, countIf(is_citable = 1) c1, countIf(is_citable = 1 AND has_abstract = 1) c2, countIf(is_citable = 1 AND has_abstract = 1 AND is_retracted = 0 AND is_paratext = 0) c3, countIf(is_citable = 1 AND has_abstract = 1 AND is_retracted = 0 AND is_paratext = 0 AND meta_conflict = 0) c4, countIf(is_citable = 1 AND has_abstract = 1 AND is_retracted = 0 AND is_paratext = 0 AND meta_conflict = 0 AND year >= toYear(now()) - 10) c5, countIf(is_citable = 1 AND has_abstract = 1 AND is_retracted = 0 AND is_paratext = 0 AND meta_conflict = 0 AND year >= toYear(now()) - 10 AND has_jcr = 1) c6 FROM $T WHERE $W FORMAT JSONEachRow`),
  ]);
  const meta = await ch(`SELECT value FROM ${DB}.lit_meta FINAL WHERE key = 'eligible_rows' LIMIT 1 FORMAT JSONEachRow`, {}, 30).catch(() => []);
  const f = flow[0] ?? {};
  return {
    completeness: comp.map((r) => ({ year: num(r.year), n: num(r.n), abs: num(r.abs), doi: num(r.doi), jn: num(r.jn), au: num(r.au), inst: num(r.inst), cn: num(r.cn), oa: num(r.oa), kw: num(r.kw), jcr: num(r.jcr), fu: num(r.fu), mesh: num(r.mesh), pmid: num(r.pmid) })),
    flags: flags.map((r) => ({ year: num(r.year), n: num(r.n), ret: num(r.ret), conf: num(r.conf), para: num(r.para) })),
    prisma: [
      { label: "데이터베이스(lit_papers) 전체", n: num(meta[0]?.value) || 0 }, { label: "검색어 일치", n: num(f.n) }, { label: "연구논문으로 판정", n: num(f.c1) }, { label: "초록 있음", n: num(f.c2) },
      { label: "철회·비본문 제외", n: num(f.c3) }, { label: "오결합 의심 제외", n: num(f.c4) }, { label: "최근 10년", n: num(f.c5) }, { label: "JCR 지표 있음(저널 지표 분석 가능)", n: num(f.c6) },
    ],
  };
}


// ───────────────────────── K. 종단 분석(시간 흐름) ─────────────────────────
const YEAR_NOW = 2026;
async function longitudinal(sc: Scope) {
  const estAuthors = sc.matched * 4, K = Math.max(1, Math.ceil(estAuthors / 120000));
  const [series, topicRows, auth, aging, fieldYear] = await Promise.all([
    rows(sc, `SELECT year, count() n, avg(n_authors) au, avg(is_oa) oa, countIf(length(arrayDistinct(countries)) > 1) / greatest(1, countIf(length(countries) > 0)) intl, avg(n_refs) refs, countIf(has_jcr = 1) / count() jcr, avg(abstract_len) abs, countIf(length(funders) > 0) / count() fu, countIf(is_kr = 1) / count() kr FROM $T WHERE $W AND year BETWEEN 1990 AND ${YEAR_NOW} GROUP BY year ORDER BY year FORMAT JSONEachRow`),
    rows(sc, `SELECT topic, year, count() n FROM $T WHERE $W AND topic != '' AND year BETWEEN 1990 AND ${YEAR_NOW} AND topic IN (SELECT topic FROM $T WHERE $W AND topic != '' GROUP BY topic ORDER BY count() DESC LIMIT 60) GROUP BY topic, year FORMAT JSONEachRow`),
    rows(sc, `SELECT a, groupUniqArray(year) ys FROM (SELECT a, year FROM (SELECT arrayJoin(author_ids) a, year FROM $T WHERE $W AND n_authors <= 60 AND year BETWEEN 1990 AND ${YEAR_NOW}) WHERE cityHash64(a) % ${K} = 0) GROUP BY a LIMIT 200000 FORMAT JSONEachRow`, 115),
    rows(sc, `SELECT year, c.1 - year AS age, sum(c.2) cites, uniqExact(wid) papers FROM (SELECT wid, year, arrayJoin(JSONExtract(counts_by_year, 'Array(Tuple(UInt16, UInt32))')) c FROM $T WHERE $W AND year IN (2000, 2003, 2006, 2009, 2012, 2015, 2018) AND has_ext = 1 AND cityHash64(wid) % ${Math.max(1, Math.ceil(sc.matched / 7 / 20000))} = 0) WHERE age BETWEEN 0 AND 12 GROUP BY year, age ORDER BY year, age FORMAT JSONEachRow`, 115),
    rows(sc, `SELECT field, year, count() n FROM $T WHERE $W AND field != '' AND year BETWEEN 1995 AND ${YEAR_NOW} GROUP BY field, year FORMAT JSONEachRow`),
  ]);
  const ser = series.map((r) => ({ year: num(r.year), n: num(r.n), au: num(r.au), oa: num(r.oa), intl: num(r.intl), refs: num(r.refs), jcr: num(r.jcr), abs: num(r.abs), fu: num(r.fu), kr: num(r.kr) }));
  // 완결 연도: 현재 연도 직전까지, 편수가 충분한 해부터
  const full = ser.filter((r) => r.year < YEAR_NOW && r.year >= 1995), start = full.findIndex((r) => r.n >= 20), use = start >= 0 ? full.slice(start) : [];
  const xs = use.map((r) => r.year), ys = use.map((r) => r.n);
  const growth = fitGrowth(xs, ys, 3).map((g) => ({ ...g, fitted: g.fitted.map((v) => Math.round(v * 10) / 10) }));
  const logCp = changePoints(ys.map((v) => Math.log(v + 1)), 3, 3).map((i) => xs[i]);
  // 정밀화 ① 변화점 검정(Pettitt) ② 최근 3년을 감춘 예측 검증(홀드아웃) ③ Holt 지수평활 예측 ④ 전년 대비 증감률과 95% 구간 ⑤ 잔차 자기상관
  const MODEL_KO_S: Record<string, string> = { linear: "선형", exponential: "지수", logistic: "로지스틱" };
  const pet = pettitt(ys.map((v) => Math.log(v + 1))), petYear = pet.idx >= 0 ? xs[pet.idx + 1] : null;
  const HOLD = 3, backtest: { model: string; mape: number; rmse: number }[] = [];
  if (xs.length >= 10) {
    const trX = xs.slice(0, -HOLD), trY = ys.slice(0, -HOLD), act = ys.slice(-HOLD);
    const score = (model: string, pred: number[]) => backtest.push({ model, mape: pred.reduce((s2, v, i) => s2 + Math.abs(v - act[i]) / Math.max(1, act[i]), 0) / HOLD, rmse: Math.sqrt(pred.reduce((s2, v, i) => s2 + (v - act[i]) ** 2, 0) / HOLD) });
    for (const f of fitGrowth(trX, trY, HOLD)) score(MODEL_KO_S[f.model] ?? f.model, f.forecast.map((v) => v.y));
    const hb = holtForecast(trY, HOLD); if (hb) score("Holt 지수평활", hb.forecast.map((v) => v.y));
    score("단순 지속(마지막 값 유지)", Array(HOLD).fill(trY[trY.length - 1]));
    backtest.sort((a, b) => a.mape - b.mape);
  }
  const hl = holtForecast(ys, 3), holt = hl ? { alpha: hl.alpha, beta: hl.beta, phi: hl.phi, fitted: hl.fitted.map((v) => Math.round(v * 10) / 10), forecast: hl.forecast.map((f, i) => ({ x: xs[xs.length - 1] + i + 1, y: Math.round(f.y), lo: Math.round(f.lo), hi: Math.round(f.hi) })) } : null;
  const yoy = ys.map((v, i) => { if (!i) return null; const r = v / Math.max(1, ys[i - 1]), se = Math.sqrt(1 / Math.max(1, v) + 1 / Math.max(1, ys[i - 1])); return { year: xs[i], n: v, yoy: r - 1, lo: Math.exp(Math.log(r) - 1.96 * se) - 1, hi: Math.exp(Math.log(r) + 1.96 * se) - 1 }; }).filter(Boolean);
  const bestFit = growth[0], resid = bestFit ? ys.map((v, i) => v - bestFit.fitted[i]) : [], ac = autocorr1(resid);
  const metrics = ([["au", "평균 저자 수"], ["oa", "오픈액세스 비율"], ["intl", "국제 공동 비율"], ["refs", "평균 참고문헌 수"], ["jcr", "JCR 지표 보유 비율"], ["abs", "평균 초록 길이"], ["fu", "연구비 기록 비율"], ["kr", "한국 소속 비율"]] as const)
    .map(([k, label]) => { const vals = use.map((r: any) => r[k] as number), mk = mannKendall(xs, vals), tf = mannKendallTFPW(xs, vals), pt = pettitt(vals), cps = changePoints(vals, 2, 4).map((i) => xs[i]); return { key: k, label, years: xs, values: vals, mk, tfpw: { p: tf.p, r1: tf.r1, adjusted: tf.adjusted, dir: tf.dir }, pettitt: { year: pt.idx >= 0 ? xs[pt.idx + 1] : null, p: pt.p }, changePoints: cps }; });
  // 주제 생애주기
  const byTopic = new Map<string, Map<number, number>>(); for (const r of topicRows) { const t = String(r.topic), m = byTopic.get(t) ?? new Map<number, number>(); byTopic.set(t, m); m.set(num(r.year), num(r.n)); }
  const lcYears = xs.slice(), yearN = new Map(ser.map((r) => [r.year, Math.max(1, r.n)]));
  // 생애주기는 ‘전체 편수 대비 점유율’의 변화로 판정한다(전체가 빠르게 크는 분야에서는 편수가 늘었다고 모두 신흥이 되어 버린다)
  const topics = [...byTopic.entries()].map(([topic, m]) => { const counts = lcYears.map((y) => m.get(y) ?? 0), share = lcYears.map((y, i) => (counts[i] / (yearN.get(y) ?? 1)) * 1000), lc = lifecycle(lcYears, share); return { topic, total: counts.reduce((s, v) => s + v, 0), ...lc, series: counts }; }).filter((t) => t.total >= 20).sort((a, b) => b.total - a.total);
  // 분야 CAGR · 추세
  const byField = new Map<string, Map<number, number>>(); for (const r of fieldYear) { const f = String(r.field), m = byField.get(f) ?? new Map<number, number>(); byField.set(f, m); m.set(num(r.year), num(r.n)); }
  const fy0 = Math.max(xs[0] ?? 2000, 2000), fy1 = xs[xs.length - 1] ?? 2025;
  const fields = [...byField.entries()].map(([field, m]) => { const yrs = Array.from({ length: fy1 - fy0 + 1 }, (_, i) => fy0 + i), vals = yrs.map((y) => m.get(y) ?? 0), tot = vals.reduce((s, v) => s + v, 0), a = vals.slice(0, 3).reduce((s, v) => s + v, 0) / 3, b = vals.slice(-3).reduce((s, v) => s + v, 0) / 3; return { field, total: tot, cagr: cagr(a, b, fy1 - fy0 - 2), mk: mannKendall(yrs, vals), years: yrs, values: vals }; }).filter((f) => f.total >= 30).sort((x, y) => y.total - x.total).slice(0, 16);
  // 저자 신규 유입 · 재참여(저자 해시 표본)
  const first = new Map<number, number>(), active = new Map<number, number>(), kept = new Map<number, number>(), maxY = fy1;
  for (const r of auth) {
    const yl: number[] = (Array.isArray(r.ys) ? r.ys : []).map(Number).sort((a: number, b: number) => a - b), set = new Set(yl);
    if (!yl.length) continue;
    first.set(yl[0], (first.get(yl[0]) ?? 0) + 1);
    for (const y of yl) { active.set(y, (active.get(y) ?? 0) + 1); if (y <= maxY - 3 && (set.has(y + 1) || set.has(y + 2) || set.has(y + 3))) kept.set(y, (kept.get(y) ?? 0) + 1); }
  }
  const authors = xs.filter((y) => (active.get(y) ?? 0) >= 50).map((y) => ({ year: y, active: active.get(y) ?? 0, newShare: (first.get(y) ?? 0) / (active.get(y) ?? 1), retention: y <= maxY - 3 ? (kept.get(y) ?? 0) / (active.get(y) ?? 1) : null }));
  // 저자 활동 지속(Kaplan–Meier): 처음 등장한 해로부터 몇 해째까지 계속 쓰는가. 마지막 논문이 최근 3년 이내면 중도절단
  const kmGroups = (() => {
    const cuts = [xs[0], xs[0] + Math.floor((fy1 - 6 - xs[0]) / 3), xs[0] + Math.floor(((fy1 - 6 - xs[0]) * 2) / 3), fy1 - 6], out: { label: string; curve: { t: number; s: number; atRisk: number }[]; n: number }[] = [];
    if (fy1 - 6 - xs[0] < 6) return out;
    for (let g = 0; g < 3; g++) {
      const lo = cuts[g] + (g ? 1 : 0), hi = cuts[g + 1], dur: number[] = [], ev: boolean[] = [];
      for (const r of auth) { const yl: number[] = (Array.isArray(r.ys) ? r.ys : []).map(Number).sort((a: number, b: number) => a - b); if (!yl.length) continue; const f0 = yl[0], l0 = yl[yl.length - 1]; if (f0 < lo || f0 > hi) continue; const exited = l0 <= fy1 - 3; dur.push(exited ? l0 - f0 : fy1 - f0); ev.push(exited); }
      if (dur.length >= 50) out.push({ label: `${lo}–${hi}년 첫 등장`, curve: kaplanMeier(dur, ev, 12), n: dur.length });
    }
    return out;
  })();
  // 코호트 인용 궤적과 반감기
  const cohorts = [...new Set<number>(aging.map((r) => num(r.year)))].sort((a, b) => a - b).map((y) => {
    const rs = aging.filter((r) => num(r.year) === y).sort((a, b) => num(a.age) - num(b.age)), pap = Math.max(1, ...rs.map((r) => num(r.papers)));
    let cum = 0; const curve = rs.map((r) => ({ age: num(r.age), annual: num(r.cites) / pap, cum: (cum += num(r.cites) / pap) })), total = curve.length ? curve[curve.length - 1].cum : 0;
    const peak = curve.reduce((b, c) => (c.annual > (b?.annual ?? -1) ? c : b), curve[0]), half = curve.find((c) => c.cum >= total / 2);
    return { year: y, curve, total, peakAge: peak?.age ?? 0, halfAge: half?.age ?? 0, papers: pap };
  });
  return { series: ser, years: xs, counts: ys, growth, changePoints: logCp, pettitt: { year: petYear, p: pet.p }, backtest, holdout: HOLD, holt, yoy, residual: { r1: ac.r1, dw: ac.dw }, survival: kmGroups, metrics, topics, fields, authors, cohorts, authorSample: K > 1 ? K : 0 };
}

// ───────────────────────── L. 횡단 분석(한 시점 비교) ─────────────────────────
async function cross(sc: Scope, refYear: number) {
  const Y = Math.trunc(refYear), fl = (expr: string) => rows(sc, `SELECT ${expr} g, count() n, avg(log1p(cited)) m, stddevSamp(log1p(cited)) sd, quantile(0.5)(cited) med FROM $T WHERE $W AND year = ${Y} GROUP BY g FORMAT JSONEachRow`);
  const [byField, byType, byCountry, oaType, oaField, fOa, fFund, fIntl, fKr, fJcr, fTeam, corrRows, years] = await Promise.all([
    rows(sc, `SELECT field g, count() n, avg(log1p(cited)) m, stddevSamp(log1p(cited)) sd, quantile(0.5)(cited) med, quantile(0.25)(cited) q25, quantile(0.75)(cited) q75, quantile(0.9)(cited) q90, avgIf(fwci_oa, fwci_oa_known = 1) f, avg(is_oa) oa, countIf(length(arrayDistinct(countries)) > 1) / greatest(1, countIf(length(countries) > 0)) intl, avg(n_authors) au, countIf(has_jcr = 1) / count() jcr FROM $T WHERE $W AND year = ${Y} AND field != '' GROUP BY g HAVING n >= 20 ORDER BY n DESC LIMIT 20 FORMAT JSONEachRow`),
    rows(sc, `SELECT type g, count() n, avg(log1p(cited)) m, stddevSamp(log1p(cited)) sd, quantile(0.5)(cited) med, avgIf(fwci_oa, fwci_oa_known = 1) f, avg(is_oa) oa FROM $T WHERE $W AND year = ${Y} GROUP BY g HAVING n >= 10 ORDER BY n DESC FORMAT JSONEachRow`),
    rows(sc, `SELECT c g, count() n, avg(log1p(cited)) m, quantile(0.5)(cited) med, avgIf(fwci_oa, fwci_oa_known = 1) f FROM (SELECT arrayJoin(arrayDistinct(countries)) c, cited, fwci_oa, fwci_oa_known FROM $T WHERE $W AND year = ${Y}) GROUP BY g HAVING n >= 15 ORDER BY n DESC LIMIT 15 FORMAT JSONEachRow`),
    rows(sc, `SELECT type, oa_status s, count() n FROM $T WHERE $W AND year = ${Y} GROUP BY type, s FORMAT JSONEachRow`),
    rows(sc, `SELECT field, oa_status s, count() n FROM $T WHERE $W AND year = ${Y} AND field != '' AND field IN (SELECT field FROM $T WHERE $W AND year = ${Y} AND field != '' GROUP BY field ORDER BY count() DESC LIMIT 8) GROUP BY field, s FORMAT JSONEachRow`),
    fl("is_oa = 1"), fl("length(funders) > 0"), fl("length(arrayDistinct(countries)) > 1"), fl("is_kr = 1"), fl("has_jcr = 1"), fl("n_authors >= 6"),
    rows(sc, `SELECT log1p(cited) c, log1p(n_authors) a, log1p(n_refs) r, log1p(abstract_len) l, if(jif > 0, log1p(jif), 0) j, is_oa o, length(arrayDistinct(countries)) nc, length(funders) > 0 f FROM $T WHERE $W AND year = ${Y} AND cityHash64(wid) % ${hashMod(sc, 24000)} = 0 LIMIT 24000 FORMAT JSONEachRow`),
    rows(sc, `SELECT year, count() n FROM $T WHERE $W AND year BETWEEN 2000 AND ${YEAR_NOW - 1} GROUP BY year ORDER BY year FORMAT JSONEachRow`),
  ]);
  const grp = (r: any) => ({ n: num(r.n), mean: num(r.m), sd: num(r.sd) });
  const flagRow = (label: string, rs: any[]) => {
    const yes = rs.find((r) => num(r.g) === 1), no = rs.find((r) => num(r.g) === 0);
    if (!yes || !no || num(yes.n) < 20 || num(no.n) < 20) return null;
    return { label, yes: { n: num(yes.n), med: num(yes.med) }, no: { n: num(no.n), med: num(no.med) }, ...welch(grp(yes), grp(no)) };
  };
  const compare = [flagRow("오픈액세스 vs 비OA", fOa), flagRow("연구비 지원 기록 있음 vs 없음", fFund), flagRow("국제 공동(2개국 이상) vs 단일국", fIntl), flagRow("한국 소속 포함 vs 미포함", fKr), flagRow("JCR 지표 있음 vs 없음", fJcr), flagRow("저자 6명 이상 vs 5명 이하", fTeam)].filter(Boolean);
  const fieldGroups = byField.map(grp), an = anova(fieldGroups), anType = anova(byType.map(grp));
  const toTable = (rs: any[], rk: string) => { const rl = [...new Set(rs.map((r) => String(r[rk])))], cl = [...new Set(rs.map((r) => String(r.s || "(미상)")))]; const tab = rl.map((r) => cl.map((c) => rs.filter((x) => String(x[rk]) === r && String(x.s || "(미상)") === c).reduce((s, x) => s + num(x.n), 0))); return { rows: rl, cols: cl, tab }; };
  const t1 = toTable(oaType, "type"), t2 = toTable(oaField, "field");
  const keep1 = t1.rows.map((_, i) => (t1.tab[i].reduce((s, v) => s + v, 0) >= 30 ? i : -1)).filter((i) => i >= 0);
  const x1 = { rows: keep1.map((i) => t1.rows[i]), cols: t1.cols, tab: keep1.map((i) => t1.tab[i]) };
  const c1 = x1.rows.length >= 2 ? chi2Test(x1.tab) : null, c2 = t2.rows.length >= 2 ? chi2Test(t2.tab) : null;
  const cn = ["피인용(로그)", "저자 수", "참고문헌 수", "초록 길이", "JIF", "OA", "국가 수", "지원"], keys = ["c", "a", "r", "l", "j", "o", "nc", "f"];
  const corr = corrRows.length > 100 ? correlation(keys.map((k) => corrRows.map((r) => num(r[k])))) : [];
  const reg = await model(sc, Y).catch(() => null);
  // 정밀화: ① 다중비교 보정(Holm)·Hedges g 신뢰구간 ② 분산분석의 비모수 대응(Kruskal–Wallis, 표본) ③ 반복 횡단 — 해마다 같은 비교를 되풀이해 효과 크기의 추이를 본다(FWCI 로 논문 나이 보정)
  const cmp = compare as any[], adj = holm(cmp.map((c) => c.p)); cmp.forEach((c, i) => { c.pAdj = adj[i]; const hg = hedgesCI(c.d, c.yes.n, c.no.n); c.g = hg.g; c.gCi = hg.ci; });
  const nSum = byField.reduce((s2, r) => s2 + num(r.n), 0), kk = Math.max(1, Math.ceil(nSum / 40000)), topF = byField.slice(0, 8).map((r) => `'${String(r.g).replace(/'/g, "''")}'`).join(",");
  const kwRaw = async (col: string, inList: string) => { if (!inList) return null; const rs = await rows(sc, `SELECT ${col} g, cited FROM $T WHERE $W AND year = ${Y} AND ${col} IN (${inList}) AND cityHash64(wid) % ${kk} = 0 LIMIT 60000 FORMAT JSONEachRow`).catch(() => []); const m = new Map<string, number[]>(); for (const r of rs) (m.get(String(r.g)) ?? m.set(String(r.g), []).get(String(r.g))!).push(num(r.cited)); const res = kruskal([...m.values()]); return { ...res, groups: m.size }; };
  const topT = byType.filter((r) => num(r.n) >= 30).slice(0, 8).map((r) => `'${String(r.g).replace(/'/g, "''")}'`).join(",");
  const [kwField, kwType] = await Promise.all([kwRaw("field", topF), kwRaw("type", topT)]);
  const flagAgg = (nm: string, cond: string) => `countIf((${cond}) AND fwci_oa_known = 1) ${nm}n1, avgIf(log1p(fwci_oa), (${cond}) AND fwci_oa_known = 1) ${nm}m1, stddevSampIf(log1p(fwci_oa), (${cond}) AND fwci_oa_known = 1) ${nm}s1, countIf(NOT (${cond}) AND fwci_oa_known = 1) ${nm}n0, avgIf(log1p(fwci_oa), NOT (${cond}) AND fwci_oa_known = 1) ${nm}m0, stddevSampIf(log1p(fwci_oa), NOT (${cond}) AND fwci_oa_known = 1) ${nm}s0`;
  const FL: [string, string, string][] = [["oa", "오픈액세스", "is_oa = 1"], ["intl", "국제 공동", "length(arrayDistinct(countries)) > 1"], ["fund", "연구비 기록", "length(funders) > 0"], ["team", "저자 6명 이상", "n_authors >= 6"]];
  const effRows = await rows(sc, `SELECT year, count() n, quantile(0.5)(cited) med, avg(is_oa) oa, countIf(length(arrayDistinct(countries)) > 1) / count() intl, ${FL.map(([k, , c]) => flagAgg(k, c)).join(", ")} FROM $T WHERE $W AND year BETWEEN 2005 AND ${YEAR_NOW - 1} GROUP BY year ORDER BY year FORMAT JSONEachRow`).catch(() => []);
  const effects = FL.map(([k, label]) => ({ key: k, label, points: effRows.map((r) => { const n1 = num(r[k + "n1"]), n0 = num(r[k + "n0"]); if (n1 < 20 || n0 < 20) return null; const w = welch({ n: n1, mean: num(r[k + "m1"]), sd: num(r[k + "s1"]) }, { n: n0, mean: num(r[k + "m0"]), sd: num(r[k + "s0"]) }), hg = hedgesCI(w.d, n1, n0); return { year: num(r.year), d: hg.g, lo: hg.ci[0], hi: hg.ci[1], n1, n0, p: w.p }; }).filter(Boolean) }));
  const yearStats = effRows.map((r) => ({ year: num(r.year), n: num(r.n), med: num(r.med), oa: num(r.oa), intl: num(r.intl) }));
  return {
    refYear: Y, years: years.map((r) => ({ year: num(r.year), n: num(r.n) })).filter((r) => r.n >= 30).map((r) => r.year),
    fields: byField.map((r) => ({ name: String(r.g), n: num(r.n), mean: num(r.m), med: num(r.med), q25: num(r.q25), q75: num(r.q75), q90: num(r.q90), f: num(r.f), oa: num(r.oa), intl: num(r.intl), au: num(r.au), jcr: num(r.jcr) })),
    types: byType.map((r) => ({ name: String(r.g), n: num(r.n), mean: num(r.m), med: num(r.med), f: num(r.f), oa: num(r.oa) })),
    countries: byCountry.map((r) => ({ name: String(r.g), n: num(r.n), med: num(r.med), f: num(r.f) })), compare, anova: { field: an, type: anType, nFields: fieldGroups.length },
    tabs: { typeOa: c1 ? { ...x1, chi2: c1.chi2, df: c1.df, p: c1.p, v: c1.v, resid: c1.resid } : null, fieldOa: c2 ? { ...t2, chi2: c2.chi2, df: c2.df, p: c2.p, v: c2.v, resid: c2.resid } : null },
    corr: { names: cn, m: corr, n: corrRows.length }, regression: reg, kw: { field: kwField, type: kwType, sampleEvery: kk }, effects, yearStats,
  };
}

export async function dashboardSection(opts: any, section: Section, extra: { refYear?: number } = {}): Promise<any> {
  const t0 = Date.now();
  const needsScope = !["topic_evo", "topic_rs", "topic_map", "topic_gap", "citation"].includes(section);
  const sc = needsScope ? await matchScope(opts) : null;
  let data: any;
  switch (section) {
    case "trend": data = await trend(sc!); break;
    case "impact": data = await impact(sc!); break;
    case "journal": data = await journal(sc!); break;
    case "author": data = await author(sc!); break;
    case "geo": data = await geo(sc!); break;
    case "topic_year": data = await topicYear(sc!); break;
    case "topic_evo": data = await topicEvo(opts); break;
    case "topic_rs": data = await topicRs(opts); break;
    case "topic_map": data = await topicMap(opts); break;
    case "topic_gap": data = await topicGap(opts); break;
    case "funding": data = await funding(sc!); break;
    case "citation": data = await citation(opts); break;
    case "model": data = await model(sc!); break;
    case "quality": data = await quality(sc!); break;
    case "longitudinal": data = await longitudinal(sc!); break;
    case "cross": data = await cross(sc!, extra.refYear ?? YEAR_NOW - 2); break;
  }
  // 일치 편수(머리말용). 검색 화면의 개수 질의(searchLlb)는 제한 시간이 15초라 큰 검색·부하 때 실패해 영역 전체를 망쳤다 — 긴 제한의 matchScope 로 세고, 그래도 안 되면 편수만 비운다(분석 결과는 그대로 돌려준다)
  const head = sc ? { matched: sc.matched, staged: sc.staged } : await matchScope(opts).then((m) => ({ matched: m.matched as number | null, staged: m.staged })).catch(() => ({ matched: null as number | null, staged: true }));
  return { section, ...head, ms: Date.now() - t0, data };
}
