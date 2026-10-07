"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import CorpusModeToggle from "@/components/literature/corpus-mode-toggle";
import LlbLoadStatus from "@/components/literature/llb-load-status";
import { LLB_NAV } from "@/lib/literature/llb-nav";

export default function LlbLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row font-nanum-gothic min-h-[70vh]">
      {/* Left nav */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/[0.04] bg-[#0d0f14] flex-shrink-0">
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-[17px] font-semibold text-white flex items-center gap-1.5">
              <Icon name="🔬" size={15} className="inline-flex" />
              문헌연구엔진
            </h1>
            <CorpusModeToggle mode="llb" l1Href="/literature-review" llbHref="/llb/search" size="sm" />
          </div>
          <p className="text-[13px] text-[#e8b84b]/80 font-medium">LLB · 로컬문헌기반</p>
          <p className="text-[12px] text-white/25 mt-1">Scholar Stack (F·L·K)</p>
        </div>

        <div className="pt-3">
          <LlbLoadStatus />
        </div>

        <nav className="p-2 space-y-0.5">
          {LLB_NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
                  active
                    ? "bg-[#e8b84b]/12 text-[#e8b84b] border border-[#e8b84b]/25"
                    : "text-white/45 hover:text-white/70 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <Icon name={item.icon} size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="block text-[15px] font-medium">{item.label}</span>
                  <span className="block text-[12px] text-white/25 mt-0.5 leading-snug">{item.desc}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-2 border-t border-white/[0.04] space-y-2">
          <Link href="/literature" className="block text-center text-[13px] text-white/30 hover:text-[#3ecfb2] py-2">
            ← 문헌검색으로
          </Link>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
