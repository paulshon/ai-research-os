"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

/**
 * AI가 생성한 초안 문단.
 * 점선 카드로 사람이 쓴 문장과 시각적으로 분리하고, 수락하기 전까지는
 * 본문 분량(글자 수)에 포함하지 않는다 — 집계 로직은 store/flow 쪽에서 처리한다.
 */
export function AiDraftBlock({
  content,
  sourceLabels = [],
  onAccept,
  onRetry,
  onDiscard,
  busy,
}: {
  content: string;
  sourceLabels?: string[];
  onAccept: () => void;
  onRetry: () => void;
  onDiscard: () => void;
  busy?: boolean;
}) {
  return (
    <div className="ai-draft">
      <div className="ai-draft-h">
        <Badge variant="info">
          <Icon name="spark" size={11} /> AI 초안 · 수락 전
        </Badge>
        <div className="sp" />
        <Button size="sm" variant="primary" onClick={onAccept} disabled={busy}>
          수락
        </Button>
        <Button size="sm" onClick={onRetry} disabled={busy}>
          다시
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard} disabled={busy}>
          버리기
        </Button>
      </div>
      <p>{content}</p>
      {sourceLabels.length ? (
        <div className="ai-draft-f">
          {sourceLabels.map((s) => (
            <Badge key={s} variant="mute">
              {s}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
