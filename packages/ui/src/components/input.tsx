import * as React from "react";
import { cn } from "../styles/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border border-white/[0.06] bg-[#1a1e2a] px-4 py-2 text-sm text-white ring-offset-background",
          "placeholder:text-white/25",
          "focus-visible:outline-none focus-visible:border-[#6c8cff] focus-visible:ring-1 focus-visible:ring-[#6c8cff]/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
