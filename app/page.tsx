import {
  ArrowUpRight,
  Check,
  GitBranch,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* --- small building blocks for the styleguide ------------------------- */

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-12">
      <div className="mb-6 max-w-2xl">
        <Kicker>{id}</Kicker>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  className,
  border,
}: {
  name: string;
  className: string;
  border?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={`h-14 w-full rounded-md ${className} ${
          border ? "border border-border" : ""
        }`}
      />
      <div className="font-mono text-[11px] text-muted-foreground">{name}</div>
    </div>
  );
}

/* --- page ------------------------------------------------------------- */

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-5">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span className="size-2.5 rounded-full bg-primary" />
            lead
          </a>
          <span className="font-mono text-xs text-muted-foreground">
            / design system
          </span>
          <nav className="ml-auto hidden items-center gap-1 text-sm sm:flex">
            <Button variant="ghost" size="sm" asChild>
              <a href="#color">Color</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#type">Type</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#components">Components</a>
            </Button>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5">
        {/* hero */}
        <section className="py-14">
          <Kicker>Warm Precision</Kicker>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            A clean, data-forward system for shipping conversion experiments.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Dev-tool precision — tight 6px radii, hairline borders, tabular
            numerals — on a warm beige canvas with a confident orange accent.
            Tokenized for light and dark.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Button>
              <GitBranch className="size-4" />
              Connect GitHub
            </Button>
            <Button variant="outline">
              View docs
              <ArrowUpRight className="size-4" />
            </Button>
            <Badge variant="secondary" className="ml-1 gap-1.5">
              <Sparkles className="size-3" />
              v0.1
            </Badge>
          </div>
        </section>

        <Separator />

        {/* color */}
        <Section
          id="color"
          title="Color tokens"
          description="Semantic, theme-aware tokens in oklch. Everything maps through these — no raw hex in components."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            <Swatch name="background" className="bg-background" border />
            <Swatch name="card" className="bg-card" border />
            <Swatch name="primary" className="bg-primary" />
            <Swatch name="secondary" className="bg-secondary" />
            <Swatch name="muted" className="bg-muted" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="foreground" className="bg-foreground" />
            <Swatch name="destructive" className="bg-destructive" />
            <Swatch name="success" className="bg-success" />
            <Swatch name="border" className="bg-border" border />
          </div>

          <div className="mt-6">
            <Kicker>Chart palette</Kicker>
            <div className="mt-3 grid grid-cols-5 gap-4">
              <Swatch name="chart-1" className="bg-chart-1" />
              <Swatch name="chart-2" className="bg-chart-2" />
              <Swatch name="chart-3" className="bg-chart-3" />
              <Swatch name="chart-4" className="bg-chart-4" />
              <Swatch name="chart-5" className="bg-chart-5" />
            </div>
          </div>
        </Section>

        <Separator />

        {/* type */}
        <Section
          id="type"
          title="Typography"
          description="Geist for UI, Geist Mono for data and labels. Numerals are tabular."
        >
          <div className="space-y-4">
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                display
              </span>
              <span className="text-4xl font-semibold tracking-tight">
                Numbers go up.
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                h1
              </span>
              <span className="text-3xl font-semibold tracking-tight">
                Experiments overview
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                h2
              </span>
              <span className="text-2xl font-semibold tracking-tight">
                Paywall variant B
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                body
              </span>
              <span className="max-w-xl text-base">
                The orchestrator reads the codebase, proposes a change, and ships
                it as a measurable variant.
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                small
              </span>
              <span className="text-sm text-muted-foreground">
                Secondary copy and helper text.
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                mono
              </span>
              <span className="font-mono text-sm tabular-nums">
                +12.4% · 3,201 → 401 · p=0.03
              </span>
            </div>
          </div>
        </Section>

        <Separator />

        {/* radius + elevation */}
        <Section
          id="surface"
          title="Radius & elevation"
          description="A small base radius keeps the UI sharp; shadows are warm and low-spread."
        >
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <Kicker>Radius</Kicker>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {[
                  ["sm", "rounded-sm"],
                  ["md", "rounded-md"],
                  ["lg", "rounded-lg"],
                  ["xl", "rounded-xl"],
                  ["2xl", "rounded-2xl"],
                ].map(([name, cls]) => (
                  <div key={name} className="space-y-1.5">
                    <div
                      className={`size-16 border border-border bg-secondary ${cls}`}
                    />
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Kicker>Elevation</Kicker>
              <div className="mt-3 flex flex-wrap items-end gap-5">
                {[
                  ["xs", "shadow-xs"],
                  ["sm", "shadow-sm"],
                  ["md", "shadow-md"],
                  ["lg", "shadow-lg"],
                ].map(([name, cls]) => (
                  <div key={name} className="space-y-1.5">
                    <div className={`size-16 rounded-lg bg-card ${cls}`} />
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Separator />

        {/* components */}
        <Section
          id="components"
          title="Components"
          description="shadcn/ui primitives, themed by the tokens above."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {/* buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Variants and sizes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" aria-label="branch">
                    <GitBranch className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* badges */}
            <Card>
              <CardHeader>
                <CardTitle>Badges & status</CardTitle>
                <CardDescription>Compact state labels.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2.5">
                <Badge>Default</Badge>
                <Badge variant="secondary">Draft</Badge>
                <Badge variant="outline">Onboarding</Badge>
                <Badge variant="destructive">Abandoned</Badge>
                <Badge className="gap-1.5 bg-success text-success-foreground">
                  <span className="size-1.5 rounded-full bg-current" />
                  Live
                </Badge>
                <Badge
                  variant="secondary"
                  className="gap-1 font-mono tabular-nums"
                >
                  <TrendingUp className="size-3" />
                  +12.4%
                </Badge>
              </CardContent>
            </Card>

            {/* form */}
            <Card>
              <CardHeader>
                <CardTitle>Form controls</CardTitle>
                <CardDescription>Inputs, select, switch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="repo">Repository</Label>
                  <Input id="repo" placeholder="acme/web" />
                </div>
                <div className="space-y-1.5">
                  <Label>Surface</Label>
                  <Select defaultValue="landing">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a surface" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landing">Landing</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="paywall">Paywall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                  <Label htmlFor="auto" className="text-sm font-normal">
                    Auto-launch winning variant
                  </Label>
                  <Switch id="auto" defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* tabs + tooltip + skeleton */}
            <Card>
              <CardHeader>
                <CardTitle>Tabs, tooltip, loading</CardTitle>
                <CardDescription>Navigation and async states.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="results">
                  <TabsList>
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                    <TabsTrigger value="diff">Diff</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="results"
                    className="pt-3 text-sm text-muted-foreground"
                  >
                    Treatment beats control by{" "}
                    <span className="font-mono tabular-nums text-foreground">
                      +12.4%
                    </span>{" "}
                    at 95% confidence.
                  </TabsContent>
                  <TabsContent
                    value="variants"
                    className="pt-3 text-sm text-muted-foreground"
                  >
                    Control · Treatment A · Treatment B
                  </TabsContent>
                  <TabsContent
                    value="diff"
                    className="pt-3 font-mono text-xs text-muted-foreground"
                  >
                    + headline: &quot;Ship faster&quot; → &quot;Ship today&quot;
                  </TabsContent>
                </Tabs>
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm">
                          Hover me
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Confidence: 95%</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Separator />

        {/* in context */}
        <Section
          id="in-context"
          title="In context"
          description="The tokens and components assembled into a real product surface."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {/* experiment card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Paywall · pricing emphasis</CardTitle>
                    <CardDescription>acme/web · experiment #142</CardDescription>
                  </div>
                  <Badge className="gap-1.5 bg-success text-success-foreground">
                    <span className="size-1.5 rounded-full bg-current" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="font-mono text-xs text-muted-foreground">
                      uplift
                    </div>
                    <div className="mt-1 flex items-center gap-1 font-mono text-2xl font-semibold tabular-nums text-primary">
                      <TrendingUp className="size-4" />
                      +12.4%
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="font-mono text-xs text-muted-foreground">
                      visitors
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                      3,201
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="font-mono text-xs text-muted-foreground">
                      signups
                    </div>
                    <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                      401
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                    <span>conversion · treatment</span>
                    <span className="tabular-nums text-foreground">62%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: "62%" }}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="gap-2.5">
                <Button>
                  <GitBranch className="size-4" />
                  Launch variant
                </Button>
                <Button variant="outline">View diff</Button>
              </CardFooter>
            </Card>

            {/* agent activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agent activity</CardTitle>
                <CardDescription>Orchestrator, last run</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  "Analyzed onboarding flow",
                  "Drafted 2 paywall variants",
                  "Opened PR #318",
                  "Started experiment #142",
                ].map((step) => (
                  <div key={step} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="size-3" />
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  View full log
                  <ArrowUpRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">lead</span> — Warm
            Precision design system
          </span>
          <span className="font-mono text-xs">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
