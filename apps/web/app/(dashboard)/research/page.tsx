"use client";
import { Icon } from "@/components/ui/icon";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useGemini } from "@/hooks/use-gemini";

/* ─────────────────────────────────────────────
   v25: Research 페이지 개선 (Issue 1/5)
   - 6개 섹션이 모두 동일한 AI 채팅으로 연결되던 "빈 껍데기" 문제 해결
   - 각 섹션마다 고유한 AI 시스템 프롬프트 / 작업 동작 / 입력 UI 부여
   - topic: 학술 검색(트렌드) / 그 외: 섹션 특화 AI 생성
───────────────────────────────────────────── */

interface SectionDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  /** 섹션 특화 AI 시스템 프롬프트 */
  system: string;
  /** 캔버스 입력창 플레이스홀더 */
  placeholder: string;
  /** 주요 동작 버튼 라벨 */
  action: string;
  /** topic 섹션만 학술 검색을 사용 */
  mode: "search" | "generate";
}

const RESEARCH_SECTIONS: SectionDef[] = [
  {
    id: "topic", icon: "🎯", title: "주제 탐색", desc: "키워드 트렌드 분석, AI 주제 추천, 연구 갭 탐색", color: "#6c8cff",
    system: "You are a research topic exploration expert. Suggest trending sub-topics, research gaps, and promising angles. Reply in Korean with a concise bulleted structure.",
    placeholder: "관심 분야나 키워드를 입력하세요 (예: 생성형 AI 교육 활용)",
    action: "학술 트렌드 검색", mode: "search",
  },
  {
    id: "rq", icon: "❓", title: "연구 질문", desc: "RQ 생성·정제, 가능성 평가, 연구 신뢰도 분석", color: "#3ecfb2",
    system: "You are a research question design expert. Generate 3-5 well-formed research questions (RQ) from the user's topic, each with a one-line rationale and feasibility note. Reply in Korean.",
    placeholder: "연구 주제를 입력하면 연구 질문(RQ)을 생성합니다",
    action: "연구 질문 생성", mode: "generate",
  },
  {
    id: "concept", icon: "🧠", title: "개념 매핑", desc: "개념 연결, 이론 프레임워크, 핵심 구조화", color: "#a78bfa",
    system: "You are a conceptual framework expert. From the user's topic, identify key concepts, their relationships, and a candidate theoretical framework. Present as a structured concept map outline in Korean.",
    placeholder: "주제나 연구 질문을 입력하면 개념 지도를 구성합니다",
    action: "개념 지도 생성", mode: "generate",
  },
  {
    id: "method", icon: "📐", title: "방법론 설계", desc: "양적/질적/혼합/실험 설계 위자드, 표본 계획", color: "#f59e0b",
    system: "You are a research methodology design expert. Recommend a suitable research design (quantitative/qualitative/mixed), sampling plan, data collection, and analysis methods. Reply in Korean with clear sections.",
    placeholder: "연구 질문과 맥락을 입력하면 방법론을 설계합니다",
    action: "방법론 설계", mode: "generate",
  },
  {
    id: "roadmap", icon: "🗺️", title: "연구 로드맵", desc: "타임라인, 마일스톤, 일정 관리", color: "#e8b84b",
    system: "You are a research project planner. Produce a phased timeline with milestones and estimated durations for the user's research. Reply in Korean as an ordered roadmap.",
    placeholder: "연구 주제와 기간(예: 6개월)을 입력하면 로드맵을 만듭니다",
    action: "로드맵 생성", mode: "generate",
  },
  {
    id: "memory", icon: "💡", title: "연구 기억", desc: "아이디어 진화 로그, 핵심 개념 데이터베이스", color: "#ec4899",
    system: "You are a research idea curator. Help the user refine, connect, and log their evolving research ideas. Summarize and suggest next directions in Korean.",
    placeholder: "떠오른 아이디어나 메모를 입력하면 정리·발전시킵니다",
    action: "아이디어 정리", mode: "generate",
  },
];

