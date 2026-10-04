import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Moon, Sun, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="logo-chip grid size-8 place-items-center bg-volt font-display text-[15px] font-extrabold text-primary-foreground">RL</span>
      <span className="font-display text-[19px] font-extrabold tracking-tight">ResumeLens</span>
    </Link>
  );
}

export function AppShell({ children, sidebar }: { children: ReactNode; sidebar?: ReactNode }) {
  const navigate = useNavigate();
  const toggle = () => {
    const l = document.documentElement.classList.toggle("light");
    localStorage.setItem("rl-theme", l ? "light" : "dark");
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b bg-background/95 px-6 py-4 backdrop-blur">
        <Logo />
        <nav className="ml-auto flex items-center gap-5 text-[13px] font-medium text-mist">
          <Link to="/jobs" className="hover:text-foreground" activeProps={{ className: "text-volt" }}>Jobs</Link>
          <Link to="/about" className="hover:text-foreground" activeProps={{ className: "text-volt" }}>How it works</Link>
          <button onClick={toggle} aria-label="Toggle theme" className="grid size-8 place-items-center rounded-full border bg-ink3 text-mist hover:text-foreground">
            <Sun className="hidden size-4 [.light_&]:block" /><Moon className="size-4 [.light_&]:hidden" />
          </button>
          <button
            aria-label="Sign out"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="grid size-8 place-items-center rounded-full border bg-ink3 text-mist hover:text-foreground"
          ><LogOut className="size-4" /></button>
        </nav>
      </header>
      <div className="flex">
        {sidebar && <aside className="hidden w-[280px] shrink-0 border-r p-5 lg:block">{sidebar}</aside>}
        <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

/** Striped hero band from the chosen direction. */
export function HeroBand({ eyebrow, title, actions }: { eyebrow: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-ink2 p-6 md:p-8">
      <div className="stripe pointer-events-none absolute -right-6 -top-6 h-32 w-64 -rotate-12 opacity-10" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div>
          <h1 className="font-display text-3xl font-extrabold leading-[0.95] tracking-tight md:text-[42px]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
