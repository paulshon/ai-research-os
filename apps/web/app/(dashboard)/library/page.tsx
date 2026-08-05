"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/table";
import { Icon } from "@/components/ui/icons";
import {
  Inspector,
  InspectorSection,
  PropertyRow,
  EvidenceCard,
  Toggle,
  usePageInspector,
} from "@/components/inspector";
import { useProjectStore } from "@/lib/project/store";
import type { Snippet } from "@/lib/project/flow";

type Tab = "mine" | "cite" | "top";

const SLOT_RE = /〔([^〕]*)〕/g;

function uniqueSlots(slots: string[]): string[] {
  return Array.from(new Set(slots.filter(Boolean)));
}

function normalizeText(s: string): string {
  return s.replace(/[〔〕().,·]/g, " ").trim();
}

function wordSet(s: string): Set<string> {
  return new Set(normalizeText(s).split(/\s+/).filter((w) => w.length > 0));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((w) => {
    if (b.has(w)) inter += 1;
  });
  const union = new Set([...a, ...b]).size;
  return union > 0 ? inter / union : 0;
}

/** 〔슬롯〕 부분을 강조해 렌더한다. */
function renderSlotted(text: string): ReactNode {
  const parts = text.split(SLOT_RE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ color: "var(--accent)" }}>
        〔{part}〕
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function applySlotValues(text: string, values: Record<string, string>): string {
  return text.replace(SLOT_RE, (_m, name: string) => values[name]?.trim() || `〔${name}〕`);
}

