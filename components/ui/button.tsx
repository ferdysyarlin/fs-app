import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:     "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm",
  secondary:   "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border",
  ghost:       "hover:bg-muted text-muted-foreground hover:text-foreground",
  destructive: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm",
  outline:     "border border-border hover:bg-muted text-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm:   "h-8 px-3 text-xs gap-1.5",
  md:   "h-9 px-4 text-sm gap-2",
  lg:   "h-11 px-6 text-base gap-2",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium",
          "transition-all duration-150 active:scale-[0.97]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {children}
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = "Button";
