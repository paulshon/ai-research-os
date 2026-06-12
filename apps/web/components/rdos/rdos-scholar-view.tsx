"use client";

import Link from "next/link";
import type { RdosLearnerState } from "@ai-research-os/rdos-core";

/* ════════════════════════════════════════════════════════════
   RDOS 졸업 시스템 — Research-Ready Scholar(연구 준비자) 인증 (v4)
   첫 번째 문서의 7단계(7-1~7-7)를 학습 상태에서 도출한다.
     · 5개 인증(지식/사고/연구/작성/심사) 점수 = 역량·미션에서 산출
     · 포트폴리오 = 4개 인증 통과 시 생성 가능
     · Scholar Passport = 5개 인증 통과 시 '연구 준비자' 인증
═══════════════════════════════════════════════════════════════ */

type Cert = {
  id: string; title: string; en: string; color: string;
  score: number; pass: boolean; threshold: number; basis: string;
};

function comp(data: RdosLearnerState, key: string): number {
  return Math.round(data.competency.find((c) => c.key === key)?.score ?? 0);
}

export default function RdosScholarView({ data }: { data: RdosLearnerState }) {
  const knowledgeScore = Math.round((comp(data, "researchLiteracy") + comp(data, "academicLiteracy")) / 2);
  const thinkingScore = comp(data, "thinkingLiteracy");
  const researchScore = comp(data, "methodLiteracy");
  const writingScore = comp(data, "writingLiteracy");
  const defenseScore = data.summary.overallPct; // 디펜스 미션 도입 전까지 전체 진행을 프록시로

  const certs: Cert[] = [
    { id: "7-1", title: "지식 인증", en: "Knowledge Certification", color: "#3ecfb2", score: knowledgeScore, threshold: 60, pass: knowledgeScore >= 60, basis: "연구 리터러시 · 학술 리터러시 평균" },
    { id: "7-2", title: "사고 인증", en: "Thinking Certification", color: "#a78bfa", score: thinkingScore, threshold: 60, pass: thinkingScore >= 60, basis: "사고 리터러시(논문 읽기·비판)" },
    { id: "7-3", title: "연구 인증", en: "Research Certification", color: "#e8b84b", score: researchScore, threshold: 60, pass: researchScore >= 60, basis: "방법 리터러시(설계·방법론)" },
    { id: "7-4", title: "작성 인증", en: "Writing Certification", color: "#7c93ff", score: writingScore, threshold: 60, pass: writingScore >= 60, basis: "글쓰기 리터러시(APA·문단)" },
    { id: "7-5", title: "심사 인증", en: "Defense Certification", color: "#f472b6", score: defenseScore, threshold: 80, pass: defenseScore >= 80, basis: "전체 학습 진행(디펜스 대응력)" },
  ];

  const passed = certs.filter((c) => c.pass).length;
  const portfolioReady = passed >= 4;
  const scholarReady = passed === certs.length;
  // 연구 준비도 지수: 인증 점수 가중 평균(심사 인증 가중 ↑)
  const weights = [1, 1, 1, 1, 1.2];
  const readiness = Math.round(
    certs.reduce((a, c, i) => a + Math.min(c.score, 100) * weights[i], 0) /
      weights.reduce((a, w) => a + w, 0)
  );

  return (
    <div>
      <Link href="/rdos" className="text-[12px] text-white/40 hover:text-white/80 transition">← Dashboard</Link>

      <div className="flex items-start gap-3 mt-4 mb-2">
        <span className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center text-[20px] flex-shrink-0 bg-[#ff7a00]/15 text-[#ff7a00]">🎓</span>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight">Research-Ready Scholar</h1>
          <p className="text-[12px] text-white/40 font-mono">연구 준비자 인증 · 졸업 시스템 (L9)</p>
        </div>
      </div>
      <p className="text-[13.5px] text-white/55 leading-relaxed max-w-[680px] mb-7">
        게임의 엔딩이 아니라 <span className="text-white/80">독립 연구의 시작점</span>입니다. 다섯 개 인증을 모두 통과하면
        연구용어를 이해하고, 연구문제를 찾고, 문헌을 정리하고, 연구를 설계하고, 초안을 쓰고, 심사에 대응할 준비가 된
        <span className="text-[#ff7a00]"> 연구 준비자</span>로 인증됩니다.
      </p>

      {/* Scholar Passport 요약 */}
      <div className="p-6 rounded-[16px] border mb-8" style={{ background: scholarReady ? "linear-gradient(135deg,#1a1206,#0d0f14)" : "#0e1118", borderColor: scholarReady ? "#ff7a0055" : "rgba(255,255,255,0.07)" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono text-white/45 mb-1">SCHOLAR PASSPORT · Readiness Index</p>
            <div className="flex items-end gap-3">
              <span className="text-[44px] font-bold leading-none" style={{ color: scholarReady ? "#ff9a3c" : "#e8eaf0" }}>{readiness}</span>
              <span className="text-[14px] text-white/40 mb-1.5">/ 100</span>
            </div>
            <p className="text-[12.5px] mt-2" style={{ color: scholarReady ? "#ffb061" : "rgba(255,255,255,0.5)" }}>
              {scholarReady ? "✓ Research-Ready Scholar — 연구 준비자 인증 완료" : `현재 레벨 ${data.level.code} · ${data.level.ko} · 인증 ${passed}/${certs.length} 통과`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-mono text-white/40 mb-1">누적 XP</p>
            <p className="text-[22px] font-bold text-[#ff7a00]">{data.xp}</p>
          </div>
        </div>
        <div className="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden mt-4">
          <div className="h-full rounded-full transition-all" style={{ width: readiness + "%", background: scholarReady ? "#ff7a00" : "#7c93ff" }} />
        </div>
      </div>

      {/* 5개 인증 */}
      <h2 className="text-[14px] font-bold text-white/80 mb-3">인증 항목 (Certification)</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {certs.map((c) => (
          <div key={c.id} className="p-4 rounded-[13px] border" style={{ background: "#10131a", borderColor: c.pass ? c.color + "44" : "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-white/40">{c.id}</span>
              <span className="text-[13.5px] font-bold text-white/85">{c.title}</span>
              <span className="ml-auto text-[11px] font-mono" style={{ color: c.pass ? c.color : "rgba(255,255,255,0.35)" }}>
                {c.pass ? "✓ 통과" : `${c.threshold}점 필요`}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mb-2">{c.en} · {c.basis}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: Math.min(c.score, 100) + "%", background: c.color }} />
              </div>
              <span className="text-[12px] font-bold w-9 text-right" style={{ color: c.color }}>{Math.min(c.score, 100)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 포트폴리오 + 산출물 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="p-5 rounded-[14px] bg-[#0e1118] border border-white/[0.06]">
          <p className="text-[13px] font-bold text-white/80 mb-1">7-6 · Research Portfolio</p>
          <p className="text-[12px] text-white/50 leading-relaxed mb-2">완료 퀘스트·학습 개념·연구설계·작성 샘플을 묶은 연구준비 포트폴리오(PDF).</p>
          <span className="text-[11.5px] font-mono" style={{ color: portfolioReady ? "#3ecfb2" : "rgba(255,255,255,0.35)" }}>
            {portfolioReady ? "✓ 생성 가능 (인증 4개 이상 통과)" : "인증 4개 통과 시 생성 가능"}
          </span>
        </div>
        <div className="p-5 rounded-[14px] bg-[#0e1118] border border-white/[0.06]">
          <p className="text-[13px] font-bold text-white/80 mb-1">7-7 · Scholar Passport</p>
          <p className="text-[12px] text-white/50 leading-relaxed mb-2">신원·레벨·인증 점수·배지·연구 준비도 지수를 담은 최종 산출물.</p>
          <span className="text-[11.5px] font-mono" style={{ color: scholarReady ? "#ff7a00" : "rgba(255,255,255,0.35)" }}>
            {scholarReady ? "✓ 발급 완료 — 연구 준비자" : "5개 인증 모두 통과 시 발급"}
          </span>
        </div>
      </div>

      {data.badges.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {data.badges.map((b) => (
            <span key={b} className="px-2.5 py-1 rounded-full text-[11px] bg-[#ff7a00]/12 text-[#ff7a00] border border-[#ff7a00]/20">🏅 {b}</span>
          ))}
        </div>
      )}
    </div>
  );
}
