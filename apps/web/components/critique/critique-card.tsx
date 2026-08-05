"use client";

import { cn } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icons";
import { scrollToMarker } from "@/components/bench/marker";
import type { CritiqueCardDraft } from "@/lib/critique-draft";

export type CritiqueType = "logic" | "evidence" | "concept" | "style" | "structure";

export const CRITIQUE_TYPES: { id: CritiqueType; label: string; badge: BadgeVariant }[] = [
  { id: "logic", label: "논리오류", badge: "danger" },
  { id: "evidence", label: "근거부족", badge: "warn" },
  { id: "concept", label: "개념수정", badge: "info" },
  { id: "style", label: "문체수정", badge: "info" },
  { id: "structure", label: "구조수정", badge: "ok" },
];

export function critiqueTypeInfo(id: string) {
  return CRITIQUE_TYPES.find((t) => t.id === id) ?? CRITIQUE_TYPES[0];
}

const STATUS_PIPE: { id: CritiqueCardDraft["status"]; label: string }[] = [
  { id: "open", label: "OPEN" },
  { id: "in-revision", label: "수정중" },
  { id: "resubmitted", label: "재제출" },
  { id: "approved", label: "승인" },
];

/** 5가지 유형 + OPEN→수정중→재제출→승인 파이프라인을 유지하는 크리틱 카드. */
export function CritiqueCard({
  card,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onSaveNote,
  onStatusChange,
  onDelete,
  onJumpToSource,
}: {
  card: CritiqueCardDraft;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onStartEdit: () => void;
  onSaveNote: () => void;
  onStatusChange: (status: CritiqueCardDraft["status"]) => void;
  onDelete: () => void;
  onJumpToSource: () => void;
}) {
  const info = critiqueTypeInfo(card.type);
  return (
    <div id={`crq-${card.id}`} className={cn("crq", `t-${card.type}`)}>
      <div className="crq-h">
        <span className="no">#{card.num}</span>
        <Badge variant={info.badge}>{info.label}</Badge>
        <span className="st">
          <span className="pipe">
            {STATUS_PIPE.map((s) => (
              <span
                key={s.id}
                className={cn(s.id === card.status && "on")}
                role="button"
                tabIndex={0}
                onClick={() => onStatusChange(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onStatusChange(s.id);
                }}
              >
                {s.label}
              </span>
            ))}
          </span>
        </span>
      </div>

      {card.text ? <blockquote>&ldquo;{card.text}&rdquo;</blockquote> : null}

      {isEditing ? (
        <div className="col" style={{ gap: 8 }}>
          <Textarea value={editValue} onChange={(e) => onEditValueChange(e.target.value)} rows={3} />
          <Button size="sm" variant="primary" onClick={onSaveNote}>
            저장
          </Button>
        </div>
      ) : (
        <p className="cmt">{card.note || "코멘트가 아직 없습니다."}</p>
      )}

      <div className="crq-f">
        <Button size="sm" variant="ghost" onClick={() => scrollToMarker(card.id)}>
          <Icon name="link" size={12} /> 원문에서 보기
        </Button>
        {card.pageNum ? (
          <Button size="sm" variant="ghost" onClick={onJumpToSource}>
            {card.pageNum}쪽으로
          </Button>
        ) : null}
        {!isEditing ? (
          <Button size="sm" onClick={onStartEdit}>
            코멘트 수정
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onDelete}>
          삭제
        </Button>
        <span className="who">{card.pageNum ? `${card.pageNum}쪽` : "위치 미상"}</span>
      </div>
    </div>
  );
}
