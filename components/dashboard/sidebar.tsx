import Link from "next/link";

import { DashboardNav } from "@/components/dashboard/nav";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full bg-primary" />
          lead
        </Link>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          beta
        </span>
      </div>
      <DashboardNav />
    </aside>
  );
}
