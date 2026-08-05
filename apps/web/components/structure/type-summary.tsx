import { Badge } from "@/components/ui/badge";

/** 선택된 유형의 요약 헤더 — 배지 색은 research-data 의 유형 고유색을 그대로 쓴다. */
export function TypeSummary({
  num,
  name,
  color,
  categoryLabel,
  chapterCount,
}: {
  num: number | null;
  name: string;
  color: string;
  categoryLabel: string;
  chapterCount: number;
}) {
  return (
    <div className="tinfo">
      <div className="tbadge" style={{ background: `${color}22`, color }}>
        {num}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <b className="disp fs-lg">{name}</b>
          <Badge variant="mute">{categoryLabel}</Badge>
        </div>
        <p className="t2 fs-sm mt2">
          {chapterCount}개 장 구조 · 질문 · 거시 구조 · 미시 구조 · 좋은/주의 패턴 제공
        </p>
      </div>
    </div>
  );
}
