"use client";
import { Icon } from "@/components/ui/icon";

import { useState, useRef, useCallback, useEffect } from "react";
import { useCitation } from "./citation-context";
import { RefEntry, toAPAInline, toAPARef } from "@/lib/citation/apa-utils";

type TabType = "all" | "search" | "cited";

function RefItem({
  ref: r,
  onCopy,
  onInsert,
  onToggleCited,
  inlineText,
  fullText,
  styleLabel,
}: {
  ref: RefEntry;
  onCopy: (text: string) => void;
  onInsert: (ref: RefEntry) => void;
  onToggleCited: (id: string, cited: boolean) => void;
  inlineText?: string;
  fullText?: string;
  styleLabel?: string;
}) {
  const inline = inlineText ?? toAPAInline(r);
  const full = fullText ?? toAPARef(r);
  const auths = r.authors || [];
  const authDisplay =
    auths.length === 0
      ? "저자불명"
      : auths.length === 1
      ? auths[0].last || auths[0].full || "?"
      : auths.length === 2
      ? `${auths[0].last} & ${auths[1].last}`
      : `${auths[0].last} et al.`;

  return (
    <div
      className="rounded-lg p-2.5 mb-1.5 text-[11px]"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: r.cited
          ? "3px solid #34d399"
          : "3px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="font-semibold text-[#e8eaf0] leading-tight mb-1 line-clamp-2">
        {r.title
          ? r.title.slice(0, 90) + (r.title.length > 90 ? "…" : "")
          : "(제목 없음)"}
      </div>
      <div className="text-[#9ba3b8] mb-2">
        <strong className="text-[#c0c7d8]">{authDisplay}</strong> ·{" "}
        {r.year || "?"}
        {r.journal ? " · " + r.journal.slice(0, 28) : ""}
        {r.source ? (
          <span className="text-[#626880]"> · {r.source.slice(0, 16)}</span>
        ) : null}
      </div>

      <div
        className="relative rounded px-2 py-1.5 mb-1.5 pr-8"
        style={{
          background: "rgba(96,165,250,0.07)",
          border: "1px solid rgba(96,165,250,0.25)",
        }}
      >
        <div className="text-[9px] text-[#60a5fa] font-bold uppercase tracking-wide mb-0.5">
          <Icon name="📝" className="inline-flex align-[-0.125em] mr-1" size={15} />본문내 인용
        </div>
        <code className="text-[13px] text-[#e8eaf0] font-bold">{inline}</code>
        <button
          onClick={() => onCopy(inline)}
          title="복사"
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer"
          style={{
            border: "1px solid rgba(96,165,250,0.4)",
            background: "rgba(96,165,250,0.12)",
            color: "#60a5fa",
          }}
        >
          <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />
        </button>
      </div>

      <div
        className="relative rounded px-2 py-1.5 mb-2 pr-8"
        style={{
          background: "rgba(52,211,153,0.05)",
          border: "1px solid rgba(52,211,153,0.2)",
        }}
      >
        <div className="text-[9px] text-[#34d399] font-bold uppercase tracking-wide mb-0.5">
          <Icon name="📚" className="inline-flex align-[-0.125em] mr-1" size={15} />{styleLabel || "참고문헌"}
        </div>
        <div
          className="text-[10px] text-[#9ba3b8] leading-relaxed"
          style={{ wordBreak: "break-all" }}
        >
          {full.slice(0, 200)}
          {full.length > 200 ? "…" : ""}
        </div>
        <button
          onClick={() => onCopy(full)}
          title="복사"
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer"
          style={{
            border: "1px solid rgba(52,211,153,0.4)",
            background: "rgba(52,211,153,0.12)",
            color: "#34d399",
          }}
        >
          <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />
        </button>
      </div>

      {/* 캡처된 핵심 키워드 (scholarly-parser) */}
      {r.keywords && r.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {r.keywords.slice(0, 6).map((kw, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(167,139,250,0.12)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.25)",
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 캡처된 요약 (접기/펼치기) */}
      {r.abstract && r.abstract.length > 0 && (
        <details className="mb-2">
          <summary className="text-[9px] text-[#e8b84b] cursor-pointer select-none">
            <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />요약 보기
          </summary>
          <p className="text-[10px] text-[#9ba3b8] leading-relaxed mt-1">
            {r.abstract.slice(0, 400)}
            {r.abstract.length > 400 ? "…" : ""}
          </p>
        </details>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => onInsert(r)}
          className="flex-1 py-1 px-2 rounded text-[10px] font-semibold cursor-pointer"
          style={{
            border: "1px solid rgba(96,165,250,0.5)",
            color: "#60a5fa",
            background: "rgba(96,165,250,0.08)",
          }}
        >
          <Icon name="✏" className="inline-flex align-[-0.125em] mr-1" size={15} />삽입
        </button>
        <button
          onClick={() => onCopy(inline)}
          className="flex-1 py-1 px-2 rounded text-[10px] font-semibold cursor-pointer"
          style={{
            border: "1px solid rgba(96,165,250,0.3)",
            color: "#60a5fa",
            background: "rgba(96,165,250,0.04)",
          }}
        >
          <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />복사
        </button>
        {r.cited && (
          <button
            onClick={() => onToggleCited(r.id, false)}
            className="py-1 px-2 rounded text-[10px] cursor-pointer"
            style={{
              border: "1px solid rgba(248,113,113,0.3)",
              color: "#f87171",
              background: "rgba(248,113,113,0.06)",
            }}
          >
            <Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function CitedRefList({ refs }: { refs: RefEntry[] }) {
  const { markCited, formatRef, formatInText } = useCitation();
  const sorted = [...refs].sort((a, b) => {
    const la = (a.authors?.[0]?.last || a.title || "").toLowerCase();
    const lb = (b.authors?.[0]?.last || b.title || "").toLowerCase();
    return la.localeCompare(lb, "ko");
  });

  const copyAll = () => {
    const text = sorted.map((r) => formatRef(r)).join("\n\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-[12px] text-[#626880]">
        인용된 참고문헌이 없습니다.
        <br />
        <small><Icon name="✏" className="inline-flex align-[-0.125em] mr-1" size={15} />본문내 인용 삽입 후 여기에 표시됩니다</small>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 mb-2 pb-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="text-[11px] font-bold text-[#34d399]">
          <Icon name="✅" className="inline-flex align-[-0.125em] mr-1" size={15} />인용됨 {sorted.length}건
        </span>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={copyAll}
            className="px-2 py-1 rounded text-[10px] font-semibold cursor-pointer"
            style={{
              border: "1px solid rgba(96,165,250,0.4)",
              color: "#60a5fa",
              background: "rgba(96,165,250,0.08)",
            }}
          >
            <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />전체 복사
          </button>
          <button
            onClick={copyAll}
            className="px-2 py-1 rounded text-[10px] font-semibold cursor-pointer"
            style={{
              border: "1px solid rgba(52,211,153,0.4)",
              color: "#34d399",
              background: "rgba(52,211,153,0.08)",
            }}
          >
            <Icon name="📄" className="inline-flex align-[-0.125em] mr-1" size={15} />전체 합치기
          </button>
        </div>
      </div>
      {sorted.map((r, i) => {
        const inline = formatInText(r);
        const full = formatRef(r);
        return (
          <div
            key={r.id}
            className="rounded-lg p-2 mb-1.5"
            style={{
              border: "1px solid rgba(52,211,153,0.3)",
              background: "rgba(52,211,153,0.03)",
            }}
          >
            <div className="flex items-start gap-1.5">
              <span className="text-[10px] text-[#626880] min-w-[18px] pt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#60a5fa] mb-1">
                  <strong>본문:</strong>{" "}
                  <code className="text-[11px]">{inline}</code>
                </div>
                <div
                  className="text-[10px] text-[#9ba3b8] leading-relaxed"
                  style={{ wordBreak: "break-all" }}
                >
                  {full}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => navigator.clipboard?.writeText(full)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer"
                  style={{
                    border: "1px solid rgba(52,211,153,0.4)",
                    background: "rgba(52,211,153,0.1)",
                    color: "#34d399",
                  }}
                >
                  <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />
                </button>
                <button
                  onClick={() => markCited(r.id, false)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer"
                  style={{
                    border: "1px solid rgba(248,113,113,0.3)",
                    background: "rgba(248,113,113,0.08)",
                    color: "#f87171",
                  }}
                >
                  <Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CitationPanel() {
  const {
    refDB,
    isOpen,
    closePanel,
    markCited,
    clearAll,
    loadPDFs,
    loading,
    loadProgress,
    citedRefs,
    citationStyle,
    setCitationStyle,
    styles,
    formatRef,
    formatInText,
  } = useCitation();

  const [tab, setTab] = useState<TabType>("all");
  const [query, setQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRefs =
    tab === "cited"
      ? citedRefs
      : tab === "search" && query.trim()
      ? (() => {
          const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
          return refDB.filter((r) => {
            const hay = [
              r.title || "",
              r.year || "",
              r.journal || "",
              ...(r.authors || []).map((a) => (a.full || "") + (a.last || "")),
              r.doi || "",
            ]
              .join(" ")
              .toLowerCase();
            return words.every((w) => hay.includes(w));
          });
        })()
      : refDB;

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  const handleInsert = useCallback(
    (ref: RefEntry) => {
      markCited(ref.id, true);
      const inline = formatInText(ref);
      const activeEl = document.activeElement as HTMLTextAreaElement | null;
      if (activeEl && activeEl.tagName === "TEXTAREA") {
        const pos =
          activeEl.selectionStart != null
            ? activeEl.selectionStart
            : activeEl.value.length;
        const before = activeEl.value.slice(0, pos);
        const after = activeEl.value.slice(pos);
        const space = before.length > 0 && !/\s$/.test(before) ? " " : "";
        activeEl.value = before + space + inline + after;
        activeEl.selectionStart = activeEl.selectionEnd =
          pos + space.length + inline.length;
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));
        activeEl.focus();
      } else {
        navigator.clipboard?.writeText(inline).catch(() => {});
      }
    },
    [markCited, formatInText]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      loadPDFs(e.dataTransfer.files);
    },
    [loadPDFs]
  );

  if (!isOpen) return null;

  const tabStyle = (t: TabType) => ({
    flex: 1 as const,
    padding: "7px 4px",
    textAlign: "center" as const,
    fontSize: "10px",
    fontWeight: "600",
    cursor: "pointer",
    color: tab === t ? "#60a5fa" : "#626880",
    borderBottom: tab === t ? "2px solid #60a5fa" : "2px solid transparent",
    whiteSpace: "nowrap" as const,
  });

  return (
    <>
      <script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        async
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.hwpx,.hwp,.txt,.md,.rtf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && loadPDFs(e.target.files)}
      />

      {/* Panel — responsive: full screen on mobile, fixed floating on desktop */}
      <div
        className="fixed z-[8000] flex flex-col top-0 bottom-14 lg:top-10 lg:bottom-0"
        style={{
          right: "0",
          width: "100%",
          maxWidth: "420px",
          background: "#13161e",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center text-[13px] font-bold text-[#60a5fa]"
            style={{
              background: "rgba(96,165,250,0.1)",
              border: "2px dashed #60a5fa",
            }}
          >
            <Icon name="📥" className="inline-flex align-[-0.125em] mr-1" size={15} />PDF 파일을 여기에 놓으세요
          </div>
        )}

        {/* 헤더 */}
        <div
          className="px-3.5 py-2.5 flex items-center justify-between flex-shrink-0"
          style={{
            background: "rgba(96,165,250,0.10)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <span><Icon name="📚" className="inline-flex align-[-0.125em] mr-1" size={15} /></span>
            <span className="text-[13px] font-bold text-[#e8eaf0]">
              참고문헌 인용
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(96,165,250,0.25)", color: "#60a5fa" }}
            >
              {refDB.length}건
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded text-[11px] cursor-pointer"
              style={{
                border: "1px solid rgba(96,165,250,0.5)",
                color: "#60a5fa",
                background: "rgba(96,165,250,0.08)",
              }}
            >
              + 문서 추가
            </button>
            <button
              onClick={closePanel}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold cursor-pointer"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(248,113,113,0.1)",
                color: "#f87171",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 로딩 프로그레스 */}
        {(loading || loadProgress) && (
          <div
            className="px-3 py-2 text-[11px] flex-shrink-0"
            style={{
              background: loading
                ? "rgba(96,165,250,0.07)"
                : "rgba(52,211,153,0.07)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              color: loading ? "#60a5fa" : "#34d399",
            }}
          >
            {loadProgress}
          </div>
        )}

        {/* 인용 스타일 선택 (Citation Core v2.0) */}
        <div
          className="px-3 py-2 flex-shrink-0 flex items-center gap-2"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[10px] text-[#626880] flex-shrink-0">인용 스타일</span>
          <select
            value={citationStyle}
            onChange={(e) => setCitationStyle(e.target.value as typeof citationStyle)}
            className="flex-1 px-2 py-1 rounded text-[11px] outline-none cursor-pointer"
            style={{
              background: "#0d0f14",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e8eaf0",
            }}
          >
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.field}
              </option>
            ))}
          </select>
        </div>

        {/* 검색 */}
        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setTab("search");
            }}
            placeholder="저자, 제목, 키워드로 검색..."
            className="w-full px-3 py-1.5 rounded-lg text-[12px] outline-none"
            style={{
              background: "#0d0f14",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e8eaf0",
            }}
          />
        </div>

        {/* 탭 */}
        <div
          className="flex flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div style={tabStyle("all")} onClick={() => setTab("all")}>
            <Icon name="📋" className="inline-flex align-[-0.125em] mr-1" size={15} />전체목록
          </div>
          <div style={tabStyle("search")} onClick={() => setTab("search")}>
            <Icon name="🔍" className="inline-flex align-[-0.125em] mr-1" size={15} />검색결과
          </div>
          <div style={tabStyle("cited")} onClick={() => setTab("cited")}>
            <Icon name="✅" className="inline-flex align-[-0.125em] mr-1" size={15} />인용됨{citedRefs.length > 0 ? ` (${citedRefs.length})` : ""}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2">
          {tab === "cited" ? (
            <CitedRefList refs={citedRefs} />
          ) : filteredRefs.length === 0 ? (
            <div className="text-center py-7 text-[12px] text-[#626880]">
              {refDB.length === 0 ? (
                <>
                  <Icon name="📂" className="inline-flex align-[-0.125em] mr-1" size={15} />문서를 추가하세요
                  <br />
                  <small>+ 문서 추가 버튼 클릭 (PDF·DOCX·HWP·HWPX 등)</small>
                </>
              ) : (
                "검색 결과가 없습니다."
              )}
            </div>
          ) : (
            filteredRefs.map((r) => (
              <RefItem
                key={r.id}
                ref={r}
                onCopy={handleCopy}
                onInsert={handleInsert}
                onToggleCited={markCited}
                inlineText={formatInText(r)}
                fullText={formatRef(r)}
                styleLabel={styles.find((s) => s.id === citationStyle)?.name + " 참고문헌"}
              />
            ))
          )}
        </div>

        {/* 하단 삭제 */}
        {refDB.length > 0 && (
          <div
            className="px-3 py-2 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `모든 참고문헌을 삭제하시겠습니까?\n총 ${refDB.length}건이 삭제됩니다.`
                  )
                )
                  clearAll();
              }}
              className="w-full py-1.5 rounded text-[10px] cursor-pointer"
              style={{
                border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171",
                background: "rgba(248,113,113,0.04)",
              }}
            >
              <Icon name="🗑" className="inline-flex align-[-0.125em] mr-1" size={15} />전체 삭제 ({refDB.length}건)
            </button>
          </div>
        )}
      </div>
    </>
  );
}
