import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "ResumeLens — rank candidates by evidence, not keywords" },
    { name: "description", content: "Trustworthy AI resume screening: evidence-backed scores, uncertainty ranges, gaming detection and full explanations." },
    { property: "og:title", content: "ResumeLens — rank candidates by evidence, not keywords" },
    { property: "og:description", content: "Evidence-backed scores, uncertainty ranges, gaming detection and full explanations." },
  ] }),
  component: Index,
});

const rows = [
  ["01", "Strong honest candidate", "84", "79–89", "Stable", "mint"],
  ["02", "Two-column layout", "71", "64–78", "Stable", "mint"],
  ["03", "Keyword-stuffed", "48", "38–58", "Sensitive to weights", "amber"],
  ["04", "Adversarial (hidden text)", "31", "17–45", "Flagged", "flame"],
] as const;

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 border-b px-6 py-4">
        <Logo />
        <nav className="ml-auto flex items-center gap-5 text-[13px] font-medium text-mist">
          <Link to="/about" className="hover:text-foreground">How it works</Link>
          <Link to="/jobs" className="rounded-md bg-volt px-4 py-2 font-bold text-primary-foreground">Open workspace</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="relative overflow-hidden rounded-lg border bg-card shadow-sm p-8 md:p-12">
          <div className="stripe pointer-events-none absolute -right-6 -top-6 h-40 w-80 -rotate-12 opacity-10" />
          <div className="eyebrow mb-3"><span className="text-volt">Evidence-first</span> · AI resume screening</div>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[0.95] tracking-tight md:text-6xl">
            Rank by evidence.<br />Not keywords.
          </h1>
          <p className="mt-5 max-w-xl text-mist">
            Every score comes with a range, every skill with a verbatim quote, every flag with its reason. Hidden text, prompt
            injection and inflated timelines are caught before they can move a ranking.
          </p>
          <Link to="/jobs" className="mt-8 inline-flex rounded-md bg-volt px-5 py-2.5 text-[13px] font-bold text-primary-foreground">Start screening</Link>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg border">
          {rows.map(([r, n, s, rg, st, tone], i) => (
            <div key={r} className={`grid grid-cols-[40px_1fr_60px_90px_auto] items-center gap-4 px-5 py-4 border-l-4 ${i === 0 ? "border-volt bg-volt/10" : "border-l-transparent border-t"}`}>
              <span className={`font-display text-lg font-extrabold ${i === 0 ? "text-volt" : "text-mist2"}`}>{r}</span>
              <span className="font-display font-bold">{n}</span>
              <span className="font-display text-lg font-extrabold">{s}</span>
              <span className="rounded-md bg-mist2/15 px-2 py-1 text-center text-xs font-bold text-mist">{rg}</span>
              <span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${tone === "mint" ? "border-mint/30 bg-mint/10 text-mint" : tone === "amber" ? "border-amber/30 bg-amber/10 text-amber" : "border-flame/30 bg-flame/10 text-flame"}`}>{st}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
