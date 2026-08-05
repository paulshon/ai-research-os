import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { scrollToMarker } from "@/components/bench/marker";
import { PROOF_CATEGORY_BADGE, PROOF_CATEGORY_LABEL } from "@/lib/proofread/categories";
import type { Correction } from "@/lib/proofread/engine";

/**
 * 인라인 교정 diff 카드.
 * 확실한 오류(autoApplicable)만 "같은 유형 모두 적용"을 제공한다.
 * 문맥 판단이 필요한 항목은 반드시 개별 확인을 거치도록 안내문을 붙인다.
 */
export function CorrectionCard({
  correction,
  markerLabel,
  location,
  sameTypeCount,
  onApply,
  onApplyAllSameType,
  onIgnore,
}: {
  correction: Correction;
  markerLabel: string;
  location: string;
  sameTypeCount: number;
  onApply: () => void;
  onApplyAllSameType: () => void;
  onIgnore: () => void;
}) {
  const hasFix = correction.suggested.trim().length > 0;

  return (
    <div id={`dx-${correction.id}`} className="diff">
      <div className="diff-h">
        <Badge variant={PROOF_CATEGORY_BADGE[correction.category]}>
          {PROOF_CATEGORY_LABEL[correction.category]}
        </Badge>
        <Badge variant="mute">{correction.subLabel}</Badge>
        <span className="rule">
          표시 {markerLabel} · {location}
        </span>
      </div>
      <div className="diff-b">
        <div className="dl old">
          <i>−</i>
          <span>{renderWithHighlight(correction.quote, correction.original, "del")}</span>
        </div>
        {hasFix ? (
          <div className="dl new">
            <i>+</i>
            <span>
              {renderWithHighlight(
                correction.quote.replace(correction.original, correction.suggested),
                correction.suggested,
                "ins",
              )}
            </span>
          </div>
        ) : null}
        <div className="diff-why">
          <b>{correction.reason}</b>
        </div>
      </div>
      <div className="diff-f">
        <Button size="sm" variant="ghost" onClick={() => scrollToMarker(correction.id)}>
          원문에서 보기
        </Button>
        {hasFix ? (
          <Button size="sm" variant="primary" onClick={onApply}>
            적용
          </Button>
        ) : null}
        {hasFix && correction.autoApplicable && sameTypeCount > 1 ? (
          <Button size="sm" onClick={onApplyAllSameType}>
            같은 유형 {sameTypeCount}건 모두 적용
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onIgnore}>
          무시
        </Button>
        {!correction.autoApplicable ? (
          <span className="fs-cap t3" style={{ width: "100%", marginTop: 4 }}>
            문맥 판단이 필요한 항목입니다 — 하나씩 검토한 뒤 적용하세요.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function renderWithHighlight(sentence: string, target: string, tag: "del" | "ins") {
  if (!target) return sentence;
  const idx = sentence.indexOf(target);
  if (idx < 0) return sentence;
  const before = sentence.slice(0, idx);
  const after = sentence.slice(idx + target.length);
  const Tag = tag;
  return (
    <>
      {before}
      <Tag>{target}</Tag>
      {after}
    </>
  );
}