export default function LibraryPage() {
  const snippets = useProjectStore((s) => s.snippets);
  const outline = useProjectStore((s) => s.outline);
  const addSnippet = useProjectStore((s) => s.addSnippet);
  const updateSnippet = useProjectStore((s) => s.updateSnippet);
  const useSnippetAction = useProjectStore((s) => s.useSnippet);

  const [tab, setTab] = useState<Tab>("mine");
  const [category, setCategory] = useState<string>("전체");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    snippets.forEach((s) => map.set(s.category, (map.get(s.category) ?? 0) + 1));
    return Array.from(map.entries());
  }, [snippets]);

  const byTab = useMemo(() => {
    if (tab === "cite") return snippets.filter((s) => s.origin === "cite");
    if (tab === "top") return [...snippets].filter((s) => s.useCount > 0).sort((a, b) => b.useCount - a.useCount);
    return snippets.filter((s) => s.origin === "mine");
  }, [snippets, tab]);

  const filtered = useMemo(
    () => (category === "전체" ? byTab : byTab.filter((s) => s.category === category)),
    [byTab, category],
  );

  const activeSection = useMemo(() => {
    const drafts = outline.sections.filter((s) => s.status === "draft");
    return drafts.find((s) => s.level === 2) ?? drafts[0] ?? outline.sections.find((s) => s.status === "empty") ?? outline.sections[0] ?? null;
  }, [outline.sections]);

  const forActiveSection = useMemo(
    () => (activeSection ? snippets.filter((s) => s.sectionId === activeSection.id) : []),
    [snippets, activeSection],
  );

  const duplicatePairs = useMemo(() => {
    const pairs: { a: Snippet; b: Snippet; score: number }[] = [];
    for (let i = 0; i < snippets.length; i++) {
      for (let j = i + 1; j < snippets.length; j++) {
        const score = jaccard(wordSet(snippets[i].text), wordSet(snippets[j].text));
        if (score >= 0.4) pairs.push({ a: snippets[i], b: snippets[j], score });
      }
    }
    return pairs.sort((a, b) => b.score - a.score);
  }, [snippets]);

  const unused = useMemo(() => snippets.filter((s) => s.useCount === 0), [snippets]);
  const totalUses = useMemo(() => snippets.reduce((sum, s) => sum + s.useCount, 0), [snippets]);

  const selected = useMemo(() => snippets.find((s) => s.id === selectedId) ?? filtered[0] ?? null, [snippets, selectedId, filtered]);

  const similarToSelected = useMemo(() => {
    if (!selected) return [];
    return snippets
      .filter((s) => s.id !== selected.id)
      .map((s) => ({ s, score: jaccard(wordSet(selected.text), wordSet(s.text)) }))
      .filter((x) => x.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }, [snippets, selected]);

  function insert(s: Snippet) {
    const text = applySlotValues(s.text, s.id === selected?.id ? slotValues : {});
    navigator.clipboard?.writeText(text).catch(() => {});
    useSnippetAction(s.id);
    setCopiedId(s.id);
    window.setTimeout(() => setCopiedId((v) => (v === s.id ? null : v)), 2000);
  }

  function saveNew() {
    const text = newText.trim();
    if (!text) return;
    const slots = uniqueSlots(Array.from(text.matchAll(SLOT_RE)).map((m) => m[1]));
    addSnippet({
      id: `sn-${Date.now()}`,
      text,
      slots,
      category: category === "전체" ? "서론" : category,
      sectionId: activeSection?.id,
      origin: "mine",
      useCount: 0,
    });
    setNewText("");
  }

  usePageInspector(
    selected ? (
      <Inspector title="문장 속성">
        <InspectorSection title="선택된 문장">
          <p
            className="fs-sm t1 mb0"
            style={{ padding: 12, borderRadius: "var(--r-sm)", background: "var(--bg-2)", border: "1px solid var(--stroke)", lineHeight: 1.8 }}
          >
            {renderSlotted(selected.text)}
          </p>
          <div className="prop mt3">
            <label>범주</label>
            <div className="ctl">
              <Select style={{ flex: 1 }} value={selected.category} onChange={(e) => updateSnippet(selected.id, { category: e.target.value })}>
                {["서론", "이론", "방법", "결과", "논의"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <PropertyRow label="장·절">
            <Select
              style={{ flex: 1 }}
              value={selected.sectionId ?? ""}
              onChange={(e) => updateSnippet(selected.id, { sectionId: e.target.value || undefined })}
            >
              <option value="">미지정</option>
              {outline.sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.number} {sec.title}
                </option>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow label="사용 횟수">
            <span className="fs-sm mono t2">{selected.useCount}회</span>
          </PropertyRow>
          <PropertyRow label="출처">
            <Toggle
              label="문장 출처"
              value={selected.origin}
              onChange={(v) => updateSnippet(selected.id, { origin: v })}
              options={[
                { value: "mine", label: "내가 씀" },
                { value: "cite", label: "인용" },
              ]}
            />
          </PropertyRow>
        </InspectorSection>

        {uniqueSlots(selected.slots).length > 0 ? (
          <InspectorSection title="변수 슬롯">
            <p className="fs-cap t2 mb3">〔 〕 안의 값은 삽입할 때 채웁니다.</p>
            {uniqueSlots(selected.slots).map((slot) => (
              <PropertyRow key={slot} label={slot}>
                <Input
                  value={slotValues[slot] ?? ""}
                  onChange={(e) => setSlotValues((v) => ({ ...v, [slot]: e.target.value }))}
                  placeholder={`〔${slot}〕`}
                />
              </PropertyRow>
            ))}
            <Button size="sm" variant="primary" className="mt3" style={{ width: "100%" }} onClick={() => insert(selected)}>
              <Icon name="doc" size={13} /> {copiedId === selected.id ? "복사됨" : "값 채워 복사"}
            </Button>
          </InspectorSection>
        ) : null}

        <InspectorSection title="비슷한 표현">
          {similarToSelected.length > 0 ? (
            similarToSelected.map(({ s, score }) => (
              <EvidenceCard
                key={s.id}
                title={renderSlotted(s.text)}
                body=""
                source={`${s.origin === "mine" ? "내 서재" : "인용"} · 유사도 ${Math.round(score * 100)}%`}
              />
            ))
          ) : (
            <p className="fs-cap t2 mb0">유사한 문장이 발견되지 않았습니다.</p>
          )}
        </InspectorSection>
      </Inspector>
    ) : null,
  );

  return (
    <Page
      eyebrow="2단계 · 자료 수집"
      title="자주 쓰는 학술 표현을 모아 둡니다"
      description="저장한 문장에 변수 슬롯을 넣어 두면, 집필 중 지금 쓰는 절에 맞는 표현이 자동으로 올라옵니다."
    >
      <div className="grid g4 mb4">
        <Kpi label="내 문장" value={snippets.filter((s) => s.origin === "mine").length} delta="직접 저장" tone="flat" />
        <Kpi label="인용 표현" value={snippets.filter((s) => s.origin === "cite").length} delta="출처가 있는 문장" tone="flat" />
        <Kpi label="총 사용 횟수" value={totalUses} delta="삽입 누적" tone={totalUses > 0 ? "up" : "flat"} />
        <Kpi label="중복 후보" value={duplicatePairs.length} delta="비슷한 문장 정리 권장" tone={duplicatePairs.length > 0 ? "warn" : "flat"} />
      </div>

      <div className="grid g-wide">
        <Card>
          <CardHeader
            title="문장"
            right={
              <>
                <div className="seg" role="tablist" aria-label="문장 종류">
                  {(
                    [
                      { id: "mine" as Tab, label: "내 문장" },
                      { id: "cite" as Tab, label: "인용 표현" },
                      { id: "top" as Tab, label: "자주 사용" },
                    ]
                  ).map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : undefined} onClick={() => setTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            }
          />

          <div className="row mb3" style={{ gap: 6 }}>
            <Textarea
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="새 문장을 저장하세요. 〔변수〕처럼 대괄호로 슬롯을 표시할 수 있습니다."
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={saveNew} disabled={!newText.trim()}>
              <Icon name="plus" size={14} /> 저장
            </Button>
          </div>

          <div className="row mb4" style={{ flexWrap: "wrap", gap: 6 }}>
            <Badge variant={category === "전체" ? "info" : "mute"} onClick={() => setCategory("전체")} style={{ cursor: "pointer" }}>
              전체 {byTab.length}
            </Badge>
            {categories.map(([c, n]) => (
              <Badge key={c} variant={category === c ? "info" : "mute"} onClick={() => setCategory(c)} style={{ cursor: "pointer" }}>
                {c} {n}
              </Badge>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Icon name="quote" size={26} />} title="저장된 문장이 없습니다" description="위 입력창에 자주 쓰는 표현을 저장해 보세요." />
          ) : (
            <div className="list">
              {filtered.map((s) => (
                <div className="li" key={s.id} onClick={() => setSelectedId(s.id)} style={{ cursor: "pointer" }}>
                  <span className="badge b-mute nowrap">{s.category}</span>
                  <div className="t">
                    <b style={{ fontWeight: 400, color: "var(--t1)", whiteSpace: "normal" }}>{renderSlotted(s.text)}</b>
                    <span>
                      {outline.sections.find((sec) => sec.id === s.sectionId)?.number ?? "미지정"}{" "}
                      {outline.sections.find((sec) => sec.id === s.sectionId)?.title ?? ""} · {s.useCount}회 사용
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedId === s.id ? "primary" : "default"}
                    onClick={(e) => {
                      e.stopPropagation();
                      insert(s);
                    }}
                  >
                    {copiedId === s.id ? "복사됨" : "삽입"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <section className="col">
          <Card>
            <CardHeader title="지금 쓰는 절에 맞는 문장" level={3} />
            {activeSection ? (
              <p className="card-sub">
                집필 화면에서 {activeSection.number}절({activeSection.title})을 작성 중입니다
              </p>
            ) : null}
            {forActiveSection.length > 0 ? (
              <div className="list">
                {forActiveSection.map((s) => (
                  <div className="li" key={s.id}>
                    <span className={`badge nowrap ${s.origin === "cite" ? "b-mute" : "b-info"}`}>{s.origin === "cite" ? "인용" : "내 서재"}</span>
                    <div className="t">
                      <b style={{ fontWeight: 400, whiteSpace: "normal" }}>{renderSlotted(s.text)}</b>
                    </div>
                    <Button size="sm" variant={copiedId === s.id ? "primary" : "default"} onClick={() => insert(s)}>
                      {copiedId === s.id ? "복사됨" : "삽입"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="fs-sm t2 mb0">이 절에 등록된 표현이 아직 없습니다.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="정리 제안" level={3} />
            <div className="list">
              {duplicatePairs.length > 0 ? (
                <div className="li">
                  <span className="badge b-warn nowrap">중복</span>
                  <div className="t">
                    <b>비슷한 문장 {duplicatePairs.length}쌍</b>
                    <span>합치면 목록이 짧아집니다</span>
                  </div>
                  <Button size="sm" onClick={() => setSelectedId(duplicatePairs[0].a.id)}>
                    검토
                  </Button>
                </div>
              ) : null}
              {unused.length > 0 ? (
                <div className="li">
                  <span className="badge b-mute nowrap">미사용</span>
                  <div className="t">
                    <b>사용 이력 없는 문장 {unused.length}개</b>
                    <span>필요 없다면 정리해 보세요</span>
                  </div>
                  <Button size="sm" onClick={() => setSelectedId(unused[0].id)}>
                    검토
                  </Button>
                </div>
              ) : null}
              {duplicatePairs.length === 0 && unused.length === 0 ? <p className="fs-sm t2 mb0">정리할 항목이 없습니다.</p> : null}
            </div>
          </Card>
        </section>
      </div>
    </Page>
  );
}
