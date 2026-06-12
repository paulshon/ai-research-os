"use client";

/* ════════════════════════════════════════════════════════════
   v28: 참고문헌 인용 리스트 정리 (/references)
   - 서지정보 포맷 전부 불러오기:
       · DOI 조회 (Crossref → OpenAlex → Semantic Scholar)
       · RIS(.ris) / BibTeX(.bib) 텍스트 붙여넣기
       · 파일 업로드(PDF/DOCX/HWP 등에서 서지 추출)
   - 정렬: 가나다/ABC순(저자) · 연도순 · 제목순 (오름/내림 토글)
   - 7개 인용 스타일로 렌더 (APA7/MLA9/Chicago/IEEE/Vancouver/Harvard/Nature)
   - 리스트 텍스트로 내보내기(.txt 다운로드 / 클립보드 복사)
   - 전역 refDB(useCitation) 사용 → 다른 메뉴와 동일 리스트 공유
═══════════════════════════════════════════════════════════════ */

import { useState, useMemo, useRef } from "react";
import { APAAutomationSystem } from "@/components/apa/apa-automation-system";
import { Icon } from "@/components/ui/icon";
import { useCitation } from "@/components/citation/citation-context";
import { useTranslation } from "@/lib/i18n";
import {
  renderReference,
  canonicalToRefEntry,
  CITATION_STYLES,
  type CitationFormat,
} from "@/lib/citation/citation-bridge";
import {
  importBibFile,
  parseBibTextMulti,
  isBibTextFile,
  REFERENCES_ACCEPT,
} from "@/lib/citation/bib-file-import";
import type { RefEntry } from "@/lib/citation/apa-utils";
import type { CanonicalCitation } from "@ai-research-os/citation-core";

type SortKey = "author" | "year" | "title";
type ImportMode = "doi" | "ris" | "bibtex";

