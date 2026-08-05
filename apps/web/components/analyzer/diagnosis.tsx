import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icons";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { scrollToMarker, type MarkerSeverity } from "@/components/bench/marker";

export interface DiagnosisAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface DiagnosisItem {
  id: string;
  severity: MarkerSeverity;
  axisLabel: string;
  title: string;
  detail: string;
  location: string;
  quote: string;
  actions: DiagnosisAction[];
}

const SEV_LABEL: Record<MarkerSeverity, string> = {
  danger: "위험",
  warn: "주의",
  info: "참고",
  ok: "양호",
};

const SEV_BADGE: Record<MarkerSeverity, BadgeVariant> = {
  danger: "danger",
  warn: "warn",
  info: "info",
  ok: "ok",
};

/**
 * 진단 카드. severity/axisLabel/location/quote(원문 실재)/actions 중
 * 하나라도 없으면 렌더링하지 않는다 — 근거 없는 지적을 화면에 내보내지 않기 위함.
 */
export function Diagnosis({ item, sourceText }: { item: DiagnosisItem; sourceText: string }) {
  const quote = item.quote?.trim() ?? "";
  const hasEvidence = quote.length > 0 && sourceText.includes(quote);
  const complete =
    !!item.severity && !!item.axisLabel && !!item.location && hasEvidence && item.actions.length > 0;

  if (!complete) return null;

  return (
    <div id={`dx-${item.id}`} className={cn("dx", `sev-${item.severity}`)}>
      <div className="dx-h">
        <Badge variant={SEV_BADGE[item.severity]}>{SEV_LABEL[item.severity]}</Badge>
        <Badge variant="mute">{item.axisLabel}</Badge>
        <span className="loc">{item.location}</span>
      </div>
      <b className="tt">{item.title}</b>
      <p className="t2 fs-sm">{item.detail}</p>
      <div className="crit">
        <em>근거 인용</em>
        <span>&ldquo;{quote}&rdquo;</span>
      </div>
      <div className="dx-acts">
        <Button size="sm" variant="ghost" onClick={() => scrollToMarker(item.id)}>
          <Icon name="link" size={12} /> 원문에서 보기
        </Button>
        {item.actions.map((a, i) =>
          a.href ? (
            <LinkButton key={i} href={a.href} size="sm" variant="ghost">
              {a.label}
            </LinkButton>
          ) : (
            <Button key={i} size="sm" variant="ghost" onClick={a.onClick}>
              {a.label}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
