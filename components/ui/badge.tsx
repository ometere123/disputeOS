import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-judgement-cyan/40 bg-judgement-cyan/10 text-judgement-cyan",
        amber: "border-dispute-amber/40 bg-dispute-amber/10 text-dispute-amber",
        purple: "border-appeal-purple/40 bg-appeal-purple/10 text-appeal-purple",
        green: "border-settlement-green/40 bg-settlement-green/10 text-settlement-green",
        red: "border-fault-red/40 bg-fault-red/10 text-fault-red",
        muted: "border-border-strong bg-panel-ash text-muted",
        outline: "border-border-strong text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