export default function ReferencesPage() {
  const { t } = useTranslation();
  const [apaOpen, setApaOpen] = useState(false);
  const {
    refDB,
    addRefs,
    removeRef,
    clearAll,
    loadPDFs,
    loading,
    loadProgress,
    citationStyle,
    setCitationStyle,
  } = useCitation();

  const [sortKey, setSortKey] = useState<SortKey>("author");
  const [sortAsc, setSortAsc] = useState(true);
  const [importMode, setImportMode] = useState<ImportMode>("doi");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(type: "ok" | "error" | "info", text: string) {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 4000);
  }

  // ── 정렬된 리스트 ──
  const sortedRefs = useMemo(() => {
    const arr = [...refDB];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "year") {
        cmp = (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0);
      } else if (sortKey === "title") {
        cmp = (a.title || "").localeCompare(b.title || "", "ko");
      } else {
        // author: 가나다(한글) + ABC(영문) 혼합 정렬
        const ka = (a.authors?.[0]?.last || a.authors?.[0]?.full || a.title || "").toLowerCase();
        const kb = (b.authors?.[0]?.last || b.authors?.[0]?.full || b.title || "").toLowerCase();
        cmp = ka.localeCompare(kb, "ko");
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [refDB, sortKey, sortAsc]);

  // ── 서지정보 불러오기 ──
  async function handleImport() {
    if (!input.trim()) {
      flash("error", t("references.emptyInput"));
      return;
    }
    setBusy(true);
    try {
      if (importMode === "doi") {
        const res = await fetch("/api/citation-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input.trim() }),
        });
        const data = await res.json();
        if (data.ok && data.citation) {
          const ref = canonicalToRefEntry(data.citation as CanonicalCitation);
          addRefs([ref]);
          flash("ok", `${t("references.importedDoi")} (${data.source})`);
          setInput("");
        } else {
          flash("error", data.error ?? t("references.lookupFailed"));
        }
      } else {
        // RIS / BibTeX — 여러 건 동시 붙여넣기 지원
        const refs = parseBibTextMulti(input.trim(), importMode);
        if (refs.length === 0) {
          flash("error", `${importMode.toUpperCase()} ${t("references.parseFailed")}`);
        } else {
          addRefs(refs);
          flash("ok", `${importMode.toUpperCase()} ${refs.length}건 ${t("references.imported")}`);
          setInput("");
        }
      }
    } catch {
      flash("error", t("references.errorOccurred"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const all = Array.from(files);
      // 서지 텍스트 포맷(.ris/.bib/.bibtex/.nbib/.enw/.txt) ↔ 문서(.pdf/.docx/.hwp 등) 분리
      const bibFiles = all.filter((f) => isBibTextFile(f.name));
      const docFiles = all.filter((f) => !isBibTextFile(f.name));

      let bibCount = 0;
      for (const f of bibFiles) {
        try {
          const refs = await importBibFile(f);
          if (refs.length) {
            addRefs(refs);
            bibCount += refs.length;
          }
        } catch {
          /* 개별 파일 실패는 무시하고 계속 */
        }
      }

      if (docFiles.length > 0) {
        // PDF/DOCX/HWP 등은 기존 문서 추출 엔진(UODE) 경로 사용
        await loadPDFs(docFiles);
      }

      if (bibCount > 0 && docFiles.length === 0) {
        flash("ok", `서지정보 ${bibCount}건 불러옴`);
      } else if (bibCount > 0) {
        flash("ok", `서지정보 ${bibCount}건 + 문서 ${docFiles.length}개 처리됨`);
      } else if (bibFiles.length > 0 && bibCount === 0 && docFiles.length === 0) {
        flash("error", t("references.parseFailed"));
      } else {
        flash("ok", t("references.fileImported"));
      }
    } catch {
      flash("error", t("references.errorOccurred"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── 텍스트 내보내기 ──
  function buildText(): string {
    const styleMeta = CITATION_STYLES.find((s) => s.id === citationStyle);
    const header = `참고문헌 (${styleMeta?.name ?? citationStyle}) — ${sortedRefs.length}건\n${"=".repeat(40)}\n\n`;
    const body = sortedRefs.map((r, i) => `${i + 1}. ${renderReference(r, citationStyle)}`).join("\n\n");
    return header + body;
  }

  function exportTxt() {
    if (sortedRefs.length === 0) return;
    const blob = new Blob([buildText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `references-${citationStyle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    flash("ok", t("references.exported"));
  }

  function copyText() {
    if (sortedRefs.length === 0) return;
    navigator.clipboard?.writeText(buildText()).then(
      () => flash("ok", t("references.copied")),
      () => flash("error", t("references.copyFailed"))
    );
  }

  const placeholder =
    importMode === "doi"
      ? "DOI (예: 10.1038/s41586-020-2649-2) 또는 DOI 포함 텍스트"
      : importMode === "ris"
      ? "RIS 형식 붙여넣기\nTY  - JOUR\nTI  - ...\nAU  - 홍, 길동\nPY  - 2025\nER  -"
      : "BibTeX 형식 붙여넣기\n@article{key,\n  title={...},\n  author={...},\n  year={2025}\n}";

  const sortLabels: Record<SortKey, string> = {
    author: t("references.sortAuthor"),
    year: t("references.sortYear"),
    title: t("references.sortTitle"),
  };

  return (
    <div className="p-4 md:p-5 lg:px-6 lg:py-6 font-nanum-gothic">
      <div className="max-w-[1680px] mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Icon name="library" size={20} />
          <h1 className="font-nanum-myeongjo text-[25px] font-bold text-[#e8eaf0]">
            {t("references.title")}
          </h1>
        </div>
        <p className="text-[16px] text-white/35 mb-6">{t("references.subtitle")}</p>

        <button
          type="button"
          onClick={() => setApaOpen(true)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6c8cff]/20 to-[#9b6cff]/20 border border-[#6c8cff]/35 text-[#bcc8ff] text-[14px] font-semibold hover:from-[#6c8cff]/30 hover:to-[#9b6cff]/30 transition-all"
        >
          📚 APA 인용 자동화 시스템 열기
        </button>
        <APAAutomationSystem open={apaOpen} onClose={() => setApaOpen(false)} />

        {msg && (
          <div
            className={`mb-5 px-4 py-2.5 rounded-lg text-[15px] flex items-center gap-2 ${
              msg.type === "ok"
                ? "bg-[#5ebd7c]/10 text-[#5ebd7c] border border-[#5ebd7c]/20"
                : msg.type === "error"
                ? "bg-[#ff7066]/10 text-[#ff7066] border border-[#ff7066]/20"
                : "bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20"
            }`}
          >
            <Icon name={msg.type === "ok" ? "check" : msg.type === "error" ? "error" : "idea"} size={14} />
            {msg.text}
          </div>
        )}

        {/* ── 서지정보 불러오기 ── */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-5">
          <p className="text-[16px] font-semibold text-[#3ecfb2] mb-3 flex items-center gap-1.5">
            <Icon name="download" size={15} /> {t("references.importTitle")}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {([
              { id: "doi", label: "DOI" },
              { id: "ris", label: "RIS" },
              { id: "bibtex", label: "BibTeX" },
            ] as { id: ImportMode; label: string }[]).map((m) => (
              <button
                key={m.id}
                onClick={() => setImportMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[14.5px] transition-all ${
                  importMode === m.id
                    ? "bg-[#3ecfb2]/15 text-[#3ecfb2] border border-[#3ecfb2]/30"
                    : "text-white/30 border border-transparent hover:text-white/50"
                }`}
              >
                {m.label}
              </button>
            ))}
            <span className="mx-1 text-white/10">|</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-[14.5px] text-white/40 border border-white/[0.06] hover:text-white/70 transition-all flex items-center gap-1"
            >
              <Icon name="upload" size={12} /> {t("references.fileUpload")}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={REFERENCES_ACCEPT}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#3ecfb2] min-h-[80px] resize-y font-mono leading-relaxed"
            placeholder={placeholder}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[14px] text-white/25">
              {loading || busy ? loadProgress || t("references.processing") : `${refDB.length} ${t("references.itemsUnit")}`}
            </span>
            <button
              onClick={handleImport}
              disabled={busy || loading}
              className="px-5 py-2 rounded-lg bg-[#3ecfb2]/15 border border-[#3ecfb2]/30 text-[#3ecfb2] text-[15px] font-medium hover:bg-[#3ecfb2]/25 transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <Icon name="download" size={13} /> {t("references.addToList")}
            </button>
          </div>
        </div>

        {/* ── 정렬 / 스타일 / 내보내기 컨트롤 ── */}
        <div className="p-4 rounded-[16px] bg-[#13161e] border border-white/[0.04] mb-5 flex flex-col lg:flex-row lg:items-center gap-3">
          {/* 정렬 */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[14px] text-white/30 mr-1 whitespace-nowrap">{t("references.sortBy")}</span>
            {(["author", "year", "title"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-2.5 py-1.5 rounded-lg text-[14px] whitespace-nowrap transition-all ${
                  sortKey === k
                    ? "bg-[#6c8cff]/15 text-[#6c8cff] border border-[#6c8cff]/30"
                    : "text-white/30 border border-transparent hover:text-white/50"
                }`}
              >
                {sortLabels[k]}
              </button>
            ))}
            <button
              onClick={() => setSortAsc((v) => !v)}
              title={sortAsc ? t("references.asc") : t("references.desc")}
              className="px-2 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
            >
              <Icon name={sortAsc ? "chevronUp" : "chevronDown"} size={13} />
            </button>
          </div>

          <div className="hidden lg:block w-px h-5 bg-white/[0.06]" />

          {/* 스타일 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] text-white/30 mr-1 whitespace-nowrap">{t("references.style")}</span>
            {CITATION_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setCitationStyle(s.id as CitationFormat)}
                className={`px-2.5 py-1.5 rounded-lg text-[14px] whitespace-nowrap transition-all ${
                  citationStyle === s.id
                    ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30"
                    : "text-white/30 border border-transparent hover:text-white/50"
                }`}
                title={s.fullName}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="lg:ml-auto flex items-center gap-1.5 flex-wrap">
            <button
              onClick={copyText}
              disabled={refDB.length === 0}
              className="px-3 py-1.5 rounded-lg text-[14px] whitespace-nowrap text-white/50 border border-white/[0.06] hover:text-white/80 hover:bg-white/[0.04] transition-all disabled:opacity-30 flex items-center gap-1"
            >
              <Icon name="files" size={12} /> {t("references.copy")}
            </button>
            <button
              onClick={exportTxt}
              disabled={refDB.length === 0}
              className="px-3 py-1.5 rounded-lg text-[14px] whitespace-nowrap bg-[#6c8cff]/15 border border-[#6c8cff]/30 text-[#6c8cff] hover:bg-[#6c8cff]/25 transition-all disabled:opacity-30 flex items-center gap-1"
            >
              <Icon name="upload" size={12} /> {t("references.exportTxt")}
            </button>
          </div>
        </div>

        {/* ── 참고문헌 리스트 ── */}
        <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[16px] font-semibold text-white/70">
              {t("references.listTitle")} ({sortedRefs.length})
            </p>
            {refDB.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t("references.clearConfirm"))) clearAll();
                }}
                className="text-[14px] text-white/30 hover:text-[#ff7066] transition-colors flex items-center gap-1"
              >
                <Icon name="trash" size={12} /> {t("references.clearAll")}
              </button>
            )}
          </div>

          {sortedRefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-white/15 text-center px-4">
              <Icon name="library" size={32} />
              <p className="text-[16px] mt-3">{t("references.emptyTitle")}</p>
              <p className="text-[14px] mt-1 text-white/10">{t("references.emptyHint")}</p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {sortedRefs.map((r: RefEntry, i: number) => (
                <li
                  key={r.id}
                  className="group flex items-start gap-3 p-3 rounded-lg bg-[#1a1e2a]/50 hover:bg-[#1a1e2a] border border-white/[0.03] transition-all"
                >
                  <span className="text-[14px] text-white/25 mt-0.5 tabular-nums w-6 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] text-white/75 leading-[1.65] break-words">
                      {renderReference(r, citationStyle)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.year && <span className="text-[13px] text-white/25">{r.year}</span>}
                      {r.doi && (
                        <a
                          href={`https://doi.org/${r.doi}`}
                          target="_blank"
                          rel="noopener"
                          className="text-[13px] text-[#a78bfa] hover:underline flex items-center gap-0.5"
                        >
                          <Icon name="link" size={10} /> DOI
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeRef(r.id)}
                    className="text-white/15 hover:text-[#ff7066] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    aria-label={t("references.remove")}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
