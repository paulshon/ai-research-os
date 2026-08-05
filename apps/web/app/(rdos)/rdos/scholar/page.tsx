"use client";

import { useMemo } from "react";
import { Page } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { Icon, type IconName } from "@/components/ui/icons";
import { useLearnerStore } from "@/lib/project/learner";

const HREF: Record<string, string> = {
  basics: "/rdos/basics",
  design: "/rdos/design",
  method: "/rdos/method",
  reading: "/rdos/reading",
  writing: "/rdos/writing",
  apa: "/rdos/apa",
};

const RESEARCHER_PREVIEW: { icon: IconName; label: string; desc: string }[] = [
  { icon: "compass", label: "연구설계 스튜디오", desc: "RQ부터 방법론까지 AI와 함께 설계합니다" },
  { icon: "book", label: "문헌 라이브러리", desc: "논문을 모으고 자동으로 정리합니다" },
  { icon: "pen", label: "논문 집필", desc: "장별 초안을 쓰고 AI 코멘트를 받습니다" },
  { icon: "chart", label: "논문 분석기", desc: "제출 전 완성도를 다각도로 점검합니다" },
];

export default function RdosScholarPage() {
  const { certificationRequirements, courseProgress } = useLearnerStore();

  const doneCount = certificationRequirements.filter((r) => r.done).length;
  const pct = Math.round((doneCount / certificationRequirements.length) * 100);
  const allDone = doneCount === certificationRequirements.length;

  const fastest = useMemo(
    () =>
      certificationRequirements
        .filter((r) => !r.done)
        .slice()
        .sort((a, b) => a.minutes - b.minutes),
    [certificationRequirements],
  );

  return (
    <Page
      eyebrow="4 · 인증"
      title="연구 준비자 인증"
      description="6개 요건을 모두 채우면 연구자 트랙의 기능들이 열립니다."
    >
      <div className="grid g-wide mb4">
        <Card>
          <div className="row" style={{ alignItems: "flex-start", gap: 18 }}>
            <Gauge value={pct} label="요건 충족" size={96} />
            <div style={{ flex: 1 }}>
              <div className="card-h" style={{ marginBottom: 6 }}>
                <h2>{doneCount}/{certificationRequirements.length}개 요건 충족</h2>
                <span className="sp" />
                {allDone ? <Badge variant="ok">인증 신청 가능</Badge> : <Badge variant="mute">진행 중</Badge>}
              </div>
              <p className="t2 fs-sm mb0" style={{ lineHeight: 1.7 }}>
                {allDone
                  ? "모든 요건을 채웠습니다. 아래에서 인증을 신청하면 검토위원 확인 후 연구자 트랙이 열립니다."
                  : "왜 잠겨 있나요 — 연구자 트랙은 실제 논문 작업을 다루기 때문에, 최소한의 읽기·쓰기·방법론 기초를 먼저 확인합니다."}
              </p>
              {allDone ? (
                <LinkButton href="/rdos" variant="primary" size="sm" className="mt3">
                  인증 신청하기
                  <Icon name="medal" size={13} />
                </LinkButton>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-h">
            <h3>검토 절차</h3>
            <span className="sp" />
            <span className="fs-cap t3">영업일 3–5일</span>
          </div>
          <div className="pipe mb4">
            <span className={allDone ? "on" : undefined}>제출</span>
            <span>자동 검토</span>
            <span>검토위원 확인</span>
            <span>승인</span>
          </div>
          <p className="fs-cap t2 mb0" style={{ lineHeight: 1.75 }}>
            자동 검토는 즉시 진행되고, 검토위원 확인은 영업일 기준 3~5일이 걸립니다. 승인되면 이메일로 알려드리고
            연구자 트랙 메뉴가 자동으로 열립니다.
          </p>
        </Card>
      </div>

      <div className="grid g-wide">
        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>6개 요건</h3>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {certificationRequirements.map((r) => {
                const linked = HREF[r.id];
                const linkedPct = linked ? courseProgress[r.id] : undefined;
                return (
                  <div
                    key={r.id}
                    className="dx"
                    style={r.done ? { borderColor: "rgba(62,207,178,.28)", background: "rgba(62,207,178,.045)" } : undefined}
                  >
                    <div className="dx-h">
                      <span style={{ color: r.done ? "var(--ok)" : "var(--t3)" }}>
                        <Icon name={r.done ? "check" : "clock"} size={15} />
                      </span>
                      <b className="tt" style={{ margin: 0 }}>
                        {r.label}
                      </b>
                      <span className="loc">{r.done ? "충족됨" : `약 ${r.minutes}분`}</span>
                    </div>
                    {!r.done && typeof linkedPct === "number" ? (
                      <div className="bar mt2">
                        <i style={{ width: `${linkedPct}%` }} />
                      </div>
                    ) : null}
                    {!r.done && linked ? (
                      <div className="dx-acts">
                        <LinkButton href={linked} size="sm">
                          이어서 채우기
                        </LinkButton>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <div className="card-h">
              <h3>가장 빨리 채울 수 있는 요건</h3>
            </div>
            {fastest.length === 0 ? (
              <p className="fs-cap t3 mb0">모든 요건을 이미 채웠습니다.</p>
            ) : (
              <div className="list">
                {fastest.map((r) => (
                  <div key={r.id} className="li">
                    <div className="t">
                      <b>{r.label}</b>
                      <span>약 {r.minutes}분 소요</span>
                    </div>
                    {HREF[r.id] ? (
                      <LinkButton href={HREF[r.id]} size="sm">
                        시작
                      </LinkButton>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="card-h">
              <h3>인증 후 열리는 기능 미리보기</h3>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {RESEARCHER_PREVIEW.map((f) => (
                <div key={f.label} className="row glass-flat" style={{ padding: "10px 12px", gap: 10 }}>
                  <span style={{ color: "var(--t3)" }}>
                    <Icon name={f.icon} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b className="fs-sm" style={{ display: "block", color: "var(--t1)" }}>
                      {f.label}
                    </b>
                    <span className="fs-cap t3">{f.desc}</span>
                  </div>
                  <Icon name="lock" size={14} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
