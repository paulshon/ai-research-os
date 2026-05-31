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

interface ValidationDraft {
  content: string;
  aiResults: ValidationResultItem[];
  validationType: string;
}

const MODE_PROMPTS: Record<string, string> = {
  apa: "APA 7th edition citation and formatting compliance",
  gap: "research gap identification and novelty",
  effectsize: "effect size reporting and statistical interpretation",
  logic: "logical consistency and argument flow",
  structure: "thesis structure and section coherence",
};

function validationSystemPrompt(modeDesc: string, locale: string): string {
  const lang =
    locale === "en" ? "English" : locale === "zh" ? "Chinese" : "Korean";
  return `You are an academic validation expert focused on ${modeDesc}.
Respond in ${lang}.
Return ONLY a JSON array (no markdown fences) where each item has:
- "severity": one of "error", "warning", "success", "info"
- "title": short issue title (string, required)
- "desc": detailed explanation and recommendation (string, required)
- "score": optional number 0-100
Provide 4-8 concrete findings about the user's text.`;
}

export default function ValidationPage() {
  const { t, locale } = useTranslation();
  const [content, setContent] = useState("");
  const [aiResults, setAiResults] = useState<ValidationResultItem[]>([]);
  const [validationType, setValidationType] = useState("apa");
  const [errorMsg, setErrorMsg] = useState("");
  const { generate, loading } = useGemini();

  const getData = useCallback(
    (): ValidationDraft => ({ content, aiResults, validationType }),
    [content, aiResults, validationType]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as ValidationDraft;
    if (d.content !== undefined) setContent(d.content);
    if (d.aiResults) setAiResults(d.aiResults);
    if (d.validationType) setValidationType(d.validationType);
  }, []);

  const handleReset = useCallback(() => {
    setContent("");
    setAiResults([]);
    setValidationType("apa");
    setErrorMsg("");
  }, []);

  usePagePersistence("validation", handleLoad, handleReset);

  const VALIDATION_MODES = [
    { id: "apa", label: t("validation.modeApa"), desc: MODE_PROMPTS.apa },
    { id: "gap", label: t("validation.modeGap"), desc: MODE_PROMPTS.gap },
    { id: "effectsize", label: t("validation.modeEffect"), desc: MODE_PROMPTS.effectsize },
    { id: "logic", label: t("validation.modeLogic"), desc: MODE_PROMPTS.logic },
    { id: "structure", label: t("validation.modeStructure"), desc: MODE_PROMPTS.structure },
  ];

  const STATIC_RULES = useMemo(() => [
    { icon: "check", title: t("validation.rule1"), desc: t("validation.rule1d"), score: 88 },
    { icon: "check", title: t("validation.rule2"), desc: t("validation.rule2d"), score: 92 },
    { icon: "warn", title: t("validation.rule3"), desc: t("validation.rule3d"), score: 65 },
    { icon: "error", title: t("validation.rule4"), desc: t("validation.rule4d"), score: 0 },
    { icon: "error", title: t("validation.rule5"), desc: t("validation.rule5d"), score: 0 },
    { icon: "check", title: t("validation.rule6"), desc: t("validation.rule6d"), score: 78 },
  ], [t]);

  const iconMap: Record<string, string> = { check: "check", warn: "warn", error: "error" };

  const severityStyle = (severity: string) => {
    if (severity === "error") return "bg-[#ff7066]/5 border-[#ff7066]/20";
    if (severity === "warning") return "bg-[#e8b84b]/5 border-[#e8b84b]/20";
    if (severity === "success") return "bg-[#5ebd7c]/5 border-[#5ebd7c]/20";
    return "bg-[#6c8cff]/5 border-[#6c8cff]/20";
  };

  const runValidation = async () => {
    if (!content.trim()) return;
    const mode = VALIDATION_MODES.find((m) => m.id === validationType);
    setErrorMsg("");
    setAiResults([]);
    try {
      const result = await generate({
        systemInstruction: validationSystemPrompt(mode?.desc || "academic quality", locale),
        userText: content.slice(0, 12000),
        temperature: 0.3,
        maxOutputTokens: 8192,
      });
      if (!result.trim()) {
        setErrorMsg(t("validation.emptyResponse"));
        return;
      }
      const parsed = parseValidationResponse(result);
      if (parsed.length === 0) {
        setErrorMsg(t("validation.parseFailed"));
        setAiResults([{ severity: "info", title: "AI", desc: result }]);
        return;
      }
      setAiResults(parsed);
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message === "API_KEY_MISSING"
          ? t("validation.apiKeyMissing")
          : e instanceof Error
            ? e.message
            : "Failed";
      setErrorMsg(msg);
      setAiResults([{ severity: "error", title: t("validation.errorTitle"), desc: msg }]);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <PageSaveRegistration pageId="validation" getData={getData} />
      <div className="max-w-5xl mx-auto">
        <div className="mb-1">
          <h1 className="text-[20px] font-bold font-nanum-myeongjo"><Icon name="🛡" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("validation.title")}</h1>
        </div>
        <p className="text-[13px] text-white/35 mb-6">{t("validation.desc")}</p>

        {/* ─── 종합 검토 패널 (구 Review 페이지 기능 통합) ─── */}
        <div className="mb-8 p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[15px] font-semibold text-[#e8eaf0]"><Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />종합 논문 검토</span>
            <span className="text-[11px] text-white/30">AI 종합 품질 분석</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: "논리 구조", color: "#6c8cff", icon: "🔵" },
              { label: "방법론", color: "#3ecfb2", icon: "🟢" },
              { label: "인용 형식", color: "#a78bfa", icon: "🟣" },
              { label: "완성도", color: "#e8b84b", icon: "🟡" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-[10px] bg-[#1a1e2a] border border-white/[0.04] text-center">
                <span className="text-[20px]"><Icon name={item.icon} className="inline-flex align-[-0.125em]" size={15} /></span>
                <p className="text-[11px] text-white/40 mt-1">{item.label}</p>
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: item.color }}>AI 분석 대기</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/25">아래 AI 심층 검증을 실행하면 종합 검토 결과가 표시됩니다.</p>
        </div>


        <div className="mb-6">
          <h3 className="text-[13px] font-semibold mb-3">{t("validation.basicResults")}</h3>
          <div className="space-y-2">
            {STATIC_RULES.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                r.icon === "error" ? "bg-[#ff7066]/5" : r.icon === "warn" ? "bg-[#e8b84b]/5" : "bg-[#5ebd7c]/5"
              }`}>
                <span className="mt-0.5"><Icon name={iconMap[r.icon]} size={15} /></span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{r.title}</p>
                  <p className="text-[11px] text-white/35">{r.desc}</p>
                </div>
                {r.score > 0 && (
                  <span className={`text-[12px] font-bold ${r.score >= 80 ? "text-[#5ebd7c]" : r.score >= 60 ? "text-[#e8b84b]" : "text-[#ff7066]"}`}>
                    {r.score}{t("validation.points")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#13161e] border border-white/[0.04]">
          <h3 className="text-[14px] font-semibold mb-3">{t("validation.aiDeep")}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {VALIDATION_MODES.map((m) => (
              <button key={m.id} onClick={() => setValidationType(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                  validationType === m.id ? "bg-[#4a6cf7]/10 border-[#4a6cf7]/30 text-[#6c8cff]" : "border-white/[0.04] text-white/30"
                }`}>{m.label}</button>
            ))}
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            className="w-full h-40 px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white/80 leading-relaxed focus:border-[#6c8cff] focus:outline-none resize-none mb-3"
            placeholder={t("validation.placeholder")} />
          <button onClick={runValidation} disabled={loading || !content.trim()} className="px-6 py-2.5 bg-[#4a6cf7] text-white rounded-xl text-[13px] font-medium disabled:opacity-40">
            {loading ? t("validation.running") : t("validation.run")}
          </button>

          {loading && (
            <div className="mt-4 p-4 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white/40">
              {t("validation.running")}
            </div>
          )}

          {errorMsg && !loading && (
            <p className="mt-3 text-[12px] text-[#ff7066]/90">{errorMsg}</p>
          )}

          {!loading && aiResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {aiResults.map((r, i) => (
                <div key={i} className={`p-3 rounded-xl border ${severityStyle(r.severity)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-white/90">{r.title}</p>
                    {r.score !== undefined && Number.isFinite(r.score) && (
                      <span className="text-[11px] font-bold text-[#6c8cff] shrink-0">{r.score}{t("validation.points")}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/60 mt-1 leading-relaxed whitespace-pre-wrap">{r.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
