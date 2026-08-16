import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "chart3" | "destructive";
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  primary: "text-primary",
  accent: "text-accent",
  chart3: "text-chart-3",
  destructive: "text-destructive",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "primary" }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-4xl leading-none tracking-wide text-foreground">
            {value}
          </p>
          {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={`rounded-lg bg-secondary p-2 ${toneClass[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
      <span
        className={`absolute inset-x-0 bottom-0 h-1 ${tone === "accent" ? "bg-accent" : tone === "destructive" ? "bg-destructive" : tone === "chart3" ? "bg-chart-3" : "bg-primary"}`}
      />
    </div>
  );
}
