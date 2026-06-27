"use client";

import * as React from "react";
import {
  Check,
  CreditCard,
  FolderGit2 as Github,
  KeyRound,
  Plug,
  RefreshCw,
  Rocket,
  Trash2,
  Users,
} from "lucide-react";

import { InstallSdk } from "@/components/dashboard/install-sdk";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sections = [
  { id: "repo", label: "Repository", icon: Github },
  { id: "deploy", label: "Deploy", icon: Rocket },
  { id: "sdk", label: "SDK & tracking", icon: KeyRound },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function SectionShell({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: typeof Github;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="sm:w-[280px] sm:shrink-0">{children}</div>
    </div>
  );
}

const integrations = [
  {
    name: "GitHub",
    icon: Github,
    desc: "Repo access, PRs, and branch deploys.",
    connected: true,
    meta: "acme org · 3 repos",
  },
  {
    name: "Vercel",
    icon: Rocket,
    desc: "Detect preview + production deploys.",
    connected: true,
    meta: "acme-web project",
  },
  {
    name: "Slack",
    icon: Plug,
    desc: "Notify on drafts, ships, and regressions.",
    connected: false,
    meta: null,
  },
];

const team = [
  { name: "Lirone Levy", email: "you@company.com", role: "Owner", initials: "LL" },
  { name: "Maya Cohen", email: "maya@company.com", role: "Admin", initials: "MC" },
  { name: "Tom Reyes", email: "tom@company.com", role: "Member", initials: "TR" },
];

export default function SettingsPage() {
  const [autoDraft, setAutoDraft] = React.useState(true);
  const [autoPr, setAutoPr] = React.useState(true);
  const [notify, setNotify] = React.useState(true);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project connection, deploy, tracking, and team for{" "}
          <span className="font-mono">acme/web</span>.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
        {/* sub-nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-0.5">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {s.label}
                </a>
              );
            })}
          </div>
        </nav>

        {/* sections */}
        <div className="min-w-0 space-y-6">
          {/* repository */}
          <SectionShell
            id="repo"
            icon={Github}
            title="Connected repository"
            description="The codebase the agent reads, edits, and opens PRs against."
          >
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/20 p-3">
              <Github className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    acme/web
                  </span>
                  <Badge className="gap-1 bg-success text-success-foreground">
                    <Check className="size-3" />
                    Connected
                  </Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  github.com/acme/web · installed 14d ago
                </p>
              </div>
              <Button size="sm" variant="outline">
                <RefreshCw className="size-3.5" />
                Re-sync
              </Button>
            </div>
            <FieldRow
              label="Base branch"
              hint="Branch the agent targets PRs against."
            >
              <Select defaultValue="main">
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow
              label="Branch prefix"
              hint="Prefix for agent-created branches."
            >
              <Input defaultValue="lead/" className="font-mono" />
            </FieldRow>
          </SectionShell>

          {/* deploy */}
          <SectionShell
            id="deploy"
            icon={Rocket}
            title="Deploy configuration"
            description="How approved variants reach production."
          >
            <FieldRow
              label="Auto-draft variants"
              hint="Let the agent draft variants without being asked."
            >
              <div className="flex sm:justify-end">
                <Switch checked={autoDraft} onCheckedChange={setAutoDraft} />
              </div>
            </FieldRow>
            <Separator />
            <FieldRow
              label="Open PRs automatically"
              hint="Open the PR on approval; your CI deploys it."
            >
              <div className="flex sm:justify-end">
                <Switch checked={autoPr} onCheckedChange={setAutoPr} />
              </div>
            </FieldRow>
            <Separator />
            <FieldRow
              label="Production URL"
              hint="Where the SDK confirms variants are live."
            >
              <Input defaultValue="https://acme.com" className="font-mono" />
            </FieldRow>
          </SectionShell>

          {/* sdk */}
          <SectionShell
            id="sdk"
            icon={KeyRound}
            title="SDK & tracking"
            description="Drop our lightweight script on your site to track visitors, clicks, and conversions."
          >
            <InstallSdk />
          </SectionShell>

          {/* integrations */}
          <SectionShell
            id="integrations"
            icon={Plug}
            title="Integrations"
            description="Connect the tools the agent and the loop depend on."
          >
            <div className="divide-y divide-border">
              {integrations.map((it) => {
                const Icon = it.icon;
                return (
                  <div
                    key={it.name}
                    className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{it.name}</span>
                        {it.connected && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {it.meta}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={it.connected ? "outline" : "default"}
                    >
                      {it.connected ? "Manage" : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </SectionShell>

          {/* team */}
          <SectionShell
            id="team"
            icon={Users}
            title="Team"
            description="People with access to this project."
          >
            <div className="flex items-center justify-between">
              <FieldRow
                label="Notify the team on key events"
                hint="Drafts ready, experiments shipped, regressions."
              >
                <div className="flex sm:justify-end">
                  <Switch checked={notify} onCheckedChange={setNotify} />
                </div>
              </FieldRow>
            </div>
            <Separator />
            <div className="divide-y divide-border">
              {team.map((m) => (
                <div
                  key={m.email}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-secondary text-xs font-medium">
                      {m.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {m.email}
                    </div>
                  </div>
                  <Badge
                    variant={m.role === "Owner" ? "secondary" : "outline"}
                    className="font-normal"
                  >
                    {m.role}
                  </Badge>
                  {m.role !== "Owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline">
              <Users className="size-3.5" />
              Invite member
            </Button>
          </SectionShell>

          {/* billing */}
          <SectionShell
            id="billing"
            icon={CreditCard}
            title="Billing"
            description="Plan and usage."
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/20 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Growth</span>
                  <Badge variant="secondary">Current plan</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Up to 10 concurrent experiments · 1M tracked events / mo.
                </p>
              </div>
              <Button size="sm" variant="outline" disabled>
                Manage plan
              </Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Billing is not enabled in this environment yet.
            </p>
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
