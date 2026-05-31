"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useCallback } from "react";
import { ADVISORS } from "@/lib/research-data";
import { useGemini } from "@/hooks/use-gemini";
import { useTranslation } from "@/lib/i18n";
import { advisorSystemPrompt, apiKeyMissingMessage, genericErrorMessage } from "@/lib/i18n/ai-prompts";
import PageSaveRegistration from "@/components/save/page-save-bar";
import { usePagePersistence } from "@/hooks/use-page-persistence";

interface AdvisorDraft {
  selected: number;
  input: string;
  feedback: string;
}

export default function AdvisorPage() {
  const { t, locale } = useTranslation();
  const [selected, setSelected] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const { generate, loading } = useGemini();

  const getData = useCallback(
    (): AdvisorDraft => ({ selected, input, feedback }),
    [selected, input, feedback]
  );

  const handleLoad = useCallback((data: unknown) => {
    const d = data as AdvisorDraft;
    if (d.selected !== undefined) setSelected(d.selected);
    if (d.input !== undefined) setInput(d.input);
    if (d.feedback !== undefined) setFeedback(d.feedback);
  }, []);

  const handleReset = useCallback(() => {
    setSelected(0);
    setInput("");
    setFeedback("");
  }, []);

  usePagePersistence("advisor", handleLoad, handleReset);

  const advisor = ADVISORS[selected];

  const getFeedback = async (section: string) => {
    const prompt = section === "custom" ? input : `논문의 ${section} 부분에 대해 피드백해주세요.`;
    if (!prompt.trim()) return;
    try {
      const result = await generate({
        systemInstruction: advisorSystemPrompt(locale, advisor),
        userText: prompt,
        temperature: 0.7,
      });
      setFeedback(result);
    } catch (e: any) {
      setFeedback(
        e.message === "API_KEY_MISSING" ? apiKeyMissingMessage(locale) : genericErrorMessage(locale)
      );
    }
  };

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic">
      <PageSaveRegistration pageId="advisor" getData={getData} />
      {/* v30: 모바일 멘토 선택기 (스타일링된 카드 + 커스텀 드롭다운) */}
      <div className="md:hidden px-3 py-3 border-b border-white/[0.04] bg-[#0d0f14]">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.14em] mb-2">AI 멘토링 선택</p>
        <div className="relative">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] bg-[#1a1e2a] border border-white/[0.08]">
            <span className="w-8 h-8 rounded-[10px] bg-[#a78bfa]/12 flex items-center justify-center text-[#a78bfa] flex-shrink-0">
              <Icon name={advisor.emoji} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white/85 truncate">{advisor.name}</p>
              <p className="text-[11px] text-white/30 truncate">{advisor.type}</p>
            </div>
            <span className="text-white/30 flex-shrink-0"><Icon name="chevronDown" size={15} /></span>
          </div>
          <select
            value={selected}
            onChange={(e) => { setSelected(Number(e.target.value)); setFeedback(""); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="AI 멘토 선택"
          >
            {ADVISORS.map((a, i) => (
              <option key={i} value={i}>{a.name} — {a.type}</option>
            ))}
          </select>
        </div>
        {/* 선택된 멘토의 특성 태그 */}
        <div className="flex flex-wrap gap-1 mt-2">
          {advisor.traits.map((tr, ti) => (
            <span key={ti} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-white/35">{tr}</span>
          ))}
        </div>
      </div>
      <div className="hidden md:flex w-80 border-r border-white/[0.04] bg-[#0d0f14] flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/[0.04] flex-shrink-0">
          <h2 className="text-[14px] font-semibold">AI 멘토링 선택</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {ADVISORS.map((a, i) => (
            <button
              key={i}
              onClick={() => { setSelected(i); setFeedback(""); }}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                selected === i ? "bg-white/[0.06] border border-white/10" : "hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex"><Icon name={a.emoji} size={18} /></span>
                <div>
                  <p className="text-[13px] font-semibold">{a.name}</p>
                  <p className="text-[10px] text-white/25">{a.type}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {a.traits.map((tr, ti) => (
                  <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">{tr}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.04] flex-shrink-0">
          <p className="text-[11px] text-white/20 mb-2">프리셋 피드백</p>
          {advisor.feedbacks.map((f, fi) => (
            <div key={fi} className={`p-2.5 mb-2 rounded-lg text-[11px] leading-relaxed ${
              f.type === "critical" ? "bg-[#ff7066]/10 text-[#ff7066]" :
              f.type === "warning" ? "bg-[#e8b84b]/10 text-[#e8b84b]" :
              "bg-[#5ebd7c]/10 text-[#5ebd7c]"
            }`}>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-white/[0.04] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex"><Icon name={advisor.emoji} size={22} /></span>
            <div>
              <h2 className="text-[16px] font-semibold">{advisor.name}</h2>
              <p className="text-[12px] text-white/30">{advisor.type}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {["서론", "방법론", "결과", "전체"].map((s) => (
              <button key={s} onClick={() => getFeedback(s)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50 hover:text-white/80 disabled:opacity-40 whitespace-nowrap">
                {s} 피드백
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-4 md:p-6">
          {feedback ? (
            <div className="text-[13px] text-white/70 leading-[1.8] whitespace-pre-wrap">{feedback}</div>
          ) : (
            <div className="text-center py-20 text-white/15">
              <p className="mb-2 flex justify-center"><Icon name={advisor.emoji} size={26} /></p>
              <p className="text-[13px]">위의 버튼을 클릭하거나</p>
              <p className="text-[13px]">아래에 직접 질문하세요</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/[0.04] flex-shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && getFeedback("custom")}
              className="flex-1 px-4 py-3 rounded-xl bg-[#1a1e2a] border border-white/[0.06] text-[13px] text-white focus:border-[#6c8cff] focus:outline-none"
              placeholder="ai멘토에게 직접 질문하세요..."
              disabled={loading}
            />
            <button onClick={() => getFeedback("custom")} disabled={loading} className="px-5 py-3 bg-[#4a6cf7] text-white rounded-xl text-[13px] font-medium disabled:opacity-40">
              {loading ? "..." : "전송"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
