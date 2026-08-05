"use client";

/* ════════════════════════════════════════════════════════════
   v31: 논문 작성 페이지용 참고문헌 인용 삽입 패널
   - 전역 refDB(참고문헌 리스트)를 보여주고
   - 항목 클릭 시 본문 내 인용(in-text)을 에디터 커서 위치에 삽입
   - 작성 중 바로 인용을 넣을 수 있게 함
═══════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useCitation } from "@/components/citation/citation-context";
import type { RefEntry } from "@/lib/citation/apa-utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 본문 내 인용 문자열을 에디터에 삽입 */
  onInsertInText: (text: string) => void;
}

export default function CitationInsertPanel({ open, onClose, onInsertInText }: Props) {
  const { refDB, formatInText, formatRef, citationStyle, styles } = useCitation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return refDB;
    return refDB.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.authors?.some((a) => (a.full || a.last || "").toLowerCase().includes(q)) ||
        r.year?.includes(q)
    );
  }, [refDB, query]);

  if (!open) return null;

  const styleName = styles.find((s) => s.id === citationStyle)?.name ?? citationStyle;

  return (
    <div className="fixed inset-0 z-[8500] flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" />
      <div
        className="relative w-full sm:max-w-md bg-[#13161e] border-t sm:border border-white/[0.08] sm:rounded-[18px] rounded-t-[20px] shadow-2xl animate-slide-up max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-white/85 flex items-center gap-1.5">
              <Icon name="citation" size={15} /> 참고문헌 인용
            </p>
            <button onClick={onClose} className="text-white/30 hover:text-white/60">
              <Icon name="x" size={16} />
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-0.5">
            인용할 항목을 누르면 본문에 ({styleName}) 형식으로 삽입됩니다.
          </p>
        </div>

        {/* 검색 */}
        <div className="px-4 py-2 flex-shrink-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·저자·연도로 검색"
            className="w-full px-3 py-2 rounded-lg bg-[#1a1e2a] border border-white/[0.06] text-[12px] text-white/80 placeholder:text-white/20 focus:border-[#6c8cff] focus:outline-none"
          />
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
          {refDB.length === 0 ? (
            <div className="text-center py-10 text-white/20">
              <Icon name="library" size={28} />
              <p className="text-[12px] mt-2">참고문헌 리스트가 비어 있습니다</p>
              <a href="/references" className="text-[11px] text-[#6c8cff] hover:underline mt-1 inline-block">
                참고문헌 정리에서 추가하기 →
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-[12px] text-white/20">검색 결과가 없습니다</p>
          ) : (
            filtered.map((r: RefEntry) => (
              <button
                key={r.id}
                onClick={() => {
                  onInsertInText(formatInText(r));
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl bg-[#1a1e2a]/60 hover:bg-[#1a1e2a] border border-white/[0.04] hover:border-[#6c8cff]/30 transition-all group"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-[#6c8cff] opacity-50 group-hover:opacity-100 flex-shrink-0">
                    <Icon name="plus" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-white/80 leading-snug line-clamp-2">{formatRef(r)}</p>
                    <p className="text-[10px] text-[#a78bfa] mt-1">
                      본문 인용: {formatInText(r)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
