import Link from "next/link"
import { RefreshCw } from "lucide-react"

const PRODUCT_LINKS = [
  { href: "/#how", label: "How it works", external: false },
  { href: "/#product", label: "The product", external: false },
  { href: "/audit", label: "Free audit", external: false },
]

const COMPANY_LINKS = [
  { href: "/onboarding", label: "Get started", external: false },
  { href: "/#faq", label: "FAQ", external: false },
  { href: "/#compare", label: "Comparison", external: false },
]

function FooterLink({
  href,
  label,
  external,
}: {
  href: string
  label: string
  external: boolean
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-foreground"
      >
        {label}
      </a>
    )
  }
  return (
    <Link href={href} className="transition-colors hover:text-foreground">
      {label}
    </Link>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-start justify-between gap-6 px-6 py-8">
        {/* Brand blurb */}
        <div className="max-w-[280px]">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="inline-flex size-[22px] items-center justify-center rounded-md bg-primary">
              <RefreshCw className="size-3 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <span className="text-[15px] font-semibold">Vela</span>
            <span className="rounded-[5px] border border-border px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
              auto-CRO
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The autonomous CRO agent for B2B SaaS. Audits, drafts, tests, iterates — in your repo.
          </p>
        </div>

        {/* Link columns */}
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5 text-[13.5px] text-muted-foreground">
            <span className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-foreground">
              Product
            </span>
            {PRODUCT_LINKS.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
          <div className="flex flex-col gap-2.5 text-[13.5px] text-muted-foreground">
            <span className="mb-0.5 font-mono text-[11px] uppercase tracking-wide text-foreground">
              Company
            </span>
            {COMPANY_LINKS.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>
      </div>

      {/* Sub-row */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-6 py-4 text-[12.5px] text-muted-foreground">
          <span className="font-mono">© 2026 Vela</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            Audit powered by Claude
          </span>
        </div>
      </div>
    </footer>
  )
}
