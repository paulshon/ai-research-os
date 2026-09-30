"use client";

import Link from "next/link";

export type CorpusMode = "l1" | "llb";

interface Props {
  mode: CorpusMode;
  onChange?: (mode: CorpusMode) => void;
  /** If set, LLB click navigates instead of onChange */
  llbHref?: string;
  /** If set, L1 click navigates instead of onChange */
  l1Href?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * L1 = 현재 클라우드/공개 API 문헌검색 (기존)
 * LLB = 로컬문헌기반 (F Corpus Vault / L Index Hub / K Fulltext Store)
 */
export default function CorpusModeToggle({
  mode,
  onChange,
  llbHref,
  l1Href,
  size = "md",
  className = "",
}: Props) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[13px]" : "px-3.5 py-1.5 text-[15px]";

  const l1Class = `${pad} rounded-lg font-medium transition-all ${
    mode === "l1"
      ? "bg-[#3ecfb2]/20 text-[#3ecfb2] border border-[#3ecfb2]/40 shadow-[0_0_12px_rgba(62,207,178,0.15)]"
      : "text-white/35 border border-transparent hover:text-white/55 hover:bg-white/[0.03]"
  }`;
  const llbClass = `${pad} rounded-lg font-medium transition-all ${
    mode === "llb"
      ? "bg-[#e8b84b]/20 text-[#e8b84b] border border-[#e8b84b]/40 shadow-[0_0_12px_rgba(232,184,75,0.15)]"
      : "text-white/35 border border-transparent hover:text-white/55 hover:bg-white/[0.03]"
  }`;

  return (
    <div
      className={`inline-flex items-center gap-1 p-0.5 rounded-xl bg-[#0d0f14]/80 border border-white/[0.06] ${className}`}
      role="group"
      aria-label="문헌 코퍼스 모드"
    >
      {l1Href ? (
        <Link href={l1Href} className={l1Class} title="L1 Scholar — 공개 API 문헌검색 (기존)">
          L1
        </Link>
      ) : (
        <button type="button" onClick={() => onChange?.("l1")} className={l1Class} title="L1 Scholar — 공개 API 문헌검색 (기존)">
          L1
        </button>
      )}
      {llbHref ? (
        <Link href={llbHref} className={llbClass} title="LLB — 로컬문헌기반 (F·L·K Scholar Stack)">
          LLB
        </Link>
      ) : (
        <button type="button" onClick={() => onChange?.("llb")} className={llbClass} title="LLB — 로컬문헌기반 (F·L·K Scholar Stack)">
          LLB
        </button>
      )}
    </div>
  );
}
