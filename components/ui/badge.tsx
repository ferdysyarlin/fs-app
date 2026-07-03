import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: string; // custom hex color
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  danger:  "badge-danger",
  info:    "badge-info",
  outline: "border border-border text-foreground",
};

export function Badge({ className, variant = "default", color, style, children, ...props }: BadgeProps) {
  const customStyle = color ? {
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
    ...style,
  } : style;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        !color && variants[variant],
        className
      )}
      style={customStyle}
      {...props}
    >
      {children}
    </span>
  );
}
