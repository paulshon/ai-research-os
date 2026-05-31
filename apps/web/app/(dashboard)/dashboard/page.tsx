"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** 연구 진행률 기본값 (Research Progress Graph) */
const DEFAULT_PROGRESS = [
  { key: "topic", labelKey: "dashboard.progressTopic", pct: 0, color: "#6c8cff" },
  { key: "lit", labelKey: "dashboard.progressLit", pct: 0, color: "#3ecfb2" },
  { key: "method", labelKey: "dashboard.progressMethod", pct: 0, color: "#a78bfa" },
  { key: "writing", labelKey: "dashboard.progressWriting", pct: 0, color: "#e8b84b" },
  { key: "review", labelKey: "dashboard.progressReview", pct: 0, color: "#ff7066" },
];

const QUICK_ACTIONS = [
  { href: "/writing", icon: "✍", label: "dashboard.continueWriting", color: "#a78bfa" },
  { href: "/review", icon: "🛡", label: "dashboard.runValidation", color: "#ff7066" },
  { href: "/literature", icon: "📚", label: "dashboard.exploreLitGaps", color: "#3ecfb2" },
];

const DEFAULT_AI_INSIGHTS = [
  "방법론 섹션 보강을 추천합니다 — 표본 크기 타당성 근거가 부족합니다.",
  "최근 3개월 내 관련 신규 논문 5편이 발견되었습니다.",
  "연구 질문 RQ2의 조작적 정의를 구체화하세요.",
];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [userName, setUserName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectProgress, setProjectProgress] = useState(DEFAULT_PROGRESS);
  const [hasProject, setHasProject] = useState(false);

  useEffect(() => {
    if (hasClerk) {
      const timers = [300, 800, 1500].map((d) =>
        setTimeout(() => {
          const el = document.querySelector<HTMLElement>(".cl-userPreviewMainIdentifier");
          if (el?.textContent) { setUserName(el.textContent); localStorage.setItem("user-display-name", el.textContent); }
        }, d)
      );
      return () => timers.forEach(clearTimeout);
    }
    const stored = localStorage.getItem("user-display-name");
    if (stored) setUserName(stored);
  }, []);

  // Load project data from localStorage
  useEffect(() => {
    const name = localStorage.getItem("aros-project-name") || "";
    setProjectName(name);
    setHasProject(!!name);

    // Load progress from localStorage if available
    const savedProgress = localStorage.getItem("aros-dashboard-progress");
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProjectProgress(parsed);
      } catch { /* use default */ }
    }

    const handler = () => {
      const n = localStorage.getItem("aros-project-name") || "";
      setProjectName(n);
      setHasProject(!!n);
      const sp = localStorage.getItem("aros-dashboard-progress");
      if (sp) { try { setProjectProgress(JSON.parse(sp)); } catch {} }
    };
    window.addEventListener("aros:project-loaded", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("aros:project-loaded", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const displayName = userName;
  const overallProgress = Math.round(projectProgress.reduce((a, p) => a + p.pct, 0) / projectProgress.length);
  const displayProjectName = projectName || "미정";

  return (
    <div className="p-4 md:p-6 lg:p-8 font-nanum-gothic">
      <div className="max-w-[1000px] mx-auto">
        {/* 헤더 */}
        <div className="mb-7">
          <p className="text-[11px] text-white/20 font-mono mb-1">Dashboard — AI Research OS v21</p>
          <h1 className="font-nanum-myeongjo text-[24px] font-bold text-[#e8eaf0]">
            {displayName ? `${t("dashboard.greetingPrefix")}${displayName}` : "지식 탐구의 길에 오신 것을 환영합니다"}
          </h1>
          <p className="text-[13px] text-white/35 mt-1.5">{t("dashboard.subtitle")}</p>
        </div>

        {/* 현재 프로젝트 + 전체 진행률 */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-semibold text-[#e8eaf0]">{displayProjectName}</p>
              <p className="text-[11px] text-white/25 mt-0.5">
                {hasProject ? "양적 연구 · Deadline: 12일 후" : "프로젝트를 시작하면 연동이 됩니다"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[28px] font-bold text-[#6c8cff]">{overallProgress}%</p>
              <p className="text-[10px] text-white/25">전체 진행률</p>
            </div>
          </div>

          {/* Research Progress Graph */}
          <div className="space-y-2.5">
            {projectProgress.map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                <span className="text-[12px] text-white/40 w-16 text-right flex-shrink-0">{t(p.labelKey)}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.pct}%`, background: p.color }}
                  />
                </div>
                <span className="text-[11px] font-semibold w-10 text-right" style={{ color: p.color }}>{p.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-6">
          {/* 빠른 행동 */}
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[13px] font-semibold text-[#e8eaf0] mb-4">빠른 시작</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="p-4 rounded-[12px] bg-[#1a1e2a] border border-white/[0.04] hover:border-white/[0.08] transition-all text-center"
                >
                  <span className="text-[24px]"><Icon name={a.icon} className="inline-flex align-[-0.125em]" size={15} /></span>
                  <p className="text-[12px] text-white/50 mt-2">{t(a.label)}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* AI 인사이트 */}
          <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
            <p className="text-[13px] font-semibold text-[#6c8cff] mb-3"><Icon name="🤖" className="inline-flex align-[-0.125em] mr-1" size={15} />{t("dashboard.todayInsights")}</p>
            <div className="space-y-2.5">
              {DEFAULT_AI_INSIGHTS.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-white/45 leading-relaxed">
                  <span className="text-[#6c8cff] mt-0.5 flex-shrink-0">→</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 연구 흐름 내비게이션 */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
          <p className="text-[13px] font-semibold text-[#e8eaf0] mb-4">연구 흐름</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/research", icon: "🔬", label: "연구 설계", color: "#6c8cff" },
              { href: "/literature", icon: "📚", label: "문헌 연구", color: "#3ecfb2" },
              { href: "/writing", icon: "✍", label: "논문 집필", color: "#a78bfa" },
              { href: "/review", icon: "🛡", label: "검토·검증", color: "#ff7066" },
              { href: "/submission", icon: "📤", label: "제출 준비", color: "#e8b84b" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] bg-[#1a1e2a] transition-all"
              >
                <span className="text-[16px]"><Icon name={item.icon} className="inline-flex align-[-0.125em]" size={15} /></span>
                <span className="text-[12px] text-white/60">{item.label}</span>
                <span className="text-[10px]" style={{ color: item.color }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
