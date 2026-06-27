import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ExperimentStatus =
  | "DRAFT"
  | "QUEUED"
  | "RUNNING"
  | "CONCLUSIVE"
  | "COMPLETED"
  | "ABANDONED";

const LABELS: Record<ExperimentStatus, string> = {
  DRAFT: "Draft",
  QUEUED: "Queued",
  RUNNING: "Running",
  CONCLUSIVE: "Conclusive",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ExperimentStatus;
  className?: string;
}) {
  const label = LABELS[status];

  if (status === "RUNNING") {
    return (
      <Badge
        className={cn("gap-1.5 bg-success text-success-foreground", className)}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        {label}
      </Badge>
    );
  }
  if (status === "CONCLUSIVE") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5 border-primary/40 text-primary", className)}
      >
        <span className="size-1.5 rounded-full bg-current" />
        {label}
      </Badge>
    );
  }
  if (status === "COMPLETED") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 border-success/40 text-success [&]:bg-success/10",
          className,
        )}
      >
        {label}
      </Badge>
    );
  }
  if (status === "ABANDONED") {
    return (
      <Badge
        variant="outline"
        className={cn("text-muted-foreground", className)}
      >
        {label}
      </Badge>
    );
  }
  // DRAFT / QUEUED
  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}

/** Small inline confidence/progress bar used across experiment views. */
export function MeterBar({
  value,
  className,
  tone = "primary",
}: {
  value: number; // 0–100
  className?: string;
  tone?: "primary" | "success" | "muted";
}) {
  const fill =
    tone === "success"
      ? "bg-success"
      : tone === "muted"
        ? "bg-muted-foreground/50"
        : "bg-primary";
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
