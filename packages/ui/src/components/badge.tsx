import { cn } from "../styles/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-white/60 border border-white/[0.08]",
        accent: "bg-[#4a6cf7]/10 text-[#8aa4ff] border border-[#4a6cf7]/20",
        success: "bg-[#5ebd7c]/10 text-[#5ebd7c] border border-[#5ebd7c]/20",
        warning: "bg-[#e8b84b]/10 text-[#e8b84b] border border-[#e8b84b]/20",
        danger: "bg-[#ff7066]/10 text-[#ff7066] border border-[#ff7066]/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
