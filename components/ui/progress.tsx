"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  color?: string;
}

export function Progress({ value, label, showPercent, color = "hsl(var(--primary))", className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercent) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-xs font-medium text-foreground">{label}</span>}
          {showPercent && (
            <span className="text-xs text-muted-foreground">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        className="w-full h-2 rounded-full overflow-hidden bg-muted"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? "hsl(142, 76%, 50%)"
              : `linear-gradient(90deg, ${color}, hsl(262,83%,65%))`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

// Tabs Component
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={cn("flex gap-1 p-1 rounded-xl bg-muted border border-border", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
            active === tab.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabContent({ active, id, children }: { active: string; id: string; children: React.ReactNode }) {
  if (active !== id) return null;
  return <div className="animate-fade-in">{children}</div>;
}
