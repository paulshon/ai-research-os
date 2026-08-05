"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Table, EmptyState } from "@/components/ui/table";
import { Segmented } from "@/components/ui/segmented";
import { Icon } from "@/components/ui/icons";
import { Inspector, InspectorSection, PropertyRow, EvidenceCard, usePageInspector } from "@/components/inspector";
import { useCitation } from "@/components/citation/citation-context";
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
import { parseAuthorsAPA7, type RefEntry } from "@/lib/citation/apa-utils";

type SortKey = "author" | "year" | "title";
type ImportMode = "doi" | "ris" | "bibtex";
type StatusFilter = "needs" | "all" | "uncited";

/** 본문 인용을 표시하는데 서지 정보가 규정을 채우지 못한 항목. */
function isIncomplete(r: RefEntry): boolean {
  return !r.doi || (r.type === "journal" && !r.journal);
}

function shortLabel(r: RefEntry): string {
  const author = r.authors[0]?.last || r.title.slice(0, 16);
  return `${author}(${r.year || "?"})`;
}

export default function ReferencesPage() {
  const { refDB, addRefs, removeRef, updateRef, loadPDFs, loading, citationStyle, setCitationStyle } = useCitation();

  const [sortKey, setSortKey] = useState<SortKey>("author");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("needs");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("doi");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error" | "info"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [lookupDoi, setLookupDoi] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [authorsDraft, setAuthorsDraft] = useState("");

  function flash(type: "ok" | "error" | "info", text: string) {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 4000);
  }

  const sortedRefs = useMemo(() => {
    const arr = [...refDB];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "year") {
        cmp = (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0);
      } else if (sortKey === "title") {
        cmp = (a.title || "").localeCompare(b.title || "", "ko");
      } else {
        const ka = (a.authors?.[0]?.last || a.authors?.[0]?.full || a.title || "").toLowerCase();
        const kb = (b.authors?.[0]?.last || b.authors?.[0]?.full || b.title || "").toLowerCase();
        cmp = ka.localeCompare(kb, "ko");
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [refDB, sortKey, sortAsc]);

  const needsFix = useMemo(() => sortedRefs.filter(isIncomplete), [sortedRefs]);
  const withDoi = useMemo(() => refDB.filter((r) => r.doi), [refDB]);
  const uncited = useMemo(() => sortedRefs.filter((r) => !r.cited), [sortedRefs]);
  const citedIncomplete = useMemo(() => sortedRefs.filter((r) => r.cited && isIncomplete(r)), [sortedRefs]);

  const filtered = useMemo(() => {
    if (statusFilter === "needs") return needsFix;
    if (statusFilter === "uncited") return uncited;
    return sortedRefs;
  }, [statusFilter, needsFix, uncited, sortedRefs]);

  const selected = useMemo(
    () => refDB.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [refDB, selectedId, filtered],
  );

  useEffect(() => {
    setAuthorsDraft(selected ? selected.authors.map((a) => a.full).join(", ") : "");
    setLookupErr(null);
  }, [selected?.id]);

  function commitAuthors() {
    if (!selected) return;
    const parsed = parseAuthorsAPA7(authorsDraft);
    if (parsed.length) updateRef(selected.id, { authors: parsed });
  }

  async function lookupForSelected() {
    if (!selected || !lookupDoi.trim()) return;
    setLookupBusy(true);
    setLookupErr(null);
    try {
      const res = await fetch("/api/citation-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: lookupDoi.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.citation) {
        const converted = canonicalToRefEntry(data.citation);
        updateRef(selected.id, { ...converted, id: selected.id, cited: selected.cited });
        setLookupDoi("");
        flash("ok", `서지 정보를 가져왔습니다 (${data.source})`);
      } else {
        setLookupErr(data.error ?? "조회에 실패했습니다.");
      }
    } catch {
      setLookupErr("조회 중 오류가 발생했습니다.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function handleImport() {
    if (!input.trim()) {
      flash("error", "불러올 서지정보를 입력하세요.");
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
          addRefs([canonicalToRefEntry(data.citation)]);
          flash("ok", `DOI로 불러왔습니다 (${data.source})`);
          setInput("");
        } else {
          flash("error", data.error ?? "조회에 실패했습니다.");
        }
      } else {
        const refs = parseBibTextMulti(input.trim(), importMode);
        if (refs.length === 0) {
          flash("error", `${importMode.toUpperCase()} 형식을 해석하지 못했습니다.`);
        } else {
          addRefs(refs);
          flash("ok", `${importMode.toUpperCase()} ${refs.length}건을 추가했습니다.`);
          setInput("");
        }
      }
    } catch {
      flash("error", "처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const all = Array.from(files);
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
          /* 개별 파일 실패는 무시 */
        }
      }
      if (docFiles.length > 0) await loadPDFs(docFiles);

      if (bibCount > 0 || docFiles.length > 0) {
        flash("ok", `문헌 ${bibCount + docFiles.length}건을 처리했습니다.`);
      } else {
        flash("error", "지원하는 서지 형식을 찾지 못했습니다.");
      }
    } catch {
      flash("error", "처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function buildText(): string {
    const styleMeta = CITATION_STYLES.find((s) => s.id === citationStyle);
    const header = `참고문헌 목록 (${styleMeta?.name ?? citationStyle}) — ${sortedRefs.length}건\n${"=".repeat(40)}\n\n`;
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
    flash("ok", "내보내기가 완료되었습니다.");
  }

  usePageInspector(
    selected ? (
      <Inspector
        title="서지 정보"
        badge={{ label: isIncomplete(selected) ? "확인 필요" : "정상", variant: isIncomplete(selected) ? "danger" : "ok" }}
      >
        <InspectorSection title="선택 항목">
          <PropertyRow label="유형">
            <Select
              style={{ flex: 1 }}
              value={selected.type}
              onChange={(e) => updateRef(selected.id, { type: e.target.value as RefEntry["type"] })}
            >
              <option value="journal">학술지 논문</option>
              <option value="book">단행본</option>
              <option value="other">기타 자료</option>
            </Select>
          </PropertyRow>
          <PropertyRow label="저자">
            <Input value={authorsDraft} onChange={(e) => setAuthorsDraft(e.target.value)} onBlur={commitAuthors} />
          </PropertyRow>
          <PropertyRow label="연도">
            <Input value={selected.year} onChange={(e) => updateRef(selected.id, { year: e.target.value })} />
          </PropertyRow>
          <PropertyRow label="제목">
            <Input value={selected.title} onChange={(e) => updateRef(selected.id, { title: e.target.value })} />
          </PropertyRow>
          <PropertyRow label="학술지">
            <Input
              value={selected.journal}
              placeholder="—"
              onChange={(e) => updateRef(selected.id, { journal: e.target.value })}
              style={selected.type === "journal" && !selected.journal ? { borderColor: "var(--danger)" } : undefined}
            />
          </PropertyRow>
          <PropertyRow label="권(호)">
            <div className="row" style={{ gap: 6 }}>
              <Input
                placeholder="권"
                value={selected.volume}
                onChange={(e) => updateRef(selected.id, { volume: e.target.value })}
                style={{ flex: 1 }}
              />
              <Input
                placeholder="호"
                value={selected.issue}
                onChange={(e) => updateRef(selected.id, { issue: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </PropertyRow>
          <PropertyRow label="DOI">
            <Input
              placeholder="10.xxxx/…"
              value={selected.doi}
              onChange={(e) => updateRef(selected.id, { doi: e.target.value })}
              style={!selected.doi ? { borderColor: "var(--danger)" } : undefined}
            />
          </PropertyRow>
        </InspectorSection>

        <InspectorSection title="서지 정보 가져오기">
          <p className="fs-cap t2 mb3">DOI를 알고 있다면 붙여넣어 Crossref·OpenAlex·Semantic Scholar에서 서지 정보를 가져옵니다.</p>
          <Input
            placeholder="10.xxxx/…"
            value={lookupDoi}
            onChange={(e) => setLookupDoi(e.target.value)}
            className="mb2"
          />
          <Button
            size="sm"
            variant="primary"
            style={{ width: "100%" }}
            onClick={lookupForSelected}
            disabled={lookupBusy || !lookupDoi.trim()}
          >
            <Icon name="search" size={13} /> {lookupBusy ? "조회 중…" : "DOI로 서지 조회"}
          </Button>
          {lookupErr ? (
            <p className="fs-cap mt2 mb0" style={{ color: "var(--danger)" }}>
              {lookupErr}
            </p>
          ) : null}
          <Button size="sm" style={{ width: "100%" }} className="mt2" onClick={() => removeRef(selected.id)}>
            목록에서 삭제
          </Button>
        </InspectorSection>

        <InspectorSection title={`${CITATION_STYLES.find((s) => s.id === citationStyle)?.name ?? "APA 7th"} 미리보기`}>
          <EvidenceCard
            title={shortLabel(selected)}
            body={
              <>
                {renderReference(selected, citationStyle)}
                {!selected.journal && selected.type === "journal" ? (
                  <>
                    {" "}
                    <span style={{ color: "var(--danger)" }}>[학술지명 누락]</span>
                  </>
                ) : null}
                {!selected.doi ? (
                  <>
                    {" "}
                    <span style={{ color: "var(--danger)" }}>[DOI 없음]</span>
                  </>
                ) : null}
              </>
            }
            source={
              isIncomplete(selected) ? (
                <span style={{ color: "var(--danger)" }}>필수 필드가 비어 있어 규정에 맞지 않습니다</span>
              ) : (
                "규정에 맞게 채워졌습니다"
              )
            }
          />
        </InspectorSection>
      </Inspector>
    ) : null,
  );

  return (
    <Page
      eyebrow="2단계 · 자료 수집"
      title="본문과 목록이 어긋나지 않게"
      description="인용한 문헌과 참고문헌 목록을 대조하고, 서지 정보를 자동으로 채웁니다."
    >
      <div className="grid g4 mb4">
        <Kpi label="전체" value={refDB.length} delta="등록된 참고문헌" tone="flat" />
        <Kpi label="DOI 확인" value={withDoi.length} delta="doi.org 링크 보유" tone={withDoi.length > 0 ? "up" : "flat"} />
        <Kpi label="확인 필요" value={needsFix.length} delta="DOI·학술지 누락" tone={needsFix.length > 0 ? "danger" : "flat"} />
        <Kpi label="본문 미인용" value={uncited.length} delta="목록에만 있음" tone={uncited.length > 0 ? "warn" : "flat"} />
      </div>

      {citedIncomplete.length > 0 ? (
        <section
          className="glass card mb4"
          style={{
            borderColor: "color-mix(in srgb, var(--danger) 28%, transparent)",
            background: "color-mix(in srgb, var(--danger) 5%, transparent)",
          }}
        >
          <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
            <span style={{ color: "var(--danger)" }}>
              <Icon name="alert" size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: "var(--fs-md)" }}>본문에서 인용했지만 서지 정보가 불완전한 문헌 {citedIncomplete.length}건</b>
              <p className="fs-sm t2 mt2 mb0">
                {citedIncomplete.slice(0, 3).map(shortLabel).join(" · ")}
                {citedIncomplete.length > 3 ? ` 외 ${citedIncomplete.length - 3}건` : ""} — 학술지명·DOI가 비어 있습니다. 이
                상태로는 검증 엔진에서 <b>치명</b>으로 표시됩니다.
              </p>
            </div>
            <Button
              variant="primary"
              className="nowrap"
              onClick={() => {
                setStatusFilter("needs");
                setSelectedId(citedIncomplete[0].id);
              }}
            >
              <Icon name="alert" size={14} /> {citedIncomplete.length}건 검토하기
            </Button>
          </div>
        </section>
      ) : null}

      <Card>
        <CardHeader
          title="참고문헌 목록"
          right={
            <>
              <Segmented
                label="상태 필터"
                value={statusFilter}
                onChange={setStatusFilter}
                items={[
                  { value: "needs", label: `확인 필요 ${needsFix.length}` },
                  { value: "all", label: `전체 ${refDB.length}` },
                  { value: "uncited", label: `본문 미인용 ${uncited.length}` },
                ]}
              />
              <Select style={{ width: 150 }} value={citationStyle} onChange={(e) => setCitationStyle(e.target.value as CitationFormat)}>
                {CITATION_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={exportTxt} disabled={sortedRefs.length === 0}>
                <Icon name="download" size={13} /> 내보내기
              </Button>
            </>
          }
        />

        {sortedRefs.length === 0 ? (
          <EmptyState
            icon={<Icon name="book" size={26} />}
            title="등록된 참고문헌이 없습니다"
            description="DOI, RIS/BibTeX 텍스트를 붙여넣거나 문서를 업로드해 참고문헌을 채워보세요."
            actions={
              <Button variant="primary" size="sm" onClick={() => setImportOpen(true)}>
                <Icon name="download" size={13} /> 문헌 가져오기
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="check" size={26} />}
            title="이 필터에 해당하는 문헌이 없습니다"
            description="다른 필터를 선택해 전체 목록을 확인하세요."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <th>문헌</th>
                  <th style={{ width: 190 }}>출처</th>
                  <th style={{ width: 90 }}>본문 인용</th>
                  <th style={{ width: 130 }}>상태</th>
                  <th style={{ width: 56 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const incomplete = isIncomplete(r);
                  const status = !r.doi
                    ? { variant: "danger" as const, text: "DOI 미확인" }
                    : r.type === "journal" && !r.journal
                    ? { variant: "danger" as const, text: "학술지 누락" }
                    : !r.cited
                    ? { variant: "warn" as const, text: "본문 미인용" }
                    : { variant: "ok" as const, text: "정상" };
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        cursor: "pointer",
                        background: selected?.id === r.id ? "var(--glass-1)" : undefined,
                      }}
                    >
                      <td>
                        <b>{shortLabel(r)}</b>
                        <br />
                        <span className="fs-cap t3">{r.title}</span>
                      </td>
                      <td className="fs-cap">{r.journal ? `${r.journal}${r.volume ? `, ${r.volume}` : ""}${r.issue ? `(${r.issue})` : ""}` : "—"}</td>
                      <td className="mono">{r.cited ? "인용됨" : "—"}</td>
                      <td>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="서지 정보 편집"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(r.id);
                          }}
                        >
                          <Icon name="pen" size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}

        <div className="row mt4">
          <Button size="sm" onClick={() => setImportOpen((v) => !v)}>
            <Icon name={importOpen ? "close" : "plus"} size={13} /> {importOpen ? "가져오기 닫기" : "문헌 가져오기"}
          </Button>
          <span className="sp" />
          <LinkButton href="/literature" size="sm">
            <Icon name="book" size={13} /> 문헌 연구에서 더 담기
          </LinkButton>
          <LinkButton href="/validation" variant="primary" size="sm">
            <Icon name="shield" size={13} /> 인용 규칙 재검사
          </LinkButton>
        </div>

        {importOpen ? (
          <div className="glass-flat mt4" style={{ padding: 16 }}>
            <div className="row mb3" style={{ flexWrap: "wrap", gap: 8 }}>
              {(
                [
                  { id: "doi", label: "DOI" },
                  { id: "ris", label: "RIS" },
                  { id: "bibtex", label: "BibTeX" },
                ] as { id: ImportMode; label: string }[]
              ).map((m) => (
                <Button key={m.id} size="sm" variant={importMode === m.id ? "primary" : "default"} onClick={() => setImportMode(m.id)}>
                  {m.label}
                </Button>
              ))}
              <span style={{ width: 1, alignSelf: "stretch", background: "var(--hairline)" }} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={12} /> 파일 업로드
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={REFERENCES_ACCEPT}
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            <Textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                importMode === "doi"
                  ? "10.xxxx/… 또는 https://doi.org/… 를 붙여넣으세요"
                  : importMode === "ris"
                  ? "RIS 형식 서지정보를 붙여넣으세요 (TY  - JOUR 로 시작)"
                  : "BibTeX 형식 서지정보를 붙여넣으세요 (@article{... 로 시작)"
              }
            />
            <div className="row mt3">
              <span className="fs-cap t3">{loading || busy ? "처리 중…" : `${refDB.length}건 등록됨`}</span>
              <span className="sp" />
              <Button size="sm" variant="primary" onClick={handleImport} disabled={busy || loading}>
                <Icon name="download" size={13} /> 목록에 추가
              </Button>
            </div>
            {msg ? (
              <p className="fs-cap mt2 mb0" style={{ color: msg.type === "error" ? "var(--danger)" : msg.type === "ok" ? "var(--ok)" : "var(--accent)" }}>
                {msg.text}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>
    </Page>
  );
}
