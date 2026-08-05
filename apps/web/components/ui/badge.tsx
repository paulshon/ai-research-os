import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "ok" | "warn" | "danger" | "info" | "mute";

const CLASS: Record<BadgeVariant, string> = {
  ok: "b-ok",
  warn: "b-warn",
  danger: "b-danger",
  info: "b-info",
  mute: "b-mute",
};

/**
 * 상태 배지.
 * 색만으로 정보를 전달하지 않는다 — 아이콘이나 텍스트를 반드시 함께 넣는다.
 */
export function Badge({
  variant = "mute",
  children,
  className,
  ...rest
}: { variant?: BadgeVariant; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("badge", CLASS[variant], className)} {...rest}>
      {children}
    </span>
  );
}
