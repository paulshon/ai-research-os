"use client";

/* ════════════════════════════════════════════════════════════════════════
   APA 인용 자동화 시스템 (APA Citation Knowledge Graph) — RDOS v12
   ----------------------------------------------------------------------
   참고문헌 정리 페이지의 하부 실행 시스템(모달). 단순 생성기가 아니라
   엔진(lib/citation/apa-engine.ts) 위에서 동작하는 스마트 CKG:
     · 15 families / 40+ types / 프로파일 기반 동적 입력
     · 본문인용·참고문헌 8개 스타일 렌더 · 엣지케이스(a·b·c, n.d., no-author)
     · 검증 + 컴플라이언스 점수 + 자동수정 · RIS/BibTeX/CSL-JSON/DOI 변환
     · Gemini 기반 AI 도우미(자연어→구조화, 유형판별, 오류설명, 누락보완)
     · 지식그래프·분류체계·APA 규칙 지식베이스
   진행 표시는 전역 AI 진행바(use-gemini)와 자동 연동.
═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useGemini } from "@/hooks/use-gemini";
import {
  FAMILIES,
  PROFILES,
  STYLES,
  APA_RULES,
  ALL_TYPES,
  typeByCode,
  profileFor,
  parseAuthors,
  emptyEntry,
  rid,
  buildInText,
  renderReference,
  applyEdgeCases,
  validateEntry,
  validateList,
  autoRepair,
  parseImport,
  detectType,
  toCSLJSON,
  toBibTeX,
  toRIS,
  type CKGEntry,
  type CSLName,
  type StyleId,
  type InTextKind,
  type Issue,
} from "@/lib/citation/apa-engine";
import { loadRefDB, saveRefDB, type RefEntry } from "@/lib/citation/apa-utils";

const STORE_KEY = "rdos_apa_ckg_v12";

type Menu =
  | "dashboard"
  | "builder"
  | "intext"
  | "validate"
  | "transform"
  | "export"
  | "ai"
  | "graph"
  | "taxonomy"
  | "knowledge"
  | "settings";

const MENUS: { key: Menu; icon: string; label: string }[] = [
  { key: "dashboard", icon: "🏠", label: "대시보드" },
  { key: "builder", icon: "📚", label: "참고문헌 빌더" },
  { key: "intext", icon: "📝", label: "본문 인용" },
  { key: "validate", icon: "✓", label: "검증·자동수정" },
  { key: "transform", icon: "🔄", label: "변환·가져오기" },
  { key: "export", icon: "⬆", label: "내보내기" },
  { key: "ai", icon: "🤖", label: "AI 도우미" },
  { key: "graph", icon: "🕸", label: "지식그래프" },
  { key: "taxonomy", icon: "🗂", label: "분류체계" },
  { key: "knowledge", icon: "📖", label: "APA 지식베이스" },
  { key: "settings", icon: "⚙", label: "설정" },
];

// 마크다운 이탤릭(*…*) → <em>
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("*").map((seg, i) => (i % 2 ? <em key={i}>{seg}</em> : <span key={i}>{seg}</span>))}
    </>
  );
}

function authorsToText(names: CSLName[] = []): string {
  return names.map((n) => (n.literal ? n.literal : `${n.family || ""}${n.given ? ", " + n.given : ""}`)).join("\n");
}

function ckgToRefEntry(e: CKGEntry): RefEntry {
  const fam = typeByCode(e.type)?.family;
  return {
    id: e.id || rid(),
    raw: renderReference(e, "apa7").replace(/\*/g, ""),
    type: fam === "book" || fam === "chapter" ? "book" : fam === "periodical" ? "journal" : "other",
    authors: e.authors.map((a) => ({
      last: a.family || a.literal || "",
      first: a.given || "",
      initials: (a.given || "").split(/\s+/).map((s) => s[0]).filter(Boolean).join(""),
      full: a.literal || `${a.family || ""} ${a.given || ""}`.trim(),
      isKorean: /[가-힣]/.test(a.family || a.literal || ""),
    })),
    year: e.year || "",
    title: e.title || "",
    journal: e.containerTitle || "",
    volume: e.volume || "",
    issue: e.issue || "",
    pages: e.pages || "",
    doi: e.doi || "",
    url: e.url || "",
    publisher: e.publisher || "",
    source: e.containerTitle || e.publisher || "",
    cited: false,
  };
}

