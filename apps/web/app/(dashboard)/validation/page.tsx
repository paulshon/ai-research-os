"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useMemo, useCallback } from "react";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import {
  parseValidationResponse,
  type ValidationResultItem,
} from "@/lib/validation-results";
import {
  buildSentenceMap,
  checkGrammar,
  grammarScore,
  detectAI,
  checkPlagiarism,
  qualityGrade,
  type SentenceNode,
  type GrammarIssue,
  type AIDetectionResult,
  type PlagiarismResult,
} from "@/lib/validation/sentence-engine";

/* ════════════════════════════════════════════════════════════
   v41: Research Validation Center (검토·검증)
   두 IA 문서를 반영하여 표절검사 · 맞춤법검사 · AI 생성 탐지를
   "동일한 문장 단위(Sentence Map) 엔진"으로 통합.
   탭: 표절검사 / 맞춤법검사 / AI 생성 탐지 / AI 심층검증(Gemini) / 통합품질보고서
═══════════════════════════════════════════════════════════════ */

type VTab = "plagiarism" | "grammar" | "ai" | "deep" | "report";

const MODE_PROMPTS: Record<string, string> = {
  apa: "APA 7th edition citation and formatting compliance",
  gap: "research gap identification and novelty",
  effectsize: "effect size reporting and statistical interpretation",
  logic: "logical consistency and argument flow",
  structure: "thesis structure and section coherence",
};

function validationSystemPrompt(modeDesc: string, locale: string): string {
  const lang = locale === "en" ? "English" : locale === "zh" ? "Chinese" : "Korean";
  return `You are an academic validation expert focused on ${modeDesc}.
Respond in ${lang}.
Return ONLY a JSON array (no markdown fences) where each item has:
- "severity": one of "error", "warning", "success", "info"
- "title": short issue title (string, required)
- "desc": detailed explanation and recommendation (string, required)
- "score": optional number 0-100
Provide 4-8 concrete findings about the user's text.`;
}

interface VDraft {
  content: string;
  tab: VTab;
  aiResults: ValidationResultItem[];
  validationType: string;
}

function sevColor(sev: string) {
  if (sev === "error") return "#ff7066";
  if (sev === "warning") return "#e8b84b";
  if (sev === "info") return "#6c8cff";
  return "#5ebd7c";
}

function riskColor(p: number) {
  if (p >= 70) return "#ff7066";
  if (p >= 40) return "#e8b84b";
  return "#5ebd7c";
}

function coord(n: { page: number; paragraph: number; sentence: number }) {
  return `${n.page}p · ${n.paragraph}문단 · ${n.sentence}문장`;
}

