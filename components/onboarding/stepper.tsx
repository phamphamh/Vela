import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const steps = ["Connect", "Repository", "Audit", "Review"] as const;
export type StepKey = "connect" | "repo" | "audit" | "report";

const order: StepKey[] = ["connect", "repo", "audit", "report"];

export function Stepper({ current }: { current: StepKey }) {
  const activeIndex = order.indexOf(current);

  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px w-6 sm:w-10",
                  i < activeIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
