import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLElement> & { as?: ElementType; flat?: boolean }>(
  function Card({ as, flat, className, children, ...rest }, ref) {
    const Tag = (as ?? "section") as ElementType;
    return (
      <Tag ref={ref} className={cn(flat ? "glass-flat" : "glass", "card", className)} {...rest}>
        {children}
      </Tag>
    );
  },
);

/** 카드 제목 줄. right 슬롯은 제목 오른쪽 끝에 붙는다. */
export function CardHeader({
  title,
  level = 2,
  right,
  className,
}: {
  title: ReactNode;
  level?: 2 | 3;
  right?: ReactNode;
  className?: string;
}) {
  const H = (level === 2 ? "h2" : "h3") as ElementType;
  return (
    <div className={cn("card-h", className)}>
      <H>{title}</H>
      <div className="sp" />
      {right}
    </div>
  );
}

export function CardSub({ children }: { children: ReactNode }) {
  return <p className="card-sub">{children}</p>;
}