export function APAAutomationSystem({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { generate, loading } = useGemini();
  const [menu, setMenu] = useState<Menu>("dashboard");
  const [style, setStyle] = useState<StyleId>("apa7");
  const [entries, setEntries] = useState<CKGEntry[]>([]);

  // builder
  const [draft, setDraft] = useState<CKGEntry>(() => emptyEntry("journal-article"));
  const [authorText, setAuthorText] = useState("");
  const [editorText, setEditorText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [famKey, setFamKey] = useState("periodical");

  // intext
  const [itEntryId, setItEntryId] = useState<string>("");
  const [itKind, setItKind] = useState<InTextKind>("parenthetical");
  const [itPage, setItPage] = useState("");

  // transform
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  // ai
  const [aiMode, setAiMode] = useState<"structure" | "detect" | "explain" | "complete">("structure");
  const [aiInput, setAiInput] = useState("");
  const [aiOut, setAiOut] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  // knowledge search
  const [kbQuery, setKbQuery] = useState("");
  const [toast, setToast] = useState("");

  /* 영속화 */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    } catch {
      /* ignore */
    }
  }, [entries]);

  const styledEntries = useMemo(() => applyEdgeCases(entries), [entries]);
  const listReport = useMemo(() => validateList(styledEntries), [styledEntries]);

  // 빌더 미리보기(엣지케이스 suffix 반영)
  const previewEntry = useMemo(() => {
    const e: CKGEntry = {
      ...draft,
      authors: parseAuthors(authorText),
      editors: editorText ? parseAuthors(editorText) : undefined,
    };
    const withSuffix = applyEdgeCases([...entries.filter((x) => x.id !== e.id), e]).find((x) => x.id === e.id);
    return withSuffix || e;
  }, [draft, authorText, editorText, entries]);

  const preview = useMemo(() => renderReference(previewEntry, style), [previewEntry, style]);
  const draftIssues = useMemo(() => validateEntry(previewEntry), [previewEntry]);

  // graph aggregates (반드시 early-return 이전에 선언 — Rules of Hooks)
  const graph = useMemo(() => {
    const authors: Record<string, number> = {};
    const journals: Record<string, number> = {};
    const types: Record<string, number> = {};
    for (const e of entries) {
      e.authors.forEach((a) => {
        const k = a.literal || a.family || "";
        if (k) authors[k] = (authors[k] || 0) + 1;
      });
      if (e.containerTitle) journals[e.containerTitle] = (journals[e.containerTitle] || 0) + 1;
      const fl = typeByCode(e.type)?.family || e.type;
      types[fl] = (types[fl] || 0) + 1;
    }
    const top = (o: Record<string, number>) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { authors: top(authors), journals: top(journals), types: top(types) };
  }, [entries]);

  if (!open) return null;

  const copy = (s: string) => {
    navigator.clipboard?.writeText(s.replace(/\*/g, "")).catch(() => {});
    flash("복사되었습니다");
  };
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1600);
  };

  const pickType = (code: string) => {
    setDraft((d) => ({ ...emptyEntry(code), id: d.id, year: d.year, title: d.title }));
  };

  const resetDraft = () => {
    setDraft(emptyEntry(typeByCode(draft.type)?.code || "journal-article"));
    setAuthorText("");
    setEditorText("");
    setEditingId(null);
  };

  const addOrUpdate = () => {
    const e: CKGEntry = {
      ...draft,
      id: editingId || draft.id || rid(),
      authors: parseAuthors(authorText),
      editors: editorText ? parseAuthors(editorText) : undefined,
    };
    if (!e.title && !e.authors.length) {
      flash("제목 또는 저자를 입력하세요");
      return;
    }
    setEntries((prev) => {
      const exists = prev.some((x) => x.id === e.id);
      return exists ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e];
    });
    flash(editingId ? "수정되었습니다" : "리스트에 추가되었습니다");
    resetDraft();
  };

  const editEntry = (e: CKGEntry) => {
    setMenu("builder");
    setFamKey(typeByCode(e.type)?.family || "periodical");
    setDraft({ ...e });
    setAuthorText(authorsToText(e.authors));
    setEditorText(authorsToText(e.editors || []));
    setEditingId(e.id);
  };

  const removeEntry = (id: string) => setEntries((p) => p.filter((x) => x.id !== id));

  const repair = (id: string, fix: string) =>
    setEntries((p) => p.map((x) => (x.id === id ? autoRepair(x, fix) : x)));

  const exportToReferences = () => {
    try {
      const existing = loadRefDB();
      const converted = styledEntries
        .filter((e) => typeByCode(e.type)?.family !== "personal")
        .map(ckgToRefEntry);
      saveRefDB([...existing, ...converted]);
      window.dispatchEvent(new Event("storage"));
      flash(`참고문헌 정리 리스트에 ${converted.length}건 전송`);
    } catch {
      flash("전송 실패");
    }
  };

  const runImport = () => {
    const e = parseImport(importText);
    if (!e) {
      setImportMsg("DOI / RIS / BibTeX / CSL-JSON 형식을 인식하지 못했습니다.");
      return;
    }
    setImportMsg("");
    setMenu("builder");
    setFamKey(typeByCode(e.type)?.family || "periodical");
    setDraft(e);
    setAuthorText(authorsToText(e.authors));
    setEditorText(authorsToText(e.editors || []));
    setEditingId(null);
    flash("변환 완료 — 빌더에서 확인 후 추가하세요");
  };

  /* ── AI 도우미 ── */
  const runAI = async () => {
    if (!aiInput.trim()) return;
    setAiBusy(true);
    setAiOut("");
    try {
      if (aiMode === "structure") {
        const sys =
          "You convert a source description into a strict JSON object for an APA citation engine. " +
          "Output ONLY minified JSON, no markdown. Keys: type (one of: " +
          ALL_TYPES.map((t) => t.code).join(", ") +
          "), authors (array of {family,given} or {literal}), year, date, title, containerTitle, publisher, volume, issue, pages, doi, url, version, institution. Omit unknown keys.";
        const out = await generate({
          systemInstruction: sys,
          userText: aiInput,
          temperature: 0.2,
          maxOutputTokens: 1024,
        });
        const json = out.replace(/```json|```/g, "").trim();
        const obj = JSON.parse(json);
        const e: CKGEntry = {
          ...emptyEntry(typeByCode(obj.type)?.code || "journal-article"),
          ...obj,
          id: rid(),
          authors: Array.isArray(obj.authors) ? obj.authors : [],
        };
        setMenu("builder");
        setFamKey(typeByCode(e.type)?.family || "periodical");
        setDraft(e);
        setAuthorText(authorsToText(e.authors));
        setEditorText(authorsToText(e.editors || []));
        setEditingId(null);
        flash("AI가 구조화했습니다 — 확인 후 추가");
        setAiBusy(false);
        return;
      }
      if (aiMode === "detect") {
        const guess = detectType(aiInput);
        const label = typeByCode(guess)?.label || guess;
        const out = await generate({
          systemInstruction:
            "You are an APA 7 expert. Given a URL/DOI/description, state the most likely APA reference type and why, in Korean, 2-3 sentences.",
          userText: aiInput,
          temperature: 0.3,
          maxOutputTokens: 512,
        });
        setAiOut(`휴리스틱 추정: ${label} (${guess})\n\n${out}`);
      } else if (aiMode === "explain") {
        const out = await generate({
          systemInstruction:
            "You are an APA 7 tutor. The user pastes a reference. Point out APA 7 errors and give the corrected version. Respond in Korean.",
          userText: aiInput,
          temperature: 0.3,
          maxOutputTokens: 1024,
        });
        setAiOut(out);
      } else {
        const out = await generate({
          systemInstruction:
            "You are an APA 7 citation assistant. The user gives partial reference info. Suggest the likely missing fields (publisher, DOI pattern, year, journal) and produce a best-effort APA 7 reference. Respond in Korean, and include the final reference on its own line.",
          userText: aiInput,
          temperature: 0.4,
          maxOutputTokens: 1024,
        });
        setAiOut(out);
      }
    } catch (e: any) {
      setAiOut(
        e?.message === "API_KEY_MISSING"
          ? "Gemini API 키가 필요합니다. 설정에서 키를 입력하세요."
          : "AI 처리 중 오류가 발생했거나 JSON 파싱에 실패했습니다. 입력을 더 구체적으로 작성해 보세요."
      );
    }
    setAiBusy(false);
  };

  const fields = profileFor(draft.type);
  const fam = FAMILIES.find((f) => f.key === famKey) || FAMILIES[0];
  const kbResults = APA_RULES.filter(
    (r) =>
      !kbQuery.trim() ||
      (r.title + r.desc + r.id + (r.example || "")).toLowerCase().includes(kbQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch md:items-center justify-center bg-black/70 md:p-6" onClick={onClose}>
      <div
        className="w-full md:max-w-[1180px] h-[100dvh] md:h-[88vh] rounded-none md:rounded-[18px] bg-[#0e1118] md:border border-white/[0.08] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`.apa-noscroll::-webkit-scrollbar{display:none}.apa-noscroll{-ms-overflow-style:none;scrollbar-width:none}`}</style>
        {/* header */}
        <div className="flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 md:py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#9db0ff] flex-shrink-0">📚</span>
            <h2 className="text-[15px] md:text-[16px] font-semibold text-[#e8eaf0] truncate">APA 인용 자동화 시스템</h2>
            <span className="hidden lg:inline text-[11px] text-white/30 font-mono flex-shrink-0">Citation Knowledge Graph</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as StyleId)}
              className="px-2 md:px-2.5 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.08] text-white/75 text-[12px]"
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button onClick={onClose} aria-label="닫기" className="px-2.5 md:px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] text-[14px] flex-shrink-0">
              <span className="hidden sm:inline">닫기 </span>✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* nav — 데스크톱: 좌측 세로 레일 */}
          <nav className="hidden md:block w-[186px] flex-shrink-0 border-r border-white/[0.06] p-2 overflow-y-auto">
            {MENUS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMenu(m.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13.5px] mb-0.5 text-left transition-colors ${
                  menu === m.key ? "bg-[#6c8cff]/15 text-[#bcc8ff]" : "text-white/55 hover:bg-white/[0.05]"
                }`}
              >
                <span className="w-4 text-center">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </nav>

          {/* main column */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* nav — 모바일: 가로 스크롤 탭 스트립 (앱형) */}
            <div className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/[0.06] apa-noscroll">
              {MENUS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMenu(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap flex-shrink-0 transition-colors ${
                    menu === m.key ? "bg-[#6c8cff]/20 text-[#bcc8ff]" : "bg-white/[0.04] text-white/55"
                  }`}
                >
                  <span>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* content */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-5 relative">
            {toast && (
              <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-[#5ebd7c]/15 text-[#7fe0a0] text-[12px] border border-[#5ebd7c]/30">
                {toast}
              </div>
            )}

            {/* ── Dashboard ── */}
            {menu === "dashboard" && (
              <div className="space-y-4 text-[14px] text-white/70">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">대시보드</h3>
                <p className="text-white/45 text-[13px]">
                  APA 7판 Citation Knowledge Graph — 15개 패밀리 · {ALL_TYPES.length}개 유형 · 8개 스타일 ·
                  본문인용/검증/변환/AI 도우미를 한 곳에서 실행합니다.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["참고문헌", String(entries.length)],
                    ["APA 컴플라이언스", `${listReport.score}%`],
                    ["지원 유형", String(ALL_TYPES.length)],
                    ["중복 감지", String(listReport.duplicates.length)],
                  ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                      <div className="text-[22px] font-bold text-[#e8eaf0]">{v}</div>
                      <div className="text-[12px] text-white/40">{k}</div>
                    </div>
                  ))}
                </div>
                {/* compliance bar */}
                <div>
                  <div className="flex justify-between text-[12px] text-white/40 mb-1">
                    <span>APA 컴플라이언스 점수</span>
                    <span>{listReport.score}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${listReport.score}%`,
                        background:
                          listReport.score >= 85
                            ? "linear-gradient(90deg,#3ecfb2,#5ebd7c)"
                            : listReport.score >= 60
                            ? "linear-gradient(90deg,#e8b84b,#f0c674)"
                            : "linear-gradient(90deg,#ff7066,#e8b84b)",
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => setMenu("builder")} className="px-4 py-2 rounded-lg bg-[#6c8cff]/15 text-[#bcc8ff] text-[13px]">빠른 생성 →</button>
                  <button onClick={() => setMenu("transform")} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">DOI/RIS 가져오기 →</button>
                  <button onClick={() => setMenu("ai")} className="px-4 py-2 rounded-lg bg-[#a78bfa]/15 text-[#c9b8ff] text-[13px]">🤖 자연어로 인용 만들기 →</button>
                  <button onClick={() => setMenu("validate")} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">전체 검증 →</button>
                </div>
                {/* recent */}
                {styledEntries.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[12px] text-white/35 mb-1.5">최근 참고문헌</div>
                    <ol className="space-y-1.5 list-decimal list-inside text-[13px] text-white/70">
                      {styledEntries.slice(-4).reverse().map((e) => (
                        <li key={e.id} className="leading-relaxed"><RichText text={renderReference(e, style)} /></li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* ── Builder ── */}
            {menu === "builder" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-semibold text-[#e8eaf0]">참고문헌 빌더</h3>
                  {editingId && <span className="text-[12px] text-[#e8b84b]">편집 중 · {editingId}</span>}
                </div>

                {/* family tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {FAMILIES.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setFamKey(f.key);
                        pickType(f.types[0].code);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] border ${
                        famKey === f.key ? "bg-[#6c8cff]/15 border-[#6c8cff]/40 text-[#bcc8ff]" : "border-white/[0.08] text-white/55"
                      }`}
                    >
                      {f.icon} {f.label}
                    </button>
                  ))}
                </div>
                {/* type chips within family */}
                <div className="flex flex-wrap gap-1.5">
                  {fam.types.map((t) => (
                    <button
                      key={t.code}
                      onClick={() => pickType(t.code)}
                      className={`px-2.5 py-1 rounded-md text-[12px] ${
                        draft.type === t.code ? "bg-[#a78bfa]/20 text-[#c9b8ff]" : "bg-white/[0.04] text-white/50 hover:text-white/75"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* dynamic fields */}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {fields.map((fd) => {
                    const isAuthorField = fd.kind === "authors";
                    const isEditor = fd.key === "editors";
                    const val = isAuthorField
                      ? isEditor
                        ? editorText
                        : authorText
                      : (draft as any)[fd.key] || "";
                    const onCh = (v: string) => {
                      if (isAuthorField) {
                        isEditor ? setEditorText(v) : setAuthorText(v);
                      } else {
                        setDraft((d) => ({ ...d, [fd.key]: v }));
                      }
                    };
                    return (
                      <label key={String(fd.key)} className={`block ${isAuthorField || fd.kind === "textarea" ? "sm:col-span-2" : ""}`}>
                        <span className="text-[12px] text-white/40">
                          {fd.label}
                          {fd.required && <span className="text-[#ff7066]"> *</span>}
                          {fd.hint && <span className="text-white/25"> · {fd.hint}</span>}
                        </span>
                        {isAuthorField || fd.kind === "textarea" ? (
                          <textarea
                            value={val}
                            onChange={(e) => onCh(e.target.value)}
                            rows={2}
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[13px] text-white/85 resize-y"
                          />
                        ) : (
                          <input
                            value={val}
                            onChange={(e) => onCh(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[13px] text-white/85"
                          />
                        )}
                      </label>
                    );
                  })}
                  <label className="flex items-center gap-2 text-[12px] text-white/45">
                    <input type="checkbox" checked={!!draft.retracted} onChange={(e) => setDraft((d) => ({ ...d, retracted: e.target.checked }))} />
                    철회됨(Retracted)
                  </label>
                </div>

                {/* live preview */}
                <div className="p-3 rounded-lg bg-[#0b0e14] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[11px] text-white/30">미리보기 · {STYLES.find((s) => s.id === style)?.label}</div>
                    <div className="text-[11px] text-white/30">본문: <span className="text-white/60">{buildInText(previewEntry, "parenthetical")}</span></div>
                  </div>
                  <div className="text-[14px] text-white/90 leading-relaxed"><RichText text={preview} /></div>
                </div>

                {/* draft issues */}
                {draftIssues.some((i) => i.level !== "ok") && (
                  <div className="flex flex-wrap gap-1.5">
                    {draftIssues.filter((i) => i.level !== "ok").map((i, idx) => (
                      <span key={idx} className={`text-[11.5px] px-2 py-1 rounded ${i.level === "error" ? "bg-[#ff7066]/10 text-[#ff7066]" : "bg-[#e8b84b]/10 text-[#e8b84b]"}`}>
                        {i.level === "error" ? "✕" : "⚠"} {i.msg}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={addOrUpdate} className="px-4 py-2 rounded-lg bg-[#5ebd7c]/15 text-[#5ebd7c] text-[13px] font-medium">
                    {editingId ? "수정 저장" : "리스트에 추가"}
                  </button>
                  <button onClick={() => copy(preview)} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">복사</button>
                  <button onClick={resetDraft} className="px-4 py-2 rounded-lg bg-white/[0.04] text-white/45 text-[13px]">초기화</button>
                </div>

                {/* list */}
                {styledEntries.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <div className="text-[12px] text-white/35">참고문헌 리스트 ({styledEntries.length})</div>
                    {styledEntries.map((e, i) => {
                      const iss = listReport.perEntry[e.id] || [];
                      const hasErr = iss.some((x) => x.level === "error");
                      const hasWarn = iss.some((x) => x.level === "warn");
                      return (
                        <div key={e.id} className="group flex items-start gap-2 px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.05]">
                          <span className="text-[12px] text-white/30 mt-0.5 w-5 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-white/80 leading-relaxed"><RichText text={renderReference(e, style)} /></div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10.5px] text-white/30">{typeByCode(e.type)?.label}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${hasErr ? "bg-[#ff7066]/15 text-[#ff7066]" : hasWarn ? "bg-[#e8b84b]/15 text-[#e8b84b]" : "bg-[#5ebd7c]/15 text-[#5ebd7c]"}`}>
                                {hasErr ? "오류" : hasWarn ? "경고" : "정상"}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                            <button onClick={() => editEntry(e)} className="text-[11px] px-2 py-1 rounded bg-white/[0.05] text-white/60">편집</button>
                            <button onClick={() => removeEntry(e.id)} className="text-[11px] px-2 py-1 rounded bg-[#ff7066]/10 text-[#ff7066]">삭제</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── In-Text ── */}
            {menu === "intext" && (
              <div className="space-y-4">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">본문 인용 생성</h3>
                <p className="text-[12px] text-white/40">리스트에서 문헌을 선택하면 저자 수·동저자동년도(a/b/c)·단체저자·무저자 규칙이 자동 적용됩니다.</p>
                <select
                  value={itEntryId}
                  onChange={(e) => setItEntryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[13px] text-white/85"
                >
                  <option value="">— 문헌 선택 —</option>
                  {styledEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {(e.authors[0]?.literal || e.authors[0]?.family || "무저자")} ({e.year || "n.d."}) · {e.title?.slice(0, 30)}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {([["narrative", "서술인용"], ["parenthetical", "괄호인용"], ["direct", "직접인용"], ["block", "블록인용"]] as [InTextKind, string][]).map(([k, label]) => (
                    <button key={k} onClick={() => setItKind(k)} className={`px-3 py-1.5 rounded-lg text-[12.5px] border ${itKind === k ? "bg-[#6c8cff]/15 border-[#6c8cff]/40 text-[#bcc8ff]" : "border-white/[0.08] text-white/55"}`}>
                      {label}
                    </button>
                  ))}
                  {(itKind === "direct" || itKind === "block") && (
                    <input value={itPage} onChange={(e) => setItPage(e.target.value)} placeholder="쪽수" className="px-3 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.08] text-[12.5px] text-white/85 w-24" />
                  )}
                </div>
                {(() => {
                  const e = styledEntries.find((x) => x.id === itEntryId);
                  const text = e ? buildInText(e, itKind, itPage) : "문헌을 선택하세요.";
                  return (
                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-white/[0.06] flex items-center justify-between gap-3">
                      <span className="text-[15px] text-white/90">{text}</span>
                      {e && <button onClick={() => copy(text)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 text-[12px] flex-shrink-0">복사</button>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Validate ── */}
            {menu === "validate" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-semibold text-[#e8eaf0]">검증 · 자동수정</h3>
                  <span className={`text-[13px] font-semibold ${listReport.score >= 85 ? "text-[#5ebd7c]" : listReport.score >= 60 ? "text-[#e8b84b]" : "text-[#ff7066]"}`}>
                    컴플라이언스 {listReport.score}%
                  </span>
                </div>
                {listReport.duplicates.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-[#e8b84b]/10 text-[#e8b84b] text-[13px] border border-[#e8b84b]/20">
                    ⚠ 중복 의심 {listReport.duplicates.length}쌍 (제목+연도 동일)
                  </div>
                )}
                {styledEntries.length === 0 && <p className="text-[13px] text-white/40">빌더에서 문헌을 추가하면 전체 검증이 실행됩니다.</p>}
                {styledEntries.map((e) => {
                  const iss = listReport.perEntry[e.id] || [];
                  return (
                    <div key={e.id} className="px-3 py-2.5 rounded-lg bg-[#13161e] border border-white/[0.05]">
                      <div className="text-[13px] text-white/80 mb-1.5 leading-relaxed"><RichText text={renderReference(e, style)} /></div>
                      <div className="space-y-1">
                        {iss.map((i, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className={`text-[12px] ${i.level === "error" ? "text-[#ff7066]" : i.level === "warn" ? "text-[#e8b84b]" : "text-[#5ebd7c]"}`}>
                              {i.level === "error" ? "✕" : i.level === "warn" ? "⚠" : "✓"} {i.msg}
                            </span>
                            {i.fix && (
                              <button onClick={() => repair(e.id, i.fix!)} className="text-[11px] px-2 py-0.5 rounded bg-[#6c8cff]/15 text-[#bcc8ff] flex-shrink-0">자동수정</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Transform ── */}
            {menu === "transform" && (
              <div className="space-y-3">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">변환 · 가져오기</h3>
                <p className="text-[12px] text-white/40">DOI · RIS · BibTeX · CSL-JSON 을 붙여넣으면 자동 유형판별 후 빌더로 변환됩니다.</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={7}
                  placeholder={'10.1000/12345\n\n또는\n\nTY  - JOUR\nAU  - Smith, J.\nPY  - 2024\nTI  - ...\n\n또는\n\n@article{key, author={...}, title={...}, year={2024}}'}
                  className="w-full px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[12px] font-mono text-white/85"
                />
                <div className="flex items-center gap-2">
                  <button onClick={runImport} className="px-4 py-2 rounded-lg bg-[#6c8cff]/15 text-[#bcc8ff] text-[13px] font-medium">변환 → 빌더 채우기</button>
                  {importMsg && <span className="text-[12px] text-[#ff7066]">{importMsg}</span>}
                </div>
              </div>
            )}

            {/* ── Export ── */}
            {menu === "export" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-semibold text-[#e8eaf0]">내보내기</h3>
                  <span className="text-[12px] text-white/40">스타일: {STYLES.find((s) => s.id === style)?.label}</span>
                </div>
                {styledEntries.length === 0 ? (
                  <p className="text-[13px] text-white/40">먼저 빌더에서 문헌을 추가하세요.</p>
                ) : (
                  <>
                    <div className="p-3 rounded-lg bg-[#0b0e14] border border-white/[0.06] space-y-2 max-h-[40vh] overflow-y-auto">
                      {styledEntries.map((e, i) => (
                        <div key={e.id} className="text-[13px] text-white/85 leading-relaxed">
                          {i + 1}. <RichText text={renderReference(e, style)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copy(styledEntries.map((e, i) => `${i + 1}. ${renderReference(e, style)}`).join("\n"))} className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">목록 복사</button>
                      <button onClick={() => download(styledEntries.map((e, i) => `${i + 1}. ${renderReference(e, style).replace(/\*/g, "")}`).join("\n"), "references.txt", "text/plain")} className="px-3 py-2 rounded-lg bg-[#6c8cff]/15 text-[#bcc8ff] text-[13px]">.txt</button>
                      <button onClick={() => download(toCSLJSON(styledEntries), "references.json", "application/json")} className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">CSL-JSON</button>
                      <button onClick={() => download(toBibTeX(styledEntries), "references.bib", "text/plain")} className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">.bib</button>
                      <button onClick={() => download(toRIS(styledEntries), "references.ris", "text/plain")} className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 text-[13px]">.ris</button>
                      <button onClick={exportToReferences} className="px-3 py-2 rounded-lg bg-[#5ebd7c]/15 text-[#5ebd7c] text-[13px]">참고문헌 정리에 전송</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── AI ── */}
            {menu === "ai" && (
              <div className="space-y-3">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">AI 도우미</h3>
                <div className="flex flex-wrap gap-1.5">
                  {([["structure", "자연어 → 구조화"], ["detect", "유형 자동판별"], ["explain", "오류 설명·교정"], ["complete", "누락정보 보완"]] as [typeof aiMode, string][]).map(([k, label]) => (
                    <button key={k} onClick={() => { setAiMode(k); setAiOut(""); }} className={`px-3 py-1.5 rounded-lg text-[12.5px] border ${aiMode === k ? "bg-[#a78bfa]/15 border-[#a78bfa]/40 text-[#c9b8ff]" : "border-white/[0.08] text-white/55"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  rows={4}
                  placeholder={
                    aiMode === "structure"
                      ? "예: 김민수와 이지영이 2025년 AI Research Journal 12권 3호 101-122쪽에 쓴 '생성형 AI와 창의성' 논문, DOI 10.1000/xyz"
                      : aiMode === "detect"
                      ? "URL 또는 DOI 또는 출처 설명을 입력하세요."
                      : "검사·교정할 참고문헌 한 건을 붙여넣으세요."
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[13px] text-white/85"
                />
                <button onClick={runAI} disabled={aiBusy || loading} className="px-4 py-2 rounded-lg bg-[#a78bfa]/20 text-[#c9b8ff] text-[13px] font-medium disabled:opacity-40">
                  {aiBusy || loading ? "처리 중…" : "🤖 실행"}
                </button>
                {aiOut && (
                  <div className="p-3 rounded-lg bg-[#0b0e14] border border-white/[0.06] text-[13px] text-white/80 whitespace-pre-wrap leading-relaxed">{aiOut}</div>
                )}
                <p className="text-[11px] text-white/25">※ Gemini 연결이 필요합니다(설정에서 API 키). 모든 AI 호출은 상단 진행바와 연동됩니다.</p>
              </div>
            )}

            {/* ── Knowledge Graph ── */}
            {menu === "graph" && (
              <div className="space-y-4 text-[13px] text-white/70">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">지식그래프</h3>
                <p className="text-white/40 text-[12px]">현재 리스트에서 추출한 저자·학술지·유형 분포(상위 8).</p>
                {entries.length === 0 ? (
                  <p className="text-white/40">문헌을 추가하면 관계 그래프가 생성됩니다.</p>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-3">
                    {([["저자", graph.authors], ["학술지/매체", graph.journals], ["유형(패밀리)", graph.types]] as [string, [string, number][]][]).map(([label, rows]) => (
                      <div key={label} className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                        <div className="text-[12px] text-white/40 mb-2">{label}</div>
                        <div className="space-y-1.5">
                          {rows.length === 0 && <div className="text-white/25 text-[12px]">—</div>}
                          {rows.map(([k, n]) => (
                            <div key={k} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] text-white/75 truncate">{label.startsWith("유형") ? (FAMILIES.find((f) => f.key === k)?.label || k) : k}</div>
                                <div className="h-1.5 rounded-full bg-white/[0.06] mt-0.5 overflow-hidden">
                                  <div className="h-full bg-[#6c8cff] rounded-full" style={{ width: `${Math.min(100, n * 30)}%` }} />
                                </div>
                              </div>
                              <span className="text-[11px] text-white/35">{n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Taxonomy ── */}
            {menu === "taxonomy" && (
              <div className="space-y-3 text-[13px] text-white/70">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">분류체계 · 메타데이터</h3>
                <p className="text-white/40 text-[12px]">Reference Taxonomy (15 families / {ALL_TYPES.length} types) 와 Metadata Profile.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {FAMILIES.map((f) => (
                    <div key={f.key} className="p-3 rounded-xl bg-[#13161e] border border-white/[0.05]">
                      <div className="text-[13px] text-white/85 mb-1">{f.icon} {f.label}</div>
                      <div className="flex flex-wrap gap-1">
                        {f.types.map((t) => (
                          <span key={t.code} className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/45">{t.label}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 text-[12px] text-white/35">메타데이터 프로파일: {Object.keys(PROFILES).length}종 · 필드 52개 마스터 모델 기반</div>
              </div>
            )}

            {/* ── Knowledge Base ── */}
            {menu === "knowledge" && (
              <div className="space-y-3 text-[13px] text-white/70">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">APA 지식베이스 (Rule DB)</h3>
                <input value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="규칙 검색 (예: 저자, 직접인용, DOI, n.d.)" className="w-full px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.08] text-[13px] text-white/85" />
                <div className="space-y-1.5">
                  {kbResults.map((r) => (
                    <div key={r.id} className="px-3 py-2 rounded-lg bg-[#13161e] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10.5px] font-mono text-[#6c8cff]">{r.id}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40">{r.category}</span>
                        <b className="text-[13px] text-white/85">{r.title}</b>
                      </div>
                      <div className="text-[12.5px] text-white/55">{r.desc}</div>
                      {r.example && <div className="text-[12px] text-[#7fe0a0] mt-0.5 font-mono">{r.example}</div>}
                    </div>
                  ))}
                  {kbResults.length === 0 && <p className="text-white/35">일치하는 규칙이 없습니다.</p>}
                </div>
              </div>
            )}

            {/* ── Settings ── */}
            {menu === "settings" && (
              <div className="space-y-3 text-[13px] text-white/70">
                <h3 className="text-[18px] font-semibold text-[#e8eaf0]">설정</h3>
                <label className="flex items-center gap-3">
                  <span className="text-white/50 w-24">기본 스타일</span>
                  <select value={style} onChange={(e) => setStyle(e.target.value as StyleId)} className="px-3 py-1.5 rounded-lg bg-[#13161e] border border-white/[0.08] text-white/80">
                    {STYLES.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={exportToReferences} className="px-4 py-2 rounded-lg bg-[#5ebd7c]/15 text-[#5ebd7c] text-[13px]">참고문헌 정리 리스트로 전송</button>
                  <button onClick={() => { if (confirm("모든 참고문헌을 삭제할까요?")) setEntries([]); }} className="px-4 py-2 rounded-lg bg-[#ff7066]/10 text-[#ff7066] text-[13px]">전체 비우기</button>
                </div>
                <p className="text-[11px] text-white/25">리스트는 이 브라우저에 자동 저장됩니다(localStorage). 약 {ALL_TYPES.length}개 유형 · {APA_RULES.length}개 규칙 · 8개 스타일 지원.</p>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function download(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
