"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/research-data";
import { Icon } from "@/components/ui/icons";
import { Button, LinkButton } from "@/components/ui/button";
import { MacroFlow } from "./macro-flow";
import { MicroList } from "./micro-list";

/**
 * 장 카드 아코디언 — 4요소(질문·거시·미시·패턴)를 모두 펼쳐 보여준다.
 */
export function ChapterCard({
  chapter,
  index,
  open,
  onToggle,
  onAskAi,
  askAiLoading,
}: {
  chapter: Chapter;
  index: number;
  open: boolean;
  onToggle: () => void;
  onAskAi: () => void;
  askAiLoading?: boolean;
}) {
  return (
    <div className={cn("ch", open && "open")}>
      <button
        type="button"
        className="ch-h"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="ch-n" style={{ background: `${chapter.color}22`, color: chapter.color }}>
          {index + 1}
        </div>
        <div className="ch-t">
          <b>{chapter.title}</b>
          <span>{chapter.desc}</span>
        </div>
        <Icon name="caret" size={14} className="caret" />
      </button>

      {open ? (
        <div className="ch-b">
          <div className="ch-q">
            <em>핵심 질문</em>
            <p>{chapter.question}</p>
          </div>

          <h6 className="lb">
            <Icon name="route" size={12} /> 거시 구조
          </h6>
          <MacroFlow value={chapter.macro} />

          <h6 className="lb">
            <Icon name="list" size={12} /> 미시 구조
          </h6>
          <MicroList items={chapter.micro} />

          <div className="pats">
            <div className="pat good">
              <h6>
                <Icon name="check" size={12} /> 좋은 패턴
              </h6>
              <div className="chips">
                {chapter.goodPatterns.map((g) => (
                  <i key={g}>{g}</i>
                ))}
              </div>
            </div>
            <div className="pat bad">
              <h6>
                <Icon name="alert" size={12} /> 주의할 패턴
              </h6>
              <div className="chips">
                {chapter.badPatterns.map((b) => (
                  <i key={b}>{b}</i>
                ))}
              </div>
            </div>
          </div>

          <div className="ch-f">
            <Button size="sm" onClick={onAskAi} disabled={askAiLoading}>
              <Icon name="spark" size={13} />
              {askAiLoading ? "문의 중…" : "AI 구조 상담"}
            </Button>
            <LinkButton href="/writing" variant="ghost" size="sm">
              <Icon name="pen" size={13} /> 이 장 집필로
            </LinkButton>
            <LinkButton href="/analyzer" variant="ghost" size="sm">
              <Icon name="chart" size={13} /> 내 논문과 대조
            </LinkButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
