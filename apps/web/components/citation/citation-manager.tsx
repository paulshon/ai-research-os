"use client";

/* ════════════════════════════════════════════════════════════
   v25: 인용 관리 (Citation Manager) — Issue 7
   - 서지정보 포맷 불러오기: DOI 조회(DOI-우선) / RIS / BibTeX 붙여넣기
   - 7개 인용 스타일로 포맷: APA7 / MLA9 / Chicago / IEEE / Vancouver / Harvard / Nature
   - 참고문헌 리스트와 양방향 연동 (추가/삭제)
   - 내보내기: RIS(.ris) / BibTeX(.bib) / 서식화 텍스트 복사
═══════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import {
  formatCitation,
  toBibTeX,
  toRIS,
  validateCitation,
  parseBibliographicText,
  toCanonicalCitation,
  CITATION_STYLE_META,
  type CanonicalCitation,
  type CitationFormat,
} from "@ai-research-os/citation-core";

export interface CitationManagerProps {
  /** 참고문헌 리스트 (Literature 페이지의 references 상태와 연동) */
  citations: CanonicalCitation[];
  /** 새 인용을 리스트에 추가 */
  onAdd: (c: CanonicalCitation) => void;
  /** 인용 제거 */
  onRemove: (id: string) => void;
}

type ImportMode = "doi" | "ris" | "bibtex";

