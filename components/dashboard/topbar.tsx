"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  ChevronsUpDown,
  GitBranch,
  Menu,
  Plus,
} from "lucide-react";

import { DashboardNav } from "@/components/dashboard/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const projects = ["acme/web", "acme/marketing", "acme/docs"];

function ProjectSwitcher() {
  const [current, setCurrent] = React.useState(projects[0]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-normal">
          <GitBranch className="size-4 text-muted-foreground" />
          <span className="font-mono text-xs">{current}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        {projects.map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => setCurrent(p)}
            className="font-mono text-xs"
          >
            <GitBranch className="size-3.5 text-muted-foreground" />
            {p}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="size-3.5" />
          Connect repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-border px-5">
          <span className="size-2.5 rounded-full bg-primary" />
          <SheetTitle className="font-semibold">lead</SheetTitle>
        </SheetHeader>
        <DashboardNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Account"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-secondary text-xs font-medium">
              LL
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>Lirone</span>
          <span className="font-mono text-xs font-normal text-muted-foreground">
            you@company.com
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <MobileNav />
      <ProjectSwitcher />

      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="size-4" />
          New experiment
        </Button>
        <Button
          size="icon"
          className="sm:hidden"
          aria-label="New experiment"
        >
          <Plus className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
