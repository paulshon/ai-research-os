import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../styles/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent-2 text-white hover:bg-accent border-transparent",
        outline: "border border-white/10 bg-bg-3 text-white/70 hover:bg-bg-4 hover:text-white",
        ghost: "bg-transparent text-white/60 hover:bg-bg-3 hover:text-white",
        danger: "text-coral border border-coral/30 hover:bg-coral/10",
        gold: "bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
