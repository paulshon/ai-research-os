"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Gauge } from "@/components/ui/gauge";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icons";

/**
 * RDOS 과목형 학습 화면(연구 기초 · 연구설계 기초 · 연구방법론 기초)이 공유하는 뼈대.
 * 진행률 게이지 → (좌) 본문·실습 → (우) 강의 목록·퀴즈 결과·막히면 도움말.
 * 각 과목의 상태(완료/진행중)에 따라 좌우 슬롯 내용만 달라진다.
 */
export function CourseLayout({
  eyebrow,
  title,
  description,
  gaugePct,
  gaugeLabel,
  headerContent,
  left,
  right,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  gaugePct: number;
  gaugeLabel: string;
  /** 게이지 오른쪽에 들어갈 내용 — 과목 제목·설명·배지·진행바·CTA 등. */
  headerContent: ReactNode;
  /** 좌측 컬럼 — 본문 설명 + 사용자 실습. */
  left: ReactNode;
  /** 우측 컬럼 — 강의 목록 · 퀴즈 결과 · "막히면" 도움말. */
  right: ReactNode;
}) {
  return (
    <Page eyebrow={eyebrow} title={title} description={description}>
      <Card className="mb4" style={{ padding: "20px 24px" }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 18 }}>
          <Gauge value={gaugePct} label={gaugeLabel} size={96} />
          <div style={{ flex: 1, minWidth: 0 }}>{headerContent}</div>
        </div>
      </Card>
      <div className="grid g-wide">
        <section className="col">{left}</section>
        <section className="col">{right}</section>
      </div>
    </Page>
  );
}

export type LectureState = "done" | "active" | "locked" | "todo";

export type LectureItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  state: LectureState;
  href?: string;
  onClick?: () => void;
};

/** "이 과목 N강" 목록 — 완료(체크) · 진행중(강조 화살표) · 예정(회색 화살표). */
export function CourseLectureList({ items }: { items: LectureItem[] }) {
  return (
    <div className="list">
      {items.map((it) => {
        const inner = (
          <>
            {it.state === "done" ? (
              <span style={{ color: "var(--ok)" }}>
                <Icon name="check" size={15} />
              </span>
            ) : it.state === "active" ? (
              <span style={{ color: "var(--accent)" }}>
                <Icon name="arrow" size={15} />
              </span>
            ) : (
              <span className="t3">
                <Icon name="arrow" size={15} />
              </span>
            )}
            <div className="t">
              <b style={it.state === "active" ? { color: "var(--accent)" } : it.state === "todo" || it.state === "locked" ? { color: "var(--t3)" } : undefined}>
                {it.title}
              </b>
              {it.meta ? <span>{it.meta}</span> : null}
            </div>
          </>
        );
        const commonStyle = { textDecoration: "none", width: "100%", textAlign: "left" as const, background: "none", border: 0, cursor: it.href || it.onClick ? "pointer" : "default", fontFamily: "inherit" };
        if (it.href) {
          return (
            <Link key={it.id} href={it.href} className="li" style={commonStyle}>
              {inner}
            </Link>
          );
        }
        if (it.onClick) {
          return (
            <button key={it.id} type="button" className="li" style={commonStyle} onClick={it.onClick}>
              {inner}
            </button>
          );
        }
        return (
          <div key={it.id} className="li">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** "막히면" 도움 카드 — 튜터·지식 코어·실제 사례로 향하는 세 방향의 출구. */
export function CourseHelpCard({
  title = "막히면",
  links,
}: {
  title?: ReactNode;
  links: { label: ReactNode; href: string }[];
}) {
  return (
    <Card>
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="col" style={{ gap: 6 }}>
        {links.map((l, i) => (
          <LinkButton key={i} href={l.href} size="sm" className="justify-start" style={{ width: "100%" }}>
            {l.label}
          </LinkButton>
        ))}
      </div>
    </Card>
  );
}

/** 강별 퀴즈 점수 — ProgressRow 재사용. tone 은 80점 미만이면 warn. */
export function CourseQuizResults({
  title = "퀴즈 결과",
  rows,
  footnote,
}: {
  title?: ReactNode;
  rows: { label: ReactNode; score: number }[];
  footnote?: ReactNode;
}) {
  return (
    <Card>
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      {rows.map((r, i) => (
        <div className="prow" key={i}>
          <span className="n">{r.label}</span>
          <div className={cn("bar", r.score < 80 && "warn")}>
            <i style={{ width: `${r.score}%` }} />
          </div>
          <span className="p">{r.score}</span>
        </div>
      ))}
      {footnote ? (
        <p className="fs-cap t3 mt3 mb0">{footnote}</p>
      ) : null}
    </Card>
  );
}

/** "이런 건 대신 해 주지 않습니다" 경계 카드 — AI가 과제를 대신 하지 않음을 명시. */
export function AiBoundaryCard({
  title = "이런 건 대신 해 주지 않습니다",
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card style={{ borderColor: "rgba(232,184,75,.22)", background: "rgba(232,184,75,.04)" }}>
      <div className="card-h">
        <h3 style={{ color: "var(--warn)" }}>{title}</h3>
      </div>
      <div className="fs-sm t2" style={{ lineHeight: 1.85 }}>
        {children}
      </div>
    </Card>
  );
}

/** 강의/장 아이콘 배지 — 완료(초록) · 진행중(강조) · 예정(회색). */
export function StepBadge({ n, icon, state }: { n: number | ReactNode; icon?: IconName; state: "done" | "active" | "todo" }) {
  const bg =
    state === "done" ? "var(--ok)" : state === "active" ? "var(--accent)" : "var(--glass-2)";
  const color = state === "todo" ? "var(--t3)" : "var(--t1)";
  return (
    <span
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        background: bg,
        color,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 16,
      }}
    >
      {icon ? <Icon name={icon} size={18} /> : n}
    </span>
  );
}

export function CourseBadge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return <Badge variant={variant}>{children}</Badge>;
}