export default function ResearchPage() {
  const [active, setActive] = useState("topic");
  const [query, setQuery] = useState("");
  const [canvasOutput, setCanvasOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotOutput, setCopilotOutput] = useState("");
  const { generate, loading } = useGemini();

  const section = useMemo(
    () => RESEARCH_SECTIONS.find((s) => s.id === active) ?? RESEARCH_SECTIONS[0],
    [active]
  );

  // 섹션 전환 시 캔버스 초기화
  const selectSection = (id: string) => {
    setActive(id);
    setCanvasOutput("");
    setQuery("");
  };

  // 섹션 특화 주요 동작
  const runSectionAction = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      if (section.mode === "search") {
        const res = await fetch(`/api/scholar?q=${encodeURIComponent(query)}&region=international&limit=8`);
        const data = await res.json();
        const lines = (data?.results || [])
          .slice(0, 8)
          .map((r: { title?: string; year?: number }, i: number) => `${i + 1}. ${r.title} (${r.year || "N/A"})`);
        const trend = lines.length ? `📊 "${query}" 관련 최근 논문:\n\n${lines.join("\n")}` : "검색 결과가 없습니다.";
        // 검색 결과를 바탕으로 AI 주제 제안도 덧붙임
        const suggest = await generate({
          systemInstruction: section.system,
          userText: `키워드: ${query}\n\n위 키워드에 대한 유망한 세부 주제, 연구 갭, 접근 각도를 제안해줘.`,
          temperature: 0.6,
        });
        setCanvasOutput(`${trend}\n\n──────────\n💡 AI 주제 제안:\n\n${suggest}`);
      } else {
        const out = await generate({
          systemInstruction: section.system,
          userText: query,
          temperature: 0.5,
          maxOutputTokens: 4096,
        });
        setCanvasOutput(out);
      }
    } catch {
      setCanvasOutput("처리 중 오류가 발생했습니다. 다시 시도하세요.");
    } finally {
      setBusy(false);
    }
  };

  const askCopilot = async () => {
    if (!copilotInput.trim()) return;
    const out = await generate({
      systemInstruction: `You are an expert research design copilot focused on "${section.title}". Reply in Korean with actionable steps.`,
      userText: copilotInput,
      temperature: 0.5,
    });
    setCopilotOutput(out);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <div className="max-w-5xl mx-auto">
        <p className="text-[11px] text-white/20 font-mono mb-1">Research — AI Research OS</p>
        <h1 className="font-nanum-myeongjo text-[22px] font-bold text-[#e8eaf0] mb-1">연구 설계</h1>
        <p className="text-[13px] text-white/35 mb-6">주제 탐색부터 방법론 설계까지 — 연구의 기초를 잡으세요</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {RESEARCH_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className="p-4 rounded-[14px] border text-left transition-all bg-[#13161e]"
              style={{
                borderColor: active === s.id ? s.color + "55" : "rgba(255,255,255,0.04)",
                boxShadow: active === s.id ? `0 0 0 1px ${s.color}30` : "none",
              }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span style={{ color: s.color }}><Icon name={s.icon} size={18} /></span>
                <span className="text-[14px] font-semibold text-[#e8eaf0]">{s.title}</span>
              </div>
              <p className="text-[12px] text-white/35 leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>

        {/* 연구 캔버스 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="p-6 rounded-[16px] bg-[#13161e] border border-white/[0.04] min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: section.color }}><Icon name={section.icon} size={16} /></span>
              <p className="text-[13px] font-semibold text-[#e8eaf0]">{section.title} 캔버스</p>
            </div>
            <div className="mb-4 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSectionAction()}
                className="flex-1 px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#6c8cff]"
                placeholder={section.placeholder}
              />
              <button
                onClick={runSectionAction}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-40 whitespace-nowrap"
                style={{ backgroundColor: section.color }}
              >
                {busy ? "처리 중..." : section.action}
              </button>
            </div>
            <div className="h-[280px] overflow-y-auto rounded-xl border border-white/[0.04] bg-[#0f1117] p-4 text-[12px] text-white/55 whitespace-pre-wrap leading-[1.7]">
              {canvasOutput || `${section.desc}\n\n위 입력창에 내용을 입력하고 "${section.action}"을 실행하세요.`}
            </div>
          </div>

          {/* AI Copilot 패널 */}
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[13px] font-semibold text-[#6c8cff] mb-3 flex items-center gap-1.5"><Icon name="engine" size={15} />AI Research Copilot</p>
            <div className="space-y-3 text-[12px] text-white/40 mb-4">
              <p>현재 <span style={{ color: section.color }}>{section.title}</span> 작업을 돕습니다.</p>
            </div>
            <input
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askCopilot()}
              className="w-full px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#6c8cff]"
              placeholder={`${section.title}에 대해 질문하세요...`}
            />
            <button onClick={askCopilot} disabled={loading} className="w-full mt-2 py-2 rounded-lg bg-[#6c8cff]/20 text-[#6c8cff] text-[12px] disabled:opacity-40">{loading ? "..." : "AI 분석"}</button>
            {copilotOutput && <div className="mt-3 text-[12px] text-white/60 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{copilotOutput}</div>}
            <div className="mt-3 space-y-2">
              <Link href="/chat" className="block text-[11px] text-[#6c8cff] hover:underline">→ AI 채팅에서 더 자세히</Link>
              <Link href="/structure" className="block text-[11px] text-[#6c8cff] hover:underline">→ 구조 엔진으로 이동</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
