"use client";
import { Icon } from "@/components/ui/icon";
import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useGemini } from "@/hooks/use-gemini";
import { usePagePersistence } from "@/hooks/use-page-persistence";
import { useTranslation } from "@/lib/i18n";
import CitationManager from "@/components/citation/citation-manager";
import PageSaveRegistration from "@/components/save/page-save-bar";
import {
  toCanonicalCitation,
  computeConfidenceScore,
  type CanonicalCitation,
} from "@ai-research-os/citation-core";

const LIT_TABS = [
  { id: "search", icon: "🔍", label: "논문 검색" },
  { id: "reading", icon: "📖", label: "읽기 공간" },
  { id: "matrix", icon: "📊", label: "문헌 매트릭스" },
  { id: "citation", icon: "📎", label: "인용 관리" },
  { id: "gap", icon: "🔬", label: "갭 분석" },
  { id: "collections", icon: "📁", label: "컬렉션" },
];

interface ReferenceItem {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi: string;
  url: string;
  keywords: string[];
  abstract: string;
  note: string; // user editable note
  region: "domestic" | "international";
}

interface LitDraft {
  tab: string;
  references: ReferenceItem[];
  gapResult: string;
  userNotes: string;
}

export default function LiteraturePage() {
  const { t, locale } = useTranslation();
  const [tab, setTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [gapResult, setGapResult] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [searchRegion, setSearchRegion] = useState<"domestic" | "international">("domestic");
  const { generate, loading: aiLoading } = useGemini();

  // Persistence
  const getData = useCallback(
    (): LitDraft => ({ tab, references, gapResult, userNotes }),
    [tab, references, gapResult, userNotes]
  );
  const handleLoad = useCallback((data: unknown) => {
    const d = data as LitDraft;
    if (d.tab) setTab(d.tab);
    if (d.references) setReferences(d.references);
    if (d.gapResult) setGapResult(d.gapResult);
    if (d.userNotes !== undefined) setUserNotes(d.userNotes);
  }, []);
  const handleReset = useCallback(() => {
    setTab("search");
    setReferences([]);
    setGapResult("");
    setUserNotes("");
  }, []);
  usePagePersistence("literature", handleLoad, handleReset);

  // Search via the same scholar API used by literature-review
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/scholar?q=${encodeURIComponent(searchQuery)}&region=${searchRegion}&limit=20`);
      const data = await res.json();
      const results: ReferenceItem[] = (data.results ?? []).map((r: any) => ({
        id: r.id ?? crypto.randomUUID(),
        title: r.title ?? "",
        authors: r.authors ?? "",
        year: r.year ?? 0,
        journal: r.journal ?? "",
        doi: r.doi ?? "",
        url: r.url ?? "",
        keywords: r.keywords ?? [],
        abstract: r.abstract ?? "",
        note: "",
        region: searchRegion,
      }));
      setReferences((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = results.filter((r) => !existingIds.has(r.id));
        return [...prev, ...newItems];
      });
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  };

  // Run gap analysis on collected references
  const runGapAnalysis = async () => {
    if (references.length === 0) return;
    const langInstruction = locale === "ko" ? "반드시 한국어로 응답하세요." : locale === "zh" ? "请用中文回答。" : "";
    const result = await generate({
      systemInstruction: `You are a research gap analysis expert. Analyze the provided paper metadata and identify well-studied areas, under-explored intersections, methodological gaps, and specific research gap recommendations. ${langInstruction}`,
      userText: `Analyze research gaps from these ${references.length} papers:\n\n${references.slice(0, 20).map((p, i) =>
        `[${i + 1}] "${p.title}" (${p.year}) - ${p.journal}\nAuthors: ${p.authors}\nKeywords: ${p.keywords.join(", ")}`
      ).join("\n\n")}`,
      temperature: 0.5,
      maxOutputTokens: 8192,
    });
    setGapResult(result);
    setTab("gap");
  };

  // Update note for a reference
  const updateNote = (id: string, note: string) => {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, note } : r)));
  };

  // Remove reference
  const removeRef = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  // ── v25: ReferenceItem ↔ CanonicalCitation 변환 (인용 관리 탭 연동) ──
  const refToCanonical = useCallback((r: ReferenceItem): CanonicalCitation => {
    const authors = (r.authors || "")
      .split(/[,;&]|\band\b/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        const parts = name.split(/\s+/);
        const family = parts.pop() || name;
        const given = parts.join(" ");
        return { given, family, fullName: name };
      });
    const partial: Partial<CanonicalCitation> = {
      id: r.id,
      type: "journal-article",
      title: r.title,
      authors,
      journal: r.journal,
      year: r.year,
      doi: r.doi || undefined,
      url: r.url || undefined,
      abstract: r.abstract,
      keywords: r.keywords || [],
      metadataSource: r.doi ? "crossref" : "parsed",
      doiVerified: !!r.doi,
      crossrefMatched: !!r.doi,
    };
    const c = toCanonicalCitation(partial, r.id);
    c.confidence = computeConfidenceScore(c).total;
    return c;
  }, []);

  const canonicalToRef = useCallback((c: CanonicalCitation): ReferenceItem => ({
    id: c.id,
    title: c.title,
    authors: c.authors.map((a) => a.fullName || `${a.given} ${a.family}`.trim()).join(", "),
    year: c.year,
    journal: c.journal || "",
    doi: c.doi || "",
    url: c.url || (c.doi ? `https://doi.org/${c.doi}` : ""),
    keywords: c.keywords || [],
    abstract: c.abstract || "",
    note: "",
    region: "international",
  }), []);

  // 인용 관리에서 사용할 CanonicalCitation 리스트 (references와 동기화)
  const canonicalCitations = useMemo(
    () => references.map(refToCanonical),
    [references, refToCanonical]
  );

  // CitationManager에서 새 인용 추가 → references에 반영
  const addCitation = useCallback((c: CanonicalCitation) => {
    const ref = canonicalToRef(c);
    setReferences((prev) => {
      // DOI 또는 id 중복 방지
      const dup = prev.some(
        (r) => (ref.doi && r.doi === ref.doi) || r.id === ref.id
      );
      if (dup) return prev;
      return [...prev, ref];
    });
  }, [canonicalToRef]);

  const domesticRefs = references.filter((r) => r.region === "domestic");
  const intlRefs = references.filter((r) => r.region === "international");

  return (
    <div className="flex flex-col font-nanum-gothic">
      <PageSaveRegistration pageId="literature" getData={getData} />
      {/* 상단 탭 */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[#13161e] border-b border-white/[0.04] overflow-x-auto scrollbar-none">
        {LIT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[15px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
              tab === t.id ? "bg-[#1e2230] text-white" : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
            }`}
          >
            <Icon name={t.icon} className="inline-flex align-[-0.125em]" size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto p-4 md:p-5 lg:px-6 lg:py-6">
        <div className="max-w-[1680px] mx-auto">
          {tab === "search" && (
            <div>
              <h2 className="text-[21px] font-bold font-nanum-myeongjo mb-4">논문 검색 & 탐색</h2>
              <div className="flex gap-3 mb-4">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1 px-4 py-3 bg-[#13161e] border border-white/[0.06] rounded-xl text-[16px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#3ecfb2]"
                  placeholder="키워드, DOI, 논문 제목으로 검색..."
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="px-5 py-3 bg-[#3ecfb2]/15 border border-[#3ecfb2]/30 text-[#3ecfb2] rounded-xl text-[16px] font-medium hover:bg-[#3ecfb2]/25 transition-all disabled:opacity-40"
                >
                  {searchLoading ? "검색 중..." : "검색"}
                </button>
              </div>

              {/* Region toggle */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setSearchRegion("domestic")}
                  className={`px-3 py-1.5 rounded-lg text-[15px] transition-all ${
                    searchRegion === "domestic" ? "bg-[#6c8cff]/15 text-[#6c8cff] border border-[#6c8cff]/30" : "text-white/30 border border-transparent"
                  }`}
                >
                  <Icon name="flag" size={14} className="inline-flex align-[-0.125em] mr-1" /> 국내
                </button>
                <button
                  onClick={() => setSearchRegion("international")}
                  className={`px-3 py-1.5 rounded-lg text-[15px] transition-all ${
                    searchRegion === "international" ? "bg-[#3ecfb2]/15 text-[#3ecfb2] border border-[#3ecfb2]/30" : "text-white/30 border border-transparent"
                  }`}
                >
                  <Icon name="🌐" className="inline-flex align-[-0.125em] mr-1" size={15} />해외
                </button>
                <div className="ml-auto">
                  <span className="text-[13px] text-white/20">수집된 논문: {references.length}편</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                {/* 검색 결과 → 참고문헌 리스트 */}
                <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] min-h-[300px]">
                  <p className="text-[16px] text-white/25 mb-3">검색 결과 / 참고문헌 리스트</p>
                  {references.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[14px]">
                        <thead>
                          <tr className="text-white/30 border-b border-white/[0.06]">
                            <th className="text-left py-2 px-2 w-12">연도</th>
                            <th className="text-left py-2 px-2">제목</th>
                            <th className="text-left py-2 px-2 w-28">저자</th>
                            <th className="text-left py-2 px-2 w-28">출판사/저널</th>
                            <th className="text-left py-2 px-2 w-20">DOI</th>
                            <th className="text-left py-2 px-2 w-20">링크</th>
                            <th className="text-left py-2 px-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="text-white/50">
                          {references.map((ref) => (
                            <tr key={ref.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="py-2 px-2 text-white/40">{ref.year || "N/A"}</td>
                              <td className="py-2 px-2 text-white/70 max-w-[200px]">
                                <span className="line-clamp-2">{ref.title}</span>
                              </td>
                              <td className="py-2 px-2 text-white/40 truncate max-w-[120px]">{ref.authors}</td>
                              <td className="py-2 px-2 text-white/40 truncate max-w-[120px]">{ref.journal}</td>
                              <td className="py-2 px-2">
                                {ref.doi ? (
                                  <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener" className="text-[#a78bfa] hover:underline truncate block max-w-[80px]">
                                    {ref.doi.length > 15 ? ref.doi.slice(0, 15) + "…" : ref.doi}
                                  </a>
                                ) : "-"}
                              </td>
                              <td className="py-2 px-2">
                                {ref.url && ref.url !== "#" ? (
                                  <a href={ref.url} target="_blank" rel="noopener" className="text-[#3ecfb2] hover:underline text-[13px]">
                                    원문 →
                                  </a>
                                ) : "-"}
                              </td>
                              <td className="py-2 px-2">
                                <button onClick={() => removeRef(ref.id)} className="text-white/20 hover:text-[#ff7066] text-[13px]"><Icon name="✕" className="inline-flex align-[-0.125em] mr-1" size={15} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-white/15 text-[16px]">
                      키워드를 입력하여 논문을 검색하세요
                    </div>
                  )}
                </div>

                {/* Right panel */}
                <div className="space-y-4">
                  <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
                    <p className="text-[16px] font-semibold text-[#3ecfb2] mb-3"><Icon name="🤖" className="inline-flex align-[-0.125em] mr-1" size={15} />AI Literature Copilot</p>
                    <p className="text-[15px] text-white/35 mb-3">관련 논문 추천, 자동 요약, 연구 갭 분석</p>
                    <Link href="/literature-review" className="text-[14px] text-[#3ecfb2] hover:underline block mb-2">→ 상세 문헌연구 엔진</Link>
                    <button
                      onClick={runGapAnalysis}
                      disabled={aiLoading || references.length === 0}
                      className="w-full py-2 rounded-lg bg-[#ec4899]/15 text-[#ec4899] text-[15px] font-medium disabled:opacity-30 transition-all"
                    >
                      {aiLoading ? "분석 중..." : `갭 분석 실행 (${references.length}편)`}
                    </button>
                  </div>
                </div>
              </div>

              {/* v42: 문헌 분석 대시보드 — 검색 아래 빈 공간을 메트릭으로 채움 */}
              <div className="mt-5">
                <p className="text-[16px] font-semibold text-[#e8eaf0] mb-3 flex items-center gap-2"><Icon name="chart" size={17} /> 문헌 분석 대시보드</p>
                {(() => {
                  const refs = references;
                  const years = refs.map((r) => parseInt(String(r.year), 10)).filter((y) => !Number.isNaN(y));
                  const journals = new Set(refs.map((r) => (r.journal || "").trim()).filter(Boolean));
                  const authors = new Set(
                    refs.flatMap((r) => (r.authors || "").split(/[,;]/).map((a) => a.trim()).filter(Boolean))
                  );
                  const minY = years.length ? Math.min(...years) : 0;
                  const maxY = years.length ? Math.max(...years) : 0;
                  // 연도 분포 (최근 8구간)
                  const yearCounts = new Map<number, number>();
                  years.forEach((y) => yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1));
                  const yearBars = [...yearCounts.entries()].sort((a, b) => a[0] - b[0]).slice(-8);
                  const maxBar = Math.max(1, ...yearBars.map(([, c]) => c));
                  const stats = [
                    { label: "수집 논문", value: refs.length, color: "#3ecfb2" },
                    { label: "연도 범위", value: years.length ? `${minY}–${maxY}` : "—", color: "#6c8cff" },
                    { label: "고유 저널", value: journals.size || "—", color: "#a78bfa" },
                    { label: "고유 저자", value: authors.size || "—", color: "#e8b84b" },
                  ];
                  return (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        {stats.map((s) => (
                          <div key={s.label} className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.05]">
                            <p className="text-[24px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-[13px] text-white/35 mt-1.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3">
                        <div className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.05]">
                          <p className="text-[14px] font-semibold text-white/70 mb-3">연도별 분포</p>
                          {yearBars.length > 0 ? (
                            <div className="flex items-end gap-2 h-32">
                              {yearBars.map(([y, c]) => (
                                <div key={y} className="flex-1 flex flex-col items-center justify-end gap-1">
                                  <span className="text-[11px] text-white/40">{c}</span>
                                  <div className="w-full rounded-t-md bg-gradient-to-t from-[#3ecfb2]/40 to-[#3ecfb2] transition-all" style={{ height: `${(c / maxBar) * 100}%` }} />
                                  <span className="text-[10px] text-white/25">{y}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center text-white/15 text-[14px]">검색 후 연도 분포가 표시됩니다</div>
                          )}
                        </div>
                        <div className="p-4 rounded-[14px] bg-[#13161e] border border-white/[0.05]">
                          <p className="text-[14px] font-semibold text-white/70 mb-3">주요 저널</p>
                          {journals.size > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {[...journals].slice(0, 12).map((j) => (
                                <span key={j} className="text-[12px] px-2.5 py-1 rounded-full bg-[#a78bfa]/12 text-[#a78bfa]/90 truncate max-w-full">{j}</span>
                              ))}
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center text-white/15 text-[14px]">검색 후 저널 목록이 표시됩니다</div>
                          )}
                          <Link href="/literature-review" className="inline-flex items-center gap-1 mt-3 text-[13px] text-[#3ecfb2] hover:underline">
                            네트워크·군집 등 상세 분석 →
                          </Link>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {tab === "gap" && (
            <div>
              <h2 className="text-[21px] font-bold font-nanum-myeongjo mb-4"><Icon name="🔬" className="inline-flex align-[-0.125em] mr-1" size={15} />연구갭 분석 결과</h2>
              {gapResult ? (
                <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04]">
                  <div className="text-[16px] text-white/70 leading-[1.8] whitespace-pre-wrap mb-4">{gapResult}</div>
                  <div className="border-t border-white/[0.06] pt-4">
                    <p className="text-[15px] text-white/30 mb-2">메모 추가</p>
                    <textarea
                      value={userNotes}
                      onChange={(e) => setUserNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1e2a] border border-white/[0.06] rounded-lg text-[15px] text-white focus:outline-none focus:border-[#3ecfb2] min-h-[100px] resize-y"
                      placeholder="연구갭 분석에 대한 메모를 추가하세요..."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[300px] text-white/15 text-[16px]">
                  논문을 검색하고 갭 분석을 실행하세요
                </div>
              )}
            </div>
          )}

          {tab === "reading" && (
            <div>
              <h2 className="text-[21px] font-bold font-nanum-myeongjo mb-4"><Icon name="📖" className="inline-flex align-[-0.125em] mr-1" size={15} />읽기 공간</h2>
              <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] min-h-[400px]">
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="w-full min-h-[350px] bg-transparent text-[16px] text-white/70 leading-[1.8] resize-none focus:outline-none"
                  placeholder="문헌 연구 내용을 정리하세요. 검색 결과, 갭 분석 결과를 참고하여 자유롭게 작성할 수 있습니다..."
                />
              </div>
            </div>
          )}

          {tab === "matrix" && (
            <div>
              <h2 className="text-[21px] font-bold font-nanum-myeongjo mb-4">문헌 비교 매트릭스</h2>
              <div className="p-5 rounded-[16px] bg-[#13161e] border border-white/[0.04] min-h-[400px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-[15px]">
                    <thead>
                      <tr className="text-white/30 border-b border-white/[0.06]">
                        <th className="text-left py-2 px-3">저자</th>
                        <th className="text-left py-2 px-3">연도</th>
                        <th className="text-left py-2 px-3">제목</th>
                        <th className="text-left py-2 px-3">키워드</th>
                        <th className="text-left py-2 px-3">메모</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/50">
                      {references.length > 0 ? references.map((ref) => (
                        <tr key={ref.id} className="border-b border-white/[0.03]">
                          <td className="py-2 px-3 text-white/40">{ref.authors}</td>
                          <td className="py-2 px-3">{ref.year || "N/A"}</td>
                          <td className="py-2 px-3 text-white/60 max-w-[250px]">{ref.title}</td>
                          <td className="py-2 px-3 text-white/30">{ref.keywords.slice(0, 3).join(", ")}</td>
                          <td className="py-2 px-3">
                            <input
                              value={ref.note}
                              onChange={(e) => updateNote(ref.id, e.target.value)}
                              className="w-full bg-transparent text-[14px] text-white/50 focus:outline-none focus:text-white/70 border-b border-transparent focus:border-white/10"
                              placeholder="메모..."
                            />
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-white/15">논문을 추가하여 비교 매트릭스를 만드세요</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "citation" && (
            <CitationManager
              citations={canonicalCitations}
              onAdd={addCitation}
              onRemove={removeRef}
            />
          )}

          {tab === "collections" && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-[35px] mb-3 flex justify-center"><Icon name="folder" size={30} /></p>
                <p className="text-[18px] text-white/40 font-medium">컬렉션</p>
                <p className="text-[15px] text-white/20 mt-2">참고문헌을 주제별 컬렉션으로 묶는 기능은 준비 중입니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
