import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full bg-primary" />
          lead
          <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            beta
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center px-5 py-8 lg:py-12">
        {children}
      </main>
    </div>
  );
}
