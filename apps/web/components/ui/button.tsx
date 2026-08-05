import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "primary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "btn",
    variant === "primary" && "btn-primary",
    variant === "ghost" && "btn-ghost",
    size === "sm" && "btn-sm",
    size === "lg" && "btn-lg",
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(function Button({ variant = "default", size = "md", className, type = "button", ...rest }, ref) {
  return <button ref={ref} type={type} className={classes(variant, size, className)} {...rest} />;
});

/** 목적지가 있는 버튼. 화면 이동은 반드시 링크로 만든다(새 탭·뒤로가기 보존). */
export const LinkButton = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: ButtonVariant; size?: ButtonSize }
>(function LinkButton({ href, variant = "default", size = "md", className, ...rest }, ref) {
  return <Link ref={ref} href={href} className={classes(variant, size, className)} {...rest} />;
});

/** 아이콘 전용 버튼 — aria-label 이 필수다(규칙 R6). */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: ButtonVariant; size?: ButtonSize }
>(function IconButton({ label, variant = "ghost", size = "sm", className, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(classes(variant, size, className), "btn-icon")}
      {...rest}
    />
  );
});
