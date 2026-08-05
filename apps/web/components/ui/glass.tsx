import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * 글래스 표면.
 * backdrop-filter: blur(22px) saturate(140%) + 상단 1px 하이라이트(::before, mask-composite:exclude).
 *
 * 성능 주의: backdrop-filter 는 GPU 부담이 크다.
 * 한 화면에 동시에 보이는 .glass 는 12개 이하로 유지하고,
 * glass 안에서는 flat(=.glass-flat) 만 쓴다. 중첩 글래스 금지.
 */
export const Glass = forwardRef<HTMLDivElement, HTMLAttributes<HTMLElement> & { as?: ElementType; flat?: boolean }>(
  function Glass({ as, flat, className, children, ...rest }, ref) {
    const Tag = (as ?? "div") as ElementType;
    return (
      <Tag ref={ref} className={cn(flat ? "glass-flat" : "glass", className)} {...rest}>
        {children}
      </Tag>
    );
  },
);
