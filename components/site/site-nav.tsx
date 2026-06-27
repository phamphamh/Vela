import Link from "next/link"
import { ArrowRight, RefreshCw } from "lucide-react"

import { BOOKING_URL } from "@/lib/config"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#product", label: "Product" },
  { href: "/#compare", label: "Comparison" },
  { href: "/#faq", label: "FAQ" },
]

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-[60px] max-w-[1160px] items-center justify-between gap-4 px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary shadow-sm">
            <RefreshCw className="size-3.5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="text-base font-semibold tracking-tight">lead</span>
          <span className="rounded-[5px] border border-border px-1.5 py-px font-mono text-[11px] tracking-wide text-muted-foreground">
            auto-CRO
          </span>
        </Link>

        {/* Center links */}
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/audit"
            className="hidden h-[34px] items-center px-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Free audit
          </Link>
          <Button asChild size="lg">
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">
              Book a demo
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>
    </nav>
  )
}