export default function CitationManager({ citations, onAdd, onRemove }: CitationManagerProps) {
  const [style, setStyle] = useState<CitationFormat>("apa7");
  const [importMode, setImportMode] = useState<ImportMode>("doi");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);

  const styleMeta = useMemo(
    () => CITATION_STYLE_META.find((s) => s.id === style) ?? CITATION_STYLE_META[0],
    [style]
  );

  function flash(type: "ok" | "error" | "info", text: string) {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }

  // ── 서지정보 불러오기 ──
  async function handleImport() {
    if (!input.trim()) {
      flash("error", "DOI 또는 서지정보 텍스트를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      if (importMode === "doi") {
        // DOI-우선 조회 (Crossref → OpenAlex → Semantic Scholar)
        const res = await fetch("/api/citation-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input.trim() }),
        });
        const data = await res.json();
        if (data.ok && data.citation) {
          onAdd(data.citation as CanonicalCitation);
          flash("ok", `서지정보를 불러왔습니다 (출처: ${data.source}). 참고문헌 리스트에 추가됨.`);
          setInput("");
        } else {
          flash("error", data.error ?? "조회에 실패했습니다.");
        }
      } else {
        // RIS / BibTeX 텍스트 파싱 (로컬)
        const parsed = parseBibliographicText(input.trim());
        if (!parsed) {
          flash("error", `${importMode.toUpperCase()} 형식을 인식하지 못했습니다. 형식을 확인하세요.`);
        } else {
          const citation = toCanonicalCitation(parsed.data);
          if (!citation.title) {
            flash("error", "제목을 추출하지 못했습니다. 입력 내용을 확인하세요.");
          } else {
            onAdd(citation);
            flash("ok", `${parsed.format.toUpperCase()} 서지정보를 참고문헌 리스트에 추가했습니다.`);
            setInput("");
          }
        }
      }
    } catch {
      flash("error", "처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ── 내보내기 ──
  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRIS() {
    if (citations.length === 0) return;
    download("references.ris", citations.map(toRIS).join("\n\n"), "application/x-research-info-systems");
  }
  function exportBibTeX() {
    if (citations.length === 0) return;
    download("references.bib", citations.map(toBibTeX).join("\n\n"), "application/x-bibtex");
  }
  function copyFormatted() {
    if (citations.length === 0) return;
    const text = citations.map((c, i) => `[${i + 1}] ${formatCitation(c, style)}`).join("\n\n");
    navigator.clipboard?.writeText(text).then(
      () => flash("ok", `${styleMeta.name} 형식으로 참고문헌 목록을 복사했습니다.`),
      () => flash("error", "클립보드 복사에 실패했습니다.")
    );
  }

  const placeholder =
    importMode === "doi"
      ? "DOI 입력 (예: 10.1038/s41586-020-2649-2) 또는 DOI가 포함된 텍스트 붙여넣기"
      : importMode === "ris"
      ? "RIS 형식 텍스트 붙여넣기\n예)\nTY  - JOUR\nTI  - 논문 제목\nAU  - 홍, 길동\nPY  - 2025\nDO  - 10.xxxx/xxxx\nER  -"
      : "BibTeX 형식 텍스트 붙여넣기\n예)\n@article{key2025,\n  title = {논문 제목},\n  author = {홍길동},\n  year = {2025},\n  doi = {10.xxxx/xxxx}\n}";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-bold font-nanum-myeongjo mb-1">인용 관리</h2>
        <p className="text-[12px] text-white/35">
          서지정보 포맷(DOI·RIS·BibTeX)을 불러오고, 7개 인용 스타일로 변환하여 참고문헌 리스트와 연동합니다.
        </p>
      </div>

      {/* 메시지 */}
      {message && (
        <div
          className={`px-4 py-2.5 rounded-lg text-[12px] flex items-center gap-2 ${
            message.type === "ok"
              ? "bg-[#5ebd7c]/10 text-[#5ebd7c] border border-[#5ebd7c]/20"
              : message.type === "error"
              ? "bg-[#ff7066]/10 text-[#ff7066] border border-[#ff7066]/20"
              : "bg-[#6c8cff]/10 text-[#6c8cff] border border-[#6c8cff]/20"
          }`}
        >
          <Icon name={message.type === "ok" ? "check" : message.type === "error" ? "error" : "idea"} size={14} />
          {message.text}
        </div>
      )}

      {/* ── 서지정보 불러오기 ── */}
      <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
        <p className="text-[13px] font-semibold text-[#3ecfb2] mb-3 flex items-center gap-1.5">
          <Icon name="download" size={15} /> 서지정보 불러오기
        </p>
        <div className="flex items-center gap-1.5 mb-3">
          {([
            { id: "doi", label: "DOI 조회" },
            { id: "ris", label: "RIS" },
            { id: "bibtex", label: "BibTeX" },
          ] as { id: ImportMode; label: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setImportMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] transition-all ${
                importMode === m.id
                  ? "bg-[#3ecfb2]/15 text-[#3ecfb2] border border-[#3ecfb2]/30"
                  : "text-white/30 border border-transparent hover:text-white/50"
              }`}
            >
              {m.label}
            </button>
          ))}
          {importMode === "doi" && (
            <span className="ml-2 text-[10px] text-white/25">DOI-우선: Crossref → OpenAlex → Semantic Scholar</span>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[12px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#3ecfb2] min-h-[90px] resize-y font-mono leading-relaxed"
          placeholder={placeholder}
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleImport}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[#3ecfb2]/15 border border-[#3ecfb2]/30 text-[#3ecfb2] text-[12px] font-medium hover:bg-[#3ecfb2]/25 transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? (
              "불러오는 중..."
            ) : (
              <>
                <Icon name="download" size={13} /> 불러와서 리스트에 추가
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 인용 스타일 선택 ── */}
      <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
        <p className="text-[13px] font-semibold text-[#a78bfa] mb-3 flex items-center gap-1.5">
          <Icon name="files" size={15} /> 인용 스타일
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CITATION_STYLE_META.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] transition-all ${
                style === s.id
                  ? "bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/30"
                  : "text-white/30 border border-transparent hover:text-white/50"
              }`}
              title={s.fullName}
            >
              {s.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          {styleMeta.fullName} · 분야: {styleMeta.field}
        </p>
        <p className="text-[11px] text-white/20 mt-1">본문 인용 예: {styleMeta.inTextExample}</p>
      </div>

      {/* ── 참고문헌 리스트 (스타일 적용) ── */}
      <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold text-white/70 flex items-center gap-1.5">
            <Icon name="library" size={15} /> 참고문헌 리스트 ({citations.length}편)
          </p>
          {citations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyFormatted}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all flex items-center gap-1"
              >
                <Icon name="files" size={12} /> {styleMeta.name} 복사
              </button>
              <button
                onClick={exportRIS}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all flex items-center gap-1"
              >
                <Icon name="upload" size={12} /> RIS
              </button>
              <button
                onClick={exportBibTeX}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all flex items-center gap-1"
              >
                <Icon name="upload" size={12} /> BibTeX
              </button>
            </div>
          )}
        </div>

        {citations.length === 0 ? (
          <div className="flex items-center justify-center h-[160px] text-white/15 text-[12px] text-center px-4">
            서지정보를 불러오거나 논문 검색 탭에서 논문을 추가하면
            <br />
            선택한 스타일로 서식화된 참고문헌이 여기에 표시됩니다.
          </div>
        ) : (
          <ol className="space-y-2.5">
            {citations.map((c, i) => {
              const v = validateCitation(c);
              return (
                <li
                  key={c.id}
                  className="group flex items-start gap-3 p-3 rounded-lg bg-[#1a1e2a]/50 hover:bg-[#1a1e2a] border border-white/[0.03] transition-all"
                >
                  <span className="text-[11px] text-white/25 mt-0.5 tabular-nums w-5 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] text-white/75 leading-[1.65] break-words">
                      {formatCitation(c, style)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {c.doi && (
                        <a
                          href={`https://doi.org/${c.doi}`}
                          target="_blank"
                          rel="noopener"
                          className="text-[10px] text-[#a78bfa] hover:underline flex items-center gap-0.5"
                        >
                          <Icon name="link" size={10} /> DOI
                        </a>
                      )}
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded-full ${
                          c.confidence >= 80
                            ? "bg-[#5ebd7c]/15 text-[#5ebd7c]"
                            : c.confidence >= 50
                            ? "bg-[#e8b84b]/15 text-[#e8b84b]"
                            : "bg-white/[0.05] text-white/30"
                        }`}
                      >
                        신뢰도 {c.confidence}%
                      </span>
                      {!v.isValid && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-[#ff7066]/15 text-[#ff7066] flex items-center gap-0.5">
                          <Icon name="warn" size={9} /> 검토 필요
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(c.id)}
                    className="text-white/15 hover:text-[#ff7066] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    aria-label="제거"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