export default function ValidationPage() {
  const { t, locale } = useTranslation();
  const { generate, loading } = useGemini();

  const [content, setContent] = useState("");
  const [tab, setTab] = useState<VTab>("plagiarism");

  // 로컬 엔진 결과
  const [sentenceMap, setSentenceMap] = useState<SentenceNode[]>([]);
  const [grammar, setGrammar] = useState<GrammarIssue[]>([]);
  const [gScore, setGScore] = useState<number | null>(null);
  const [ai, setAi] = useState<AIDetectionResult[]>([]);
  const [aiOverall, setAiOverall] = useState<number | null>(null);
  const [plag, setPlag] = useState<PlagiarismResult[]>([]);
  const [plagOverall, setPlagOverall] = useState<number | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  // Gemini 심층검증
  const [aiResults, setAiResults] = useState<ValidationResultItem[]>([]);
  const [validationType, setValidationType] = useState("apa");
  const [errorMsg, setErrorMsg] = useState("");

  const getData = useCallback(
    (): VDraft => ({ content, tab, aiResults, validationType }),
    [content, tab, aiResults, validationType]
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as VDraft;
    if (d.content !== undefined) setContent(d.content);
    if (d.tab) setTab(d.tab);
    if (d.aiResults) setAiResults(d.aiResults);
    if (d.validationType) setValidationType(d.validationType);
  }, []);
  const handleReset = useCallback(() => {
    setContent(""); setTab("plagiarism");
    setSentenceMap([]); setGrammar([]); setGScore(null);
    setAi([]); setAiOverall(null); setPlag([]); setPlagOverall(null);
    setAnalyzed(false); setAiResults([]); setValidationType("apa"); setErrorMsg("");
  }, []);
  usePagePersistence("validation", handleLoad, handleReset);

  // ── 통합 분석 실행 (세 엔진이 동일 Sentence Map 공유) ──
  const runAllLocal = useCallback(() => {
    if (!content.trim()) return;
    const map = buildSentenceMap(content);
    setSentenceMap(map);
    const g = checkGrammar(map);
    setGrammar(g);
    setGScore(grammarScore(map, g));
    const aiRes = detectAI(map);
    setAi(aiRes.results);
    setAiOverall(aiRes.overall);
    const pRes = checkPlagiarism(map);
    setPlag(pRes.results);
    setPlagOverall(pRes.overall);
    setAnalyzed(true);
  }, [content]);

  // 페이지별 집계
  const pageStats = useMemo(() => {
    const byPage = new Map<number, { plag: number[]; ai: number[] }>();
    sentenceMap.forEach((n) => {
      if (!byPage.has(n.page)) byPage.set(n.page, { plag: [], ai: [] });
    });
    plag.forEach((p) => byPage.get(p.page)?.plag.push(p.similarity));
    ai.forEach((a) => byPage.get(a.page)?.ai.push(a.aiProbability));
    return [...byPage.entries()].sort((a, b) => a[0] - b[0]).map(([page, v]) => ({
      page,
      plag: v.plag.length ? Math.round(v.plag.reduce((a, b) => a + b, 0) / v.plag.length) : 0,
      ai: v.ai.length ? Math.round(v.ai.reduce((a, b) => a + b, 0) / v.ai.length) : 0,
    }));
  }, [sentenceMap, plag, ai]);

  const VALIDATION_MODES = [
    { id: "apa", label: t("validation.modeApa"), desc: MODE_PROMPTS.apa },
    { id: "gap", label: t("validation.modeGap"), desc: MODE_PROMPTS.gap },
    { id: "effectsize", label: t("validation.modeEffect"), desc: MODE_PROMPTS.effectsize },
    { id: "logic", label: t("validation.modeLogic"), desc: MODE_PROMPTS.logic },
    { id: "structure", label: t("validation.modeStructure"), desc: MODE_PROMPTS.structure },
  ];

  const runDeepValidation = async () => {
    if (!content.trim()) return;
    const mode = VALIDATION_MODES.find((m) => m.id === validationType);
    setErrorMsg(""); setAiResults([]);
    try {
      const result = await generate({
        systemInstruction: validationSystemPrompt(mode?.desc || "academic quality", locale),
        userText: content.slice(0, 12000),
        temperature: 0.3,
        maxOutputTokens: 8192,
      });
      if (!result.trim()) { setErrorMsg(t("validation.emptyResponse")); return; }
      const parsed = parseValidationResponse(result);
      if (parsed.length === 0) {
        setErrorMsg(t("validation.parseFailed"));
        setAiResults([{ severity: "info", title: "AI", desc: result }]);
        return;
      }
      setAiResults(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message === "API_KEY_MISSING"
        ? t("validation.apiKeyMissing")
        : e instanceof Error ? e.message : "Failed";
      setErrorMsg(msg);
      setAiResults([{ severity: "error", title: t("validation.errorTitle"), desc: msg }]);
    }
  };

  const TABS: { id: VTab; label: string; icon: string }[] = [
    { id: "plagiarism", label: "표절검사", icon: "plagiarism" },
    { id: "grammar", label: "맞춤법검사", icon: "spell" },
    { id: "ai", label: "AI 생성 탐지", icon: "aiscan" },
    { id: "deep", label: "AI 심층검증", icon: "shieldCheck" },
    { id: "report", label: "통합품질보고서", icon: "checklist" },
  ];

  const grade = useMemo(() => {
    if (plagOverall == null || gScore == null || aiOverall == null) return null;
    return qualityGrade(plagOverall, gScore, aiOverall);
  }, [plagOverall, gScore, aiOverall]);

  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <PageSaveRegistration pageId="validation" getData={getData} />
      <div className="max-w-[1680px] mx-auto flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="shield" size={20} className="text-[#ff7066]" />
          <h1 className="text-[23px] font-bold font-nanum-myeongjo">검토·검증 센터</h1>
        </div>
        <p className="text-[16px] text-white/35 mb-5">
          표절검사 · 맞춤법검사 · AI 생성 탐지가 동일한 문장 단위 엔진(Sentence Map)을 공유합니다.
        </p>

        {/* 공유 입력 */}
        <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.04] mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[15px] font-semibold text-white/70">검사 대상 본문</p>
            {analyzed && (
              <span className="text-[13px] text-white/30">
                문장 {sentenceMap.length}개 · {pageStats.length}p
              </span>
            )}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-36 px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[16px] text-white/80 leading-relaxed focus:border-[#6c8cff] focus:outline-none resize-y mb-3"
            placeholder="검사할 논문 본문을 붙여넣으세요. 한 번 분석하면 표절·맞춤법·AI 결과가 같은 문장 좌표로 연결됩니다."
          />
          <button
            onClick={runAllLocal}
            disabled={!content.trim()}
            className="px-6 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-medium disabled:opacity-40"
          >
            {analyzed ? "다시 분석" : "통합 검사 실행"}
          </button>
          {analyzed && (
            <span className="ml-3 text-[14px] text-white/30">
              표절 {plagOverall}% · 맞춤법 {gScore}점 · AI {aiOverall}%
            </span>
          )}
        </div>

        {/* 탭 */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-none border-b border-white/[0.05] pb-2">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-3 py-1.5 rounded-lg text-[15px] whitespace-nowrap flex items-center gap-1.5 transition-all ${
                tab === tb.id ? "bg-[#1e2230] text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              <Icon name={tb.icon} size={14} className="inline-flex align-[-0.125em]" /> {tb.label}
            </button>
          ))}
        </div>

        {/* ── 표절검사 ── */}
        {tab === "plagiarism" && (
          <div>
            {!analyzed ? (
              <EmptyHint icon="plagiarism" text="본문을 입력하고 ‘통합 검사 실행’을 누르세요." />
            ) : (
              <>
                <ScoreHeader label="전체 유사도" value={`${plagOverall}%`} color={riskColor(plagOverall ?? 0)}
                  sub={(plagOverall ?? 0) < 15 ? "낮음" : (plagOverall ?? 0) < 30 ? "주의" : "높음"} />
                <PageBars stats={pageStats} field="plag" label="페이지별 유사도" />
                <SentenceList
                  title="유사/중복 문장"
                  empty="표절 의심 문장이 발견되지 않았습니다."
                  items={plag.map((p) => ({
                    coord: coord(p),
                    metric: `${p.similarity}%`,
                    color: riskColor(p.similarity),
                    text: sentenceMap.find((s) => s.id === p.sentenceId)?.text ?? "",
                    note: p.plagiarismType === "internal" ? `유형: 내부중복 · ${p.note}`
                      : p.plagiarismType === "uncited-quote" ? `유형: 인용누락 · ${p.note}` : p.note,
                  }))}
                />
                <p className="text-[13px] text-white/20 mt-3">
                  로컬 엔진은 문서 내부 중복(자기표절)·인용 누락을 탐지합니다. 외부 출처 대조는 학술 DB 연동 시 확장됩니다.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── 맞춤법검사 ── */}
        {tab === "grammar" && (
          <div>
            {!analyzed ? (
              <EmptyHint icon="spell" text="본문을 입력하고 ‘통합 검사 실행’을 누르세요." />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                  <StatCard label="정확도" value={`${gScore}점`} color="#5ebd7c" />
                  <StatCard label="오류" value={`${grammar.filter((g) => g.severity === "error").length}개`} color="#ff7066" />
                  <StatCard label="경고" value={`${grammar.filter((g) => g.severity === "warning").length}개`} color="#e8b84b" />
                  <StatCard label="권장" value={`${grammar.filter((g) => g.severity === "info").length}개`} color="#6c8cff" />
                </div>
                <SentenceList
                  title="교정 제안"
                  empty="발견된 맞춤법·문체 문제가 없습니다."
                  items={grammar.map((g) => ({
                    coord: coord(g),
                    metric: g.category,
                    color: sevColor(g.severity),
                    text: `${g.original}  →  ${g.suggestion}`,
                    note: g.reason,
                  }))}
                />
              </>
            )}
          </div>
        )}

        {/* ── AI 생성 탐지 ── */}
        {tab === "ai" && (
          <div>
            {!analyzed ? (
              <EmptyHint icon="aiscan" text="본문을 입력하고 ‘통합 검사 실행’을 누르세요." />
            ) : (
              <>
                <ScoreHeader label="AI 생성률" value={`${aiOverall}%`} color={riskColor(aiOverall ?? 0)}
                  sub={(aiOverall ?? 0) < 40 ? "인간 작성 우세" : (aiOverall ?? 0) < 70 ? "혼재" : "AI 가능성 높음"} />
                <PageBars stats={pageStats} field="ai" label="페이지별 생성률" />
                <SentenceList
                  title="위험 문장 (AI 가능성 상위)"
                  empty="AI 생성 의심 문장이 없습니다."
                  items={[...ai]
                    .filter((a) => a.aiProbability >= 40)
                    .sort((a, b) => b.aiProbability - a.aiProbability)
                    .slice(0, 20)
                    .map((a) => ({
                      coord: coord(a),
                      metric: `${a.aiProbability}%`,
                      color: riskColor(a.aiProbability),
                      text: sentenceMap.find((s) => s.id === a.sentenceId)?.text ?? "",
                      note: `원인: ${a.reasons.join(" · ")}  |  Perplexity ${a.perplexity} · Burstiness ${a.burstiness} · Entropy ${a.entropy}`,
                    }))}
                />
              </>
            )}
          </div>
        )}

        {/* ── AI 심층검증 (Gemini) ── */}
        {tab === "deep" && (
          <div className="p-6 rounded-2xl bg-[#13161e] border border-white/[0.04]">
            <h3 className="text-[17px] font-semibold mb-3">{t("validation.aiDeep")}</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {VALIDATION_MODES.map((m) => (
                <button key={m.id} onClick={() => setValidationType(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-[14px] border transition-all ${
                    validationType === m.id ? "bg-[#4a6cf7]/10 border-[#4a6cf7]/30 text-[#6c8cff]" : "border-white/[0.04] text-white/30"
                  }`}>{m.label}</button>
              ))}
            </div>
            <button onClick={runDeepValidation} disabled={loading || !content.trim()}
              className="px-6 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[16px] font-medium disabled:opacity-40">
              {loading ? t("validation.running") : t("validation.run")}
            </button>
            {errorMsg && !loading && <p className="mt-3 text-[15px] text-[#ff7066]/90">{errorMsg}</p>}
            {!loading && aiResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {aiResults.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl border" style={{ borderColor: `${sevColor(r.severity)}33`, backgroundColor: `${sevColor(r.severity)}0d` }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[16px] font-medium text-white/90">{r.title}</p>
                      {r.score !== undefined && Number.isFinite(r.score) && (
                        <span className="text-[14px] font-bold text-[#6c8cff] shrink-0">{r.score}{t("validation.points")}</span>
                      )}
                    </div>
                    <p className="text-[15px] text-white/60 mt-1 leading-relaxed whitespace-pre-wrap">{r.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 통합품질보고서 ── */}
        {tab === "report" && (
          <div>
            {!analyzed || !grade ? (
              <EmptyHint icon="checklist" text="‘통합 검사 실행’ 후 종합 품질 등급이 산출됩니다." />
            ) : (
              <>
                <div className="p-6 rounded-2xl bg-[#13161e] border border-white/[0.06] mb-5 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[47px] font-bold leading-none" style={{ color: grade.total >= 74 ? "#5ebd7c" : grade.total >= 58 ? "#e8b84b" : "#ff7066" }}>
                      {grade.grade}
                    </p>
                    <p className="text-[14px] text-white/30 mt-1">최종 품질등급</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[15px] text-white/60">종합 점수</span>
                      <span className="text-[19px] font-bold text-[#6c8cff]">{grade.total}점</span>
                    </div>
                    <div className="h-2.5 bg-[#1a1e2a] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#6c8cff] to-[#5ebd7c] rounded-full" style={{ width: `${grade.total}%` }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <StatCard label="표절 점수" value={`${plagOverall}%`} color={riskColor(plagOverall ?? 0)} sub="낮을수록 양호" />
                  <StatCard label="맞춤법 점수" value={`${gScore}점`} color="#5ebd7c" sub="높을수록 양호" />
                  <StatCard label="AI 위험도" value={`${aiOverall}%`} color={riskColor(aiOverall ?? 0)} sub="낮을수록 양호" />
                  <StatCard label="문체(가독성)" value={`${Math.max(0, 100 - grammar.filter(g => g.category === "style").length * 6)}점`} color="#a78bfa" />
                </div>
                <div className="mt-5 p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
                  <p className="text-[15px] font-semibold mb-2">수정 우선순위</p>
                  <ol className="space-y-1.5 text-[15px] text-white/60 list-decimal pl-5">
                    {(plagOverall ?? 0) >= 30 && <li>표절 의심 문장 출처 표기·재서술 ({plag.length}건)</li>}
                    {grammar.filter(g => g.severity === "error").length > 0 && <li>맞춤법 오류 교정 ({grammar.filter(g => g.severity === "error").length}건)</li>}
                    {(aiOverall ?? 0) >= 60 && <li>AI 생성 의심 구간 인간 문체로 보완</li>}
                    {grammar.filter(g => g.category === "style").length > 0 && <li>학술문체·문장 길이 정리 ({grammar.filter(g => g.category === "style").length}건)</li>}
                    <li>AI 심층검증(논리·방법론·인용) 실행 후 보강</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
        </div>{/* /flex-1 main */}

        {/* v42: 우측 품질 스냅샷 레일 — 빈 우측 공간을 라이브 요약으로 채움 */}
        <aside className="w-full xl:w-[320px] flex-shrink-0 xl:sticky xl:top-4 space-y-3">
          <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
            <p className="text-[13px] font-semibold text-white/70 mb-3 flex items-center gap-1.5">
              <Icon name="chart" size={15} /> 품질 스냅샷
            </p>
            {!analyzed || !grade ? (
              <p className="text-[12px] text-white/30 leading-relaxed py-2">
                본문을 입력하고 ‘통합 검사 실행’을 누르면 표절·맞춤법·AI 점수가 실시간으로 요약됩니다.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `conic-gradient(${grade.total >= 74 ? "#5ebd7c" : grade.total >= 58 ? "#e8b84b" : "#ff7066"} ${grade.total * 3.6}deg, rgba(255,255,255,0.06) 0deg)` }}>
                    <div className="w-12 h-12 rounded-full bg-[#13161e] flex flex-col items-center justify-center">
                      <span className="text-[16px] font-bold leading-none" style={{ color: grade.total >= 74 ? "#5ebd7c" : grade.total >= 58 ? "#e8b84b" : "#ff7066" }}>{grade.grade}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-white/35">종합 품질 점수</p>
                    <p className="text-[22px] font-bold text-[#6c8cff] leading-tight">{grade.total}<span className="text-[13px] text-white/30 font-normal">점</span></p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "표절 유사도", v: plagOverall ?? 0, good: "low" },
                    { label: "맞춤법 정확도", v: gScore ?? 0, good: "high" },
                    { label: "AI 생성률", v: aiOverall ?? 0, good: "low" },
                  ].map((m) => {
                    const c = m.good === "high" ? "#5ebd7c" : riskColor(m.v);
                    return (
                      <div key={m.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-white/55">{m.label}</span>
                          <span className="text-[12px] font-semibold tabular-nums" style={{ color: c }}>{m.v}{m.label.includes("정확도") ? "점" : "%"}</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1e2a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${m.v}%`, backgroundColor: c }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {analyzed && pageStats.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
              <p className="text-[13px] font-semibold text-white/70 mb-3">페이지별 위험도</p>
              <div className="space-y-2">
                {pageStats.slice(0, 8).map((s) => {
                  const risk = Math.max(s.plag, s.ai);
                  return (
                    <div key={s.page} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/40 w-10">{s.page}p</span>
                      <div className="flex-1 h-1.5 bg-[#1a1e2a] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${risk}%`, backgroundColor: riskColor(risk) }} />
                      </div>
                      <span className="text-[10px] tabular-nums w-8 text-right" style={{ color: riskColor(risk) }}>{risk}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analyzed && grade && (
            <div className="p-4 rounded-2xl bg-[#13161e] border border-white/[0.05]">
              <p className="text-[13px] font-semibold text-white/70 mb-2.5">AI 진단 요약</p>
              <ul className="space-y-1.5 text-[12px] text-white/55">
                <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>표절 의심 {plag.length}건 · 맞춤법 {grammar.filter(g=>g.severity==="error").length}건 오류</span></li>
                <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>AI 생성 의심 {ai.filter(a=>a.aiProbability>=60).length}개 문장</span></li>
                <li className="flex items-start gap-1.5"><span className="text-[#6c8cff] mt-0.5">→</span><span>‘통합품질보고서’ 탭에서 수정 우선순위 확인</span></li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── 보조 컴포넌트 ── */
function EmptyHint({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-20 text-white/15">
      <p className="text-[43px] mb-3 flex justify-center"><Icon name={icon} size={34} /></p>
      <p className="text-[16px]">{text}</p>
    </div>
  );
}

function ScoreHeader({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="p-5 rounded-2xl bg-[#13161e] border border-white/[0.06] mb-4 flex items-center gap-4">
      <div className="text-center min-w-[96px]">
        <p className="text-[37px] font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-[14px] text-white/30 mt-1">{label}</p>
      </div>
      {sub && <span className="text-[15px] px-3 py-1 rounded-full" style={{ backgroundColor: `${color}1f`, color }}>{sub}</span>}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-[#13161e] border border-white/[0.04] text-center">
      <p className="text-[23px] font-bold" style={{ color }}>{value}</p>
      <p className="text-[13px] text-white/35 mt-0.5">{label}</p>
      {sub && <p className="text-[12px] text-white/20">{sub}</p>}
    </div>
  );
}

function PageBars({ stats, field, label }: { stats: { page: number; plag: number; ai: number }[]; field: "plag" | "ai"; label: string }) {
  if (stats.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04] mb-4">
      <p className="text-[15px] font-semibold mb-3">{label}</p>
      <div className="space-y-2">
        {stats.map((s) => {
          const v = s[field];
          return (
            <div key={s.page} className="flex items-center gap-3">
              <span className="text-[14px] text-white/40 w-12">{s.page}페이지</span>
              <div className="flex-1 h-2 bg-[#1a1e2a] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: riskColor(v) }} />
              </div>
              <span className="text-[14px] tabular-nums w-10 text-right" style={{ color: riskColor(v) }}>{v}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SentenceList({ title, items, empty }: {
  title: string;
  empty: string;
  items: { coord: string; metric: string; color: string; text: string; note: string }[];
}) {
  return (
    <div className="p-4 rounded-xl bg-[#13161e] border border-white/[0.04]">
      <p className="text-[15px] font-semibold mb-3">{title} ({items.length})</p>
      {items.length === 0 ? (
        <p className="text-[14px] text-white/25 py-4 text-center">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#1a1e2a]/60 border border-white/[0.03]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[13px] text-white/35">{it.coord}</span>
                <span className="text-[14px] font-bold px-2 py-0.5 rounded" style={{ color: it.color, backgroundColor: `${it.color}1f` }}>{it.metric}</span>
              </div>
              {it.text && <p className="text-[15px] text-white/75 leading-relaxed">{it.text}</p>}
              <p className="text-[13px] text-white/35 mt-1">{it.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
