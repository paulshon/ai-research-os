"use client";
import { Icon } from "@/components/ui/icon";

/**
 * DocumentReproduction — UODE 추출 결과(blocks)를 원문 형식 그대로
 * 재현하는 "문서 페이지" 렌더러.
 *
 * PDF가 페이지 이미지로 원문을 보여주듯, PDF 외 포맷(DOCX/XLSX/PPTX/HWP 등)도
 * 동일하게 "원문 레이아웃을 재현한" 페이지로 보여준다.
 *   - heading: 위계(level)에 따른 크기/굵기
 *   - paragraph: 문단 간격
 *   - list-item: 들여쓰기 + 불릿
 *   - table: 실제 표 렌더
 *   - slide/sheet: 섹션 구분자
 *   - speaker-note: 인용 박스
 *
 * 드래그 선택(onMouseUp)으로 크리틱 생성과 연동된다.
 */

import React from "react";
import type { UODEBlock } from "@/lib/uode";

interface Props {
  blocks: UODEBlock[];
  /** 페이지/슬라이드/시트 묶음으로 그룹핑할지 */
  groupByPage?: boolean;
  /** 드래그 선택 핸들러 (크리틱 생성용) */
  onMouseUp?: (e: React.MouseEvent, pageNum: number) => void;
  /** 모바일 터치 선택 핸들러 */
  onTouchEnd?: (e: React.TouchEvent, pageNum: number) => void;
  /** 본문 폰트 크기(px) */
  fontSize?: number;
  /** 페이지별 추가 오버레이 (크리틱 번호 등) */
  renderPageBadge?: (pageNum: number) => React.ReactNode;
}

/** 단일 블록 렌더 */
function BlockView({ b, fontSize }: { b: UODEBlock; fontSize: number }) {
  switch (b.type) {
    case "heading": {
      const lvl = b.level ?? 2;
      const sizes: Record<number, string> = {
        1: "text-[1.6em] font-bold",
        2: "text-[1.35em] font-bold",
        3: "text-[1.18em] font-semibold",
        4: "text-[1.08em] font-semibold",
        5: "text-[1em] font-semibold",
        6: "text-[0.95em] font-semibold",
      };
      return (
        <p
          className={`${sizes[lvl] || sizes[2]} text-[#11131a] mt-4 mb-1.5 leading-snug`}
        >
          {b.text}
        </p>
      );
    }
    case "list-item":
      return (
        <p className="text-[#22252e] leading-[1.75] pl-5 -indent-3 mb-0.5">
          <span className="text-[#6c8cff] mr-1.5">•</span>
          {b.text.replace(/^[-*•·]\s*/, "").replace(/^\d+\.\s*/, "")}
        </p>
      );
    case "table":
      if (b.table && b.table.length) {
        const [head, ...rows] = b.table;
        return (
          <div className="my-2 overflow-x-auto">
            <table className="border-collapse text-[0.92em] w-full">
              <tbody>
                {[head, ...rows].map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      const Cell = ri === 0 ? "th" : "td";
                      return (
                        <Cell
                          key={ci}
                          className={`border border-[#d4d7e0] px-2 py-1 text-left align-top ${
                            ri === 0
                              ? "bg-[#eef1f8] font-semibold text-[#11131a]"
                              : "text-[#22252e]"
                          }`}
                        >
                          {cell}
                        </Cell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return <p className="text-[#22252e] whitespace-pre-wrap">{b.text}</p>;
    case "slide":
    case "sheet":
      return (
        <div className="flex items-center gap-2 mt-5 mb-2">
          <span className="text-[0.8em] font-semibold text-[#4a6cf7] bg-[#eef1f8] px-2 py-0.5 rounded">
            {b.text}
          </span>
          <div className="flex-1 h-px bg-[#d4d7e0]" />
        </div>
      );
    case "speaker-note":
      return (
        <div className="my-1.5 border-l-2 border-[#a78bfa] bg-[#f4f1fb] pl-3 py-1.5 rounded-r">
          <span className="text-[0.78em] text-[#7c6bb0] font-medium"><Icon name="🗒" className="inline-flex align-[-0.125em] mr-1" size={15} />발표자 노트</span>
          <p className="text-[#3a3550] text-[0.95em] leading-relaxed mt-0.5">
            {b.text.replace(/^🗒\s*/, "")}
          </p>
        </div>
      );
    case "caption":
      return (
        <p className="text-[#626880] text-[0.85em] italic text-center my-1">
          {b.text}
        </p>
      );
    default:
      return (
        <p className="text-[#22252e] leading-[1.8] mb-2 whitespace-pre-wrap">
          {b.text}
        </p>
      );
  }
}

export default function DocumentReproduction({
  blocks,
  groupByPage = true,
  onMouseUp,
  onTouchEnd,
  fontSize = 13,
  renderPageBadge,
}: Props) {
  if (!blocks || blocks.length === 0) return null;

  // 페이지/슬라이드/시트 단위로 그룹핑
  const groups: { page: number; items: UODEBlock[] }[] = [];
  if (groupByPage) {
    let cur = -1;
    for (const b of blocks) {
      const pg = b.page ?? 1;
      if (pg !== cur) {
        groups.push({ page: pg, items: [] });
        cur = pg;
      }
      groups[groups.length - 1].items.push(b);
    }
  } else {
    groups.push({ page: 1, items: blocks });
  }

  return (
    <div className="px-6 py-4 space-y-6" style={{ fontSize }}>
      {groups.map((g, gi) => (
        <div key={gi} id={`uode-page-${g.page}`}>
          {groupByPage && groups.length > 1 && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded">
                {g.page} 페이지
              </span>
              {renderPageBadge?.(g.page)}
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
          )}
          {/* 원문 재현 — 종이 같은 표면 위에 구조화된 텍스트 */}
          <div
            data-selectable="1"
            data-page={g.page}
            className="max-w-[680px] mx-auto bg-white rounded-xl border border-white/[0.06] shadow-xl px-8 py-7 select-text cursor-text"
            style={{ WebkitUserSelect: "text", userSelect: "text" }}
            onMouseUp={(e) => onMouseUp?.(e, g.page)}
            onTouchEnd={(e) => onTouchEnd?.(e, g.page)}
          >
            {g.items.map((b, i) => (
              <BlockView key={i} b={b} fontSize={fontSize} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
