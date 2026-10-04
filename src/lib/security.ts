// Rule-based security checks (run before any extraction). Shared & pure.
import type { SecurityFinding } from "./types";

const INJECTION: RegExp[] = [
  /ignore (all |any )?(the )?(previous|prior|above) (instructions|prompts?|directions)[^.\n]*/gi,
  /disregard (all |any )?(previous|prior|above)[^.\n]*/gi,
  /(rank|rate|score|place|put) (this|the|me|my)[^.\n]{0,40}(first|top|highest|#1|number one)[^.\n]*/gi,
  /(give|assign|award) (this candidate |me |him |her )?(a )?(perfect|maximum|100|full|top) (score|rating|marks?)[^.\n]*/gi,
  /\bas an ai\b[^.\n]*/gi,
  /(note|message|instruction)s? (to|for) (the )?(ai|llm|gpt|chatgpt|recruiter|screen(ing|er)|ats|model)[^.\n]*/gi,
  /\b(system prompt|you are (now )?an? (ai|assistant|language model))[^.\n]*/gi,
  /(this candidate|i) (is|am) (the )?(best|perfect|ideal) (fit|match|candidate)[^.\n]*/gi,
];

export function regexInjection(text: string): SecurityFinding[] {
  const out: SecurityFinding[] = [];
  const seen = new Set<string>();
  for (const re of INJECTION) {
    for (const m of text.matchAll(re)) {
      const t = m[0].trim();
      if (t.length < 8 || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.push({ type: "prompt_injection", severity: "high", text: t, detail: "Text addressing the AI/recruiter or attempting to override instructions" });
    }
  }
  return out;
}

/** Long comma/pipe separated skill blocks without context sentences. */
export function keywordStuffing(text: string): SecurityFinding[] {
  const out: SecurityFinding[] = [];
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const items = line.split(/[,|•·;\/]/).map((s) => s.trim()).filter(Boolean);
    const shortItems = items.filter((i) => i.split(/\s+/).length <= 3);
    if (items.length >= 25 && shortItems.length / items.length > 0.85) {
      out.push({ type: "keyword_stuffing", severity: "warning", text: line.trim(), detail: `Block of ${items.length} keywords with no supporting context` });
    }
  }
  // repeated keyword spam (same token 8+ times)
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  const stop = new Set(["and", "the", "with", "for", "using", "from", "that", "this", "team", "data", "experience"]);
  const words = text.split(/\s+/).length;
  for (const [w, n] of counts) if (!stop.has(w) && n >= 10 && n / words > 0.03)
    out.push({ type: "keyword_stuffing", severity: "warning", text: w, detail: `"${w}" repeated ${n} times` });
  return out;
}

/** Remove flagged text from the resume for extraction/scoring. */
export function excludeText(text: string, findings: SecurityFinding[]) {
  let clean = text;
  const excluded: string[] = [];
  for (const f of findings) {
    if (f.type === "keyword_stuffing" && !f.text.includes(",") && !f.text.includes("|")) continue; // repeated-word finding: don't strip
    if (f.text && clean.includes(f.text)) {
      clean = clean.split(f.text).join(" [excluded] ");
      excluded.push(f.text);
    }
  }
  return { clean, excluded: excluded.join("\n---\n") };
}
