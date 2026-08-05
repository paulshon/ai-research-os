"use client";

import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Table, EmptyState } from "@/components/ui/table";
import { Icon } from "@/components/ui/icons";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  Toggle,
  Slider,
  usePageInspector,
} from "@/components/inspector";
import { useProjectStore } from "@/lib/project/store";
import type { LiteratureItem } from "@/lib/project/flow";

type View = "list" | "abstract" | "network";
type SortKey = "relevance" | "citations" | "recent";

const CURRENT_YEAR = new Date().getFullYear();

export default function LiteraturePage() {
  const project = useProjectStore();
  const seedIfEmpty = useProjectStore((s) => s.seedIfEmpty);
  const addLiteratureItem = useProjectStore((s) => s.addLiteratureItem);
  const updateLiteratureItem = useProjectStore((s) => s.updateLiteratureItem);
  const toggleLiteratureLibrary = useProjectStore((s) => s.toggleLiteratureLibrary);

  useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  const { literature, researchDesign } = project;

  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [yearFrom, setYearFrom] = useState(2015);
  const [yearTo, setYearTo] = useState(CURRENT_YEAR);
  const [minCitations, setMinCitations] = useState(0);
  const [sort, setSort] = useState<SortKey>("citations");
  const [libraryOnly, setLibraryOnly] = useState(false);
  const [gapOnly, setGapOnly] = useState(false);

  const recentUncited = useMemo(
    () => literature.filter((l) => l.year >= CURRENT_YEAR - 3 && l.citedInBody === 0),
    [literature],
  );
  const recentUncitedIds = useMemo(() => new Set(recentUncited.map((l) => l.id)), [recentUncited]);

  const filtered = useMemo(() => {
    let list = literature.filter(
      (l) => l.year >= yearFrom && l.year <= yearTo && l.citedInBody >= minCitations,
    );
    if (libraryOnly) list = list.filter((l) => l.inLibrary);
    if (gapOnly) list = list.filter((l) => recentUncitedIds.has(l.id));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((l) => l.title.toLowerCase().includes(q) || l.authors.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "citations") sorted.sort((a, b) => b.citedInBody - a.citedInBody);
    else if (sort === "recent") sorted.sort((a, b) => b.year - a.year);
    return sorted;
  }, [literature, yearFrom, yearTo, minCitations, libraryOnly, gapOnly, recentUncitedIds, query, sort]);

  const inLibraryCount = literature.filter((l) => l.inLibrary).length;
  const citedCount = literature.filter((l) => l.citedInBody > 0).length;
  const missingDoiCount = literature.filter((l) => l.inLibrary && !l.doi).length;

  function addManual() {
    const title = prompt("추가할 문헌의 제목을 입력하세요");
    if (!title || !title.trim()) return;
    const authors = prompt("저자를 입력하세요 (예: 김OO · 이OO)") ?? "";
    const yearStr = prompt("발행 연도를 입력하세요", String(CURRENT_YEAR)) ?? String(CURRENT_YEAR);
    const item: LiteratureItem = {
      id: `lit-${Date.now()}`,
      title: title.trim(),
      authors: authors.trim(),
      year: Number(yearStr) || CURRENT_YEAR,
      inLibrary: true,
      citedInBody: 0,
    };
    addLiteratureItem(item);
  }

  function citeInBody(item: LiteratureItem) {
    updateLiteratureItem(item.id, { citedInBody: item.citedInBody + 1 });
  }

  const gapChart = useMemo(() => {
    const years = literature.map((l) => l.year);
    const minYear = years.length ? Math.min(...years) : CURRENT_YEAR - 10;
    const maxYear = years.length ? Math.max(...years, CURRENT_YEAR) : CURRENT_YEAR;
    const maxCites = Math.max(1, ...literature.map((l) => l.citedInBody));
    const x = (year: number) => 24 + ((year - minYear) / Math.max(1, maxYear - minYear)) * 204;
    const y = (cites: number) => 108 - (cites / maxCites) * 90;
    const gapX = literature.length ? x(CURRENT_YEAR - 1) : 196;
    const gapY = literature.length ? y(0) : 90;
    return { x, y, gapX, gapY, minYear, maxYear };
  }, [literature]);

  const networkNodes = useMemo(() => {
    const top = [...literature].sort((a, b) => b.citedInBody - a.citedInBody).slice(0, 8);
    const R = 78;
    return top.map((l, i) => {
      const angle = (i / Math.max(1, top.length)) * Math.PI * 2 - Math.PI / 2;
      return { item: l, x: 130 + R * Math.cos(angle), y: 90 + R * Math.sin(angle) };
    });
  }, [literature]);

  usePageInspector(
    <Inspector
      title="검색 조건"
      badge={{ label: `${filtered.length}건`, variant: "info" }}
    >
      <InspectorSection
        title="범위"
        action={
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setYearFrom(2015);
              setYearTo(CURRENT_YEAR);
              setMinCitations(0);
              setLibraryOnly(false);
              setGapOnly(false);
              setQuery("");
              setSort("citations");
            }}
          >
            초기화
          </button>
        }
      >
        <PropertyRow label="연도">
          <div className="row" style={{ gap: 6 }}>
            <Input type="number" value={yearFrom} onChange={(e) => setYearFrom(Number(e.target.value) || 2000)} />
            <span className="t3">–</span>
            <Input type="number" value={yearTo} onChange={(e) => setYearTo(Number(e.target.value) || CURRENT_YEAR)} />
          </div>
        </PropertyRow>
        <PropertyRow label="서재">
          <Toggle
            label="서재에 담긴 문헌만"
            value={libraryOnly ? "yes" : "no"}
            onChange={(v) => setLibraryOnly(v === "yes")}
            options={[
              { value: "no", label: "전체" },
              { value: "yes", label: "서재만" },
            ]}
          />
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="정렬 · 필터">
        <PropertyRow label="정렬">
          <Select style={{ flex: 1 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="citations">인용수</option>
            <option value="recent">최신순</option>
            <option value="relevance">관련도</option>
          </Select>
        </PropertyRow>
        <PropertyRow label="최소 인용">
          <Slider label="최소 인용 수" min={0} max={10} value={minCitations} onChange={setMinCitations} />
          <span className="fs-cap t3 mono">{minCitations}</span>
        </PropertyRow>
      </InspectorSection>

      <InspectorSection title="연구 갭 지도">
        <svg viewBox="0 0 240 130" style={{ width: "100%", height: "auto" }} role="img" aria-label="연구 갭 산점도">
          <line x1={24} y1={108} x2={228} y2={108} stroke="var(--stroke)" />
          <line x1={24} y1={10} x2={24} y2={108} stroke="var(--stroke)" />
          {literature.map((l) => (
            <circle
              key={l.id}
              cx={gapChart.x(l.year)}
              cy={gapChart.y(l.citedInBody)}
              r={recentUncitedIds.has(l.id) ? 6 : 4 + Math.min(6, l.citedInBody)}
              fill={
                recentUncitedIds.has(l.id)
                  ? "rgba(232,184,75,.30)"
                  : "color-mix(in srgb, var(--accent) 26%, transparent)"
              }
              stroke={recentUncitedIds.has(l.id) ? "var(--warn)" : "none"}
              strokeDasharray={recentUncitedIds.has(l.id) ? "3 3" : undefined}
            />
          ))}
          <text x={126} y={124} textAnchor="middle" fontSize={9.5} fill="var(--t3)" fontFamily="NanumGothic">
            발표 연도 →
          </text>
        </svg>
        {recentUncited.length > 0 ? (
          <p className="fs-cap t2 mt3 mb0">
            최근 3년 내 발표되었으나 본문에 인용되지 않은 문헌이 <b style={{ color: "var(--warn)" }}>{recentUncited.length}건</b>
            입니다.
            {researchDesign.adoptedRqId ? " 채택한 RQ와 관련이 있는지 확인해 보세요." : ""}
          </p>
        ) : (
          <p className="fs-cap t2 mt3 mb0">현재 뚜렷한 연구 갭이 감지되지 않았습니다.</p>
        )}
        <button
          type="button"
          className="btn btn-sm mt3"
          style={{ width: "100%" }}
          onClick={() => setGapOnly((v) => !v)}
          disabled={recentUncited.length === 0}
        >
          {gapOnly ? "전체 목록으로 돌아가기" : "갭 문헌만 보기"}
        </button>
      </InspectorSection>
    </Inspector>,
  );

  return (
    <Page
      eyebrow="2단계 · 자료 수집"
      title="문헌을 모으고 연구 갭을 찾습니다"
      description="검색 조건을 좁혀가며 담은 문헌은 참고문헌·집필 메뉴로 그대로 이어집니다."
    >
      <Card className="mb4">
        <div className="row" style={{ gap: 10 }}>
          <div className="search" style={{ flex: 1, height: 44, borderRadius: "var(--r-md)" }}>
            <Icon name="search" size={17} />
            <input
              className="fs-md"
              style={{ background: "none", border: 0, outline: "none", color: "var(--t1)", width: "100%", font: "inherit" }}
              placeholder="예: 정서적 조직몰입 AND 이직의도 AND 심리적 안전감"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="primary" size="lg" className="nowrap" onClick={addManual}>
            <Icon name="plus" size={16} /> 문헌 추가
          </Button>
        </div>
        <div className="row mt3" style={{ flexWrap: "wrap", gap: 6 }}>
          <span className="fs-cap t3 nowrap">적용중:</span>
          <Badge variant="mute">
            {yearFrom}–{yearTo}
          </Badge>
          {minCitations > 0 ? <Badge variant="mute">인용 {minCitations}+</Badge> : null}
          {libraryOnly ? <Badge variant="mute">서재만</Badge> : null}
          {gapOnly ? <Badge variant="warn">갭 문헌만</Badge> : null}
          <span className="sp" />
          <span className="fs-cap t2">
            전체 {literature.length}건 중 <b style={{ color: "var(--t1)" }}>{filtered.length}건</b> 표시
          </span>
        </div>
      </Card>

      <div className="grid g4 mb4">
        <Kpi label="내 서재" value={inLibraryCount} delta={`전체 ${literature.length}편 중`} tone="flat" />
        <Kpi label="인용 확정" value={citedCount} delta="참고문헌 연동됨" tone="up" />
        <Kpi label="DOI 미확인" value={missingDoiCount} delta="참고문헌 검토 필요" tone={missingDoiCount > 0 ? "warn" : "flat"} />
        <Kpi label="연구 갭" value={recentUncited.length} delta="유망 영역 후보" tone={recentUncited.length > 0 ? "warn" : "flat"} />
      </div>

      <Card>
        <CardHeader
          title="검색 결과"
          right={
            <Segmented
              label="결과 보기"
              value={view}
              onChange={setView}
              items={[
                { value: "list", label: "목록" },
                { value: "abstract", label: "초록 비교" },
                { value: "network", label: "인용 관계망" },
              ]}
            />
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="book" size={22} />}
            title="조건에 맞는 문헌이 없습니다"
            description="필터를 완화하거나 새 문헌을 직접 추가해 보세요."
            actions={
              <Button size="sm" onClick={addManual}>
                문헌 추가
              </Button>
            }
          />
        ) : view === "list" ? (
          <div style={{ overflowX: "auto" }}>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>논문</th>
                  <th style={{ width: 60 }}>연도</th>
                  <th style={{ width: 70 }}>인용</th>
                  <th style={{ width: 74 }}>상태</th>
                  <th style={{ width: 78 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id}>
                    <td className="mono t3">{i + 1}</td>
                    <td>
                      <b>{l.title}</b>
                      <br />
                      <span className="fs-cap t3">{l.authors}</span>
                    </td>
                    <td className="mono">{l.year}</td>
                    <td className="mono">{l.citedInBody}</td>
                    <td>
                      <Badge variant={l.inLibrary ? "ok" : recentUncitedIds.has(l.id) ? "warn" : "info"}>
                        {l.inLibrary ? "담김" : recentUncitedIds.has(l.id) ? "신규" : "추천"}
                      </Badge>
                    </td>
                    <td>
                      {l.inLibrary ? (
                        <Button size="sm" onClick={() => citeInBody(l)}>
                          인용
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => toggleLiteratureLibrary(l.id)}>
                          담기
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : view === "abstract" ? (
          <div className="grid g3">
            {filtered.map((l) => (
              <div className="glass-flat" style={{ padding: 14 }} key={l.id}>
                <div className="row mb2" style={{ alignItems: "flex-start" }}>
                  <b className="fs-sm">{l.title}</b>
                </div>
                <p className="fs-cap t3 mb2">
                  {l.authors} · {l.year}
                </p>
                <p className="fs-cap t2 mb0">초록 요약이 아직 없습니다 · 서재에서 원문을 확인하세요.</p>
                <div className="row mt3">
                  <Badge variant={l.inLibrary ? "ok" : "mute"}>{l.inLibrary ? "담김" : "미보관"}</Badge>
                  <span className="sp" />
                  <span className="fs-cap t3">인용 {l.citedInBody}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <svg viewBox="0 0 260 180" style={{ width: "100%", height: "auto" }} role="img" aria-label="인용 관계망">
            {networkNodes.map((n) => (
              <line key={`l-${n.item.id}`} x1={130} y1={90} x2={n.x} y2={n.y} stroke="var(--stroke-2)" strokeWidth={Math.max(1, Math.min(3, n.item.citedInBody / 2))} />
            ))}
            <circle cx={130} cy={90} r={22} fill="color-mix(in srgb, var(--accent) 30%, transparent)" stroke="var(--accent)" />
            <text x={130} y={94} textAnchor="middle" fontSize={9.5} fill="var(--t1)" fontFamily="NanumGothic">
              내 논문
            </text>
            {networkNodes.map((n) => (
              <g key={n.item.id}>
                <circle cx={n.x} cy={n.y} r={6 + Math.min(8, n.item.citedInBody)} fill="var(--glass-3)" stroke="var(--stroke-2)" />
                <text x={n.x} y={n.y + (6 + Math.min(8, n.item.citedInBody)) + 12} textAnchor="middle" fontSize={8.5} fill="var(--t3)" fontFamily="NanumGothic">
                  {n.item.authors.split(/[·&,]/)[0]?.trim().slice(0, 10)} {n.item.year}
                </text>
              </g>
            ))}
          </svg>
        )}

        <div className="row mt4">
          {view === "network" ? <span className="fs-cap t3">인용 수가 클수록 노드가 크고 선이 굵습니다.</span> : null}
          <span className="sp" />
          <LinkButton href="/references" variant="primary" size="sm">
            참고문헌으로 보내기
          </LinkButton>
        </div>
      </Card>
    </Page>
  );
}
