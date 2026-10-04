// @ts-nocheck -- strict index checks relaxed for hackathon build
// Deterministic, explainable scoring. Runs client-side so weight changes,
// corrections and counterfactuals re-rank instantly. AI is only used upstream
// (extraction + skill matching); every number here is traceable to stored data.
import type {
  CandidateRow, EvidenceLevel, Extracted, Flag, Requirements, SkillMatch, Weights,
} from "./types";

export const normSkill = (s: string) => {
  let n = s.toLowerCase().replace(/[^a-z0-9+#]/g, "");
  if (n.length > 4 && n.endsWith("js")) n = n.slice(0, -2);
  return n;
};

const NOW = new Date();
const NOW_YM = NOW.getFullYear() * 12 + NOW.getMonth();

/** Parse "YYYY-MM" / "YYYY" / loose formats into month index. */
export function parseYM(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = String(s).trim().toLowerCase();
  if (/present|current|now|actual/.test(t)) return NOW_YM;
  const m = t.match(/(\d{4})(?:[-/.](\d{1,2}))?/);
  if (m) {
    const y = +m[1];
    const mo = m[2] ? Math.min(12, Math.max(1, +m[2])) : 1;
    return y * 12 + (mo - 1);
  }
  const m2 = t.match(/(\d{1,2})[-/.](\d{4})/);
  if (m2) return +m2[2] * 12 + (Math.min(12, +m2[1]) - 1);
  return null;
}

type Interval = { s: number; e: number; idx: number };
function roleIntervals(x: Extracted): Interval[] {
  const out: Interval[] = [];
  x.experience.forEach((r, idx) => {
    const s = parseYM(r.start_date);
    const e = r.is_current ? NOW_YM : parseYM(r.end_date);
    if (s != null && e != null && e >= s) out.push({ s, e: Math.min(e, NOW_YM), idx });
  });
  return out;
}
function mergedMonths(iv: Interval[]): number {
  const a = [...iv].sort((p, q) => p.s - q.s);
  let total = 0, cs = -1, ce = -1;
  for (const i of a) {
    if (i.s > ce) { if (ce >= 0) total += ce - cs; cs = i.s; ce = i.e; }
    else ce = Math.max(ce, i.e);
  }
  if (ce >= 0) total += ce - cs;
  return total;
}
export function computedYears(x: Extracted) {
  return Math.round((mergedMonths(roleIntervals(x)) / 12) * 10) / 10;
}

const textOf = (...p: (string | null | undefined)[]) => p.filter(Boolean).join(" ").toLowerCase();
function mentions(hay: string, skill: string) {
  const n = skill.toLowerCase();
  if (hay.includes(n)) return true;
  const ns = normSkill(skill);
  return ns.length >= 2 && hay.replace(/[^a-z0-9+#]/g, "").includes(ns);
}

/** Evidence level for one claimed skill. */
export function evidenceFor(x: Extracted, skill: string): { level: EvidenceLevel; where: string[] } {
  const where: string[] = [];
  let ctx = 0, list = 0;
  x.experience.forEach((r) => {
    if (mentions(textOf(r.description, r.evidence_quote), skill)) { ctx++; where.push(`${r.title ?? "Role"} @ ${r.company ?? "?"}`); }
    else if (r.technologies.some((t) => normSkill(t) === normSkill(skill))) { list++; where.push(`${r.title ?? "Role"} (tech list)`); }
  });
  x.projects.forEach((p) => {
    if (mentions(textOf(p.description, p.evidence_quote), skill)) { ctx++; where.push(`Project: ${p.name ?? "?"}`); }
    else if (p.technologies.some((t) => normSkill(t) === normSkill(skill))) { list++; where.push(`Project ${p.name ?? ""} (tech list)`); }
  });
  const level: EvidenceLevel = ctx >= 1 ? "supported" : list >= 1 ? "weakly supported" : "unsupported";
  return { level, where };
}

function lastUsedYear(x: Extracted, skill: string): number | null {
  const s = x.skills.find((k) => normSkill(k.name) === normSkill(skill));
  let best = s?.last_used_year ?? null;
  for (const r of x.experience) {
    if (mentions(textOf(r.description, r.technologies.join(" ")), skill)) {
      const e = r.is_current ? NOW_YM : parseYM(r.end_date);
      if (e != null) best = Math.max(best ?? 0, Math.floor(e / 12));
    }
  }
  return best;
}

const EDU: [RegExp, number][] = [
  [/ph\.?d|doctor/i, 5], [/master|m\.?s\.?c?\b|mba|m\.?eng|m\.?tech/i, 4],
  [/bachelor|b\.?s\.?c?\b|b\.?a\b|b\.?eng|b\.?tech|licenciatura|undergrad/i, 3],
  [/associate|diploma/i, 2], [/high school|secondary|ged/i, 1],
];
export const eduLevel = (s: string | null | undefined) => {
  if (!s) return 0;
  for (const [r, v] of EDU) if (r.test(s)) return v;
  return 0;
};

export type SkillDetail = SkillMatch & {
  evidence: EvidenceLevel | null;
  last_used: number | null;
  credit: number;
  where: string[];
};

export type ScoreResult = {
  total: number; low: number; high: number;
  skills: number; experience: number; education: number; evidence: number;
  penalty: number;
  relevantYears: number; computedYears: number;
  details: SkillDetail[];
  flags: Flag[];
  claimedEvidence: { skill: string; level: EvidenceLevel }[];
  explanation: string;
};

export function detectFlags(c: Pick<CandidateRow, "security_findings">, x: Extracted, details: SkillDetail[]): Flag[] {
  const flags: Flag[] = [];
  const roles = x.experience;
  const iv = roleIntervals(x);
  roles.forEach((r) => {
    const s = parseYM(r.start_date), e = parseYM(r.end_date);
    const label = `${r.title ?? "Role"} @ ${r.company ?? "?"}`;
    if (s != null && e != null && !r.is_current && e < s)
      flags.push({ type: "timeline_order", severity: "high", message: `${label}: end date before start date`, evidence: `${r.start_date} → ${r.end_date}` });
    if (s != null && s > NOW_YM + 1)
      flags.push({ type: "timeline_future", severity: "warning", message: `${label}: starts in the future`, evidence: r.start_date ?? "" });
  });
  // overlapping roles (>3 months)
  for (let i = 0; i < iv.length; i++) for (let j = i + 1; j < iv.length; j++) {
    const ov = Math.min(iv[i].e, iv[j].e) - Math.max(iv[i].s, iv[j].s);
    if (ov > 3) {
      const a = roles[iv[i].idx], b = roles[iv[j].idx];
      flags.push({
        type: "timeline_overlap", severity: ov > 12 ? "high" : "warning",
        message: `Overlapping roles for ${Math.round(ov)} months: ${a.company ?? "?"} and ${b.company ?? "?"}`,
        evidence: `${a.title} (${a.start_date}–${a.is_current ? "present" : a.end_date}) / ${b.title} (${b.start_date}–${b.is_current ? "present" : b.end_date})`,
      });
    }
  }
  // gaps > 12 months
  const sorted = [...iv].sort((p, q) => p.s - q.s);
  let maxEnd = -1;
  for (const i of sorted) {
    if (maxEnd >= 0 && i.s - maxEnd > 12)
      flags.push({ type: "timeline_gap", severity: "info", message: `Unexplained gap of ${Math.round((i.s - maxEnd) / 12 * 10) / 10} years`, evidence: `before ${roles[i.idx].title ?? "role"} @ ${roles[i.idx].company ?? "?"}` });
    maxEnd = Math.max(maxEnd, i.e);
  }
  // inflation
  const comp = computedYears(x);
  const claimed = x.total_years_experience_claimed;
  if (claimed != null && claimed - comp >= 2 && claimed > comp * 1.4)
    flags.push({ type: "experience_inflation", severity: "high", message: `Claims ${claimed} years but dated roles add up to ${comp}`, evidence: `claimed ${claimed} vs computed ${comp}` });
  // seniority
  iv.forEach((i) => {
    const r = roles[i.idx];
    if (/senior|lead|principal|staff|head|director/i.test(r.title ?? "") && i.e - i.s < 24) {
      const priorMonths = mergedMonths(iv.filter((o) => o.s < i.s).map((o) => ({ ...o, e: Math.min(o.e, i.s) })));
      if (priorMonths < 24)
        flags.push({ type: "seniority_mismatch", severity: "warning", message: `"${r.title}" title with under 2 years in role and little prior experience`, evidence: `${r.start_date}–${r.is_current ? "present" : r.end_date}` });
    }
  });
  // unsupported skills
  const unsupportedReq = details.filter((d) => d.status !== "missing" && d.evidence === "unsupported").map((d) => d.matched_skill ?? d.jd_skill);
  if (unsupportedReq.length)
    flags.push({ type: "unsupported_skills", severity: "warning", message: `${unsupportedReq.length} job-relevant skill(s) claimed with no supporting role or project`, evidence: unsupportedReq.join(", ") });
  // security carry-over
  for (const f of c.security_findings ?? [])
    flags.push({ type: `security_${f.type}`, severity: f.severity, message: `Security: ${f.detail}`, evidence: f.text.slice(0, 200) });
  return flags;
}

export function scoreCandidate(
  c: Pick<CandidateRow, "extracted" | "skill_matches" | "security_findings" | "extraction_confidence" | "field_confidence">,
  req: Requirements, w: Weights,
): ScoreResult | null {
  const x = c.extracted;
  if (!x || !c.skill_matches) return null;
  const year = NOW.getFullYear();

  const details: SkillDetail[] = c.skill_matches.map((m) => {
    if (m.status === "missing" || !m.matched_skill) return { ...m, evidence: null, last_used: null, credit: 0, where: [] };
    const ev = evidenceFor(x, m.matched_skill);
    const lu = lastUsedYear(x, m.matched_skill);
    const base = m.status === "matched" ? 1 : 0.5;
    const evM = ev.level === "supported" ? 1 : ev.level === "weakly supported" ? 0.75 : 0.4;
    const age = lu == null ? null : year - lu;
    const recM = age == null ? 0.9 : age <= 2 ? 1 : age <= 5 ? 0.85 : 0.7;
    return { ...m, evidence: ev.level, last_used: lu, credit: base * evM * recM, where: ev.where };
  });

  const reqD = details.filter((d) => d.required), niceD = details.filter((d) => !d.required);
  const avg = (a: SkillDetail[]) => (a.length ? a.reduce((s, d) => s + d.credit, 0) / a.length : 0);
  const skills = 100 * (reqD.length && niceD.length ? 0.8 * avg(reqD) + 0.2 * avg(niceD) : reqD.length ? avg(reqD) : niceD.length ? avg(niceD) : 0.5);

  // Experience: relevant years from actual dates, weighted by role relevance
  const jdSkills = details.filter((d) => d.matched_skill).map((d) => d.matched_skill as string).concat(details.map((d) => d.jd_skill));
  const iv = roleIntervals(x);
  let relMonths = 0;
  iv.forEach((i) => {
    const r = x.experience[i.idx];
    const hay = textOf(r.title, r.description, r.technologies.join(" "));
    const relevant = jdSkills.some((s) => mentions(hay, s));
    relMonths += (i.e - i.s) * (relevant ? 1 : 0.3);
  });
  const total = mergedMonths(iv);
  const relevantYears = Math.round((Math.min(relMonths, total) / 12) * 10) / 10;
  const target = req.min_years && req.min_years > 0 ? req.min_years : 5;
  const experience = Math.min(100, (relevantYears / target) * 100);

  // Education
  const best = Math.max(0, ...x.education.map((e) => eduLevel(`${e.degree ?? ""} ${e.field ?? ""}`)));
  const need = eduLevel(req.education_level);
  const education = need === 0 ? (x.education.length ? 100 : 70) : best >= need ? 100 : best === need - 1 ? 60 : best > 0 ? 35 : 20;

  // Evidence: share of claimed skills that are supported
  const claimedEvidence = x.skills.map((s) => ({ skill: s.name, level: evidenceFor(x, s.name).level }));
  const evidence = claimedEvidence.length
    ? (100 * claimedEvidence.reduce((s, e) => s + (e.level === "supported" ? 1 : e.level === "weakly supported" ? 0.5 : 0), 0)) / claimedEvidence.length
    : 50;

  const flags = detectFlags(c, x, details);
  const wsum = w.skills + w.experience + w.education + w.evidence || 100;
  let totalScore = (skills * w.skills + experience * w.experience + education * w.education + evidence * w.evidence) / wsum;
  const highs = flags.filter((f) => f.severity === "high").length;
  const penalty = Math.min(10, highs * 3);
  totalScore = Math.max(0, totalScore - penalty);

  // Uncertainty range
  const conf = c.extraction_confidence ?? x.extraction_confidence ?? 0.7;
  const disagreements = Object.values(c.field_confidence ?? {}).filter((v) => v < 0.7).length;
  const warns = flags.filter((f) => f.severity === "warning").length;
  const half = Math.min(20, 3 + (1 - conf) * 15 + disagreements * 1.5 + warns * 1 + highs * 2);

  const r = {
    total: Math.round(totalScore), low: Math.max(0, Math.round(totalScore - half)), high: Math.min(100, Math.round(totalScore + half)),
    skills: Math.round(skills), experience: Math.round(experience), education: Math.round(education), evidence: Math.round(evidence),
    penalty, relevantYears, computedYears: Math.round(total / 12 * 10) / 10, details, flags, claimedEvidence, explanation: "",
  };
  r.explanation = explain(r, req);
  return r;
}

export function explain(r: Omit<ScoreResult, "explanation">, req: Requirements) {
  const reqD = r.details.filter((d) => d.required);
  const got = reqD.filter((d) => d.status === "matched").length;
  const partial = reqD.filter((d) => d.status === "partial").length;
  const missing = reqD.filter((d) => d.status === "missing").map((d) => d.jd_skill);
  const unsupported = r.claimedEvidence.filter((e) => e.level === "unsupported").length;
  const parts = [
    `Matched ${got} of ${reqD.length} required skills${partial ? ` (+${partial} partial)` : ""}.`,
    missing.length ? `Missing ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}.` : "No required skills missing.",
    `${r.relevantYears} relevant years${req.min_years ? ` vs ${req.min_years} required` : ""}.`,
  ];
  if (unsupported) parts.push(`${unsupported} claimed skill${unsupported > 1 ? "s" : ""} unsupported by any role or project.`);
  const highs = r.flags.filter((f) => f.severity === "high").length;
  if (highs) parts.push(`${highs} high-severity flag${highs > 1 ? "s" : ""} (−${r.penalty} pts confidence penalty).`);
  return parts.join(" ");
}

export function interviewQuestions(r: ScoreResult) {
  const qs: { question: string; reason: string }[] = [];
  r.details.filter((d) => d.status !== "missing" && d.evidence === "unsupported").slice(0, 2).forEach((d) =>
    qs.push({ question: `You list ${d.matched_skill}. Walk me through a specific project where you used it and what you built.`, reason: "Unsupported claim" }));
  r.details.filter((d) => d.required && d.status === "missing").slice(0, 2).forEach((d) =>
    qs.push({ question: `This role relies on ${d.jd_skill}. What exposure have you had to it, or to something comparable?`, reason: "Missing required skill" }));
  r.flags.filter((f) => f.type.startsWith("timeline") || f.type === "experience_inflation").slice(0, 2).forEach((f) =>
    qs.push({ question: `Can you clarify your timeline here: ${f.message.toLowerCase()}?`, reason: "Timeline oddity" }));
  r.details.filter((d) => d.status === "partial").slice(0, 1).forEach((d) =>
    qs.push({ question: `How would your ${d.matched_skill} experience transfer to ${d.jd_skill}?`, reason: "Partial match" }));
  if (qs.length < 4) qs.push({ question: "Which accomplishment on your resume best shows the depth of your hands-on work?", reason: "General evidence check" });
  return qs.slice(0, 6);
}

/** Rank helper. */
export function rankScores(entries: { id: string; total: number }[]) {
  return [...entries].sort((a, b) => b.total - a.total).map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Counterfactual: re-score as if a missing skill were present & supported. */
export function counterfactuals(
  c: CandidateRow, req: Requirements, w: Weights, others: { id: string; total: number }[],
) {
  const base = scoreCandidate(c, req, w);
  if (!base || !c.extracted) return [];
  const missing = base.details.filter((d) => d.status === "missing").sort((a, b) => Number(b.required) - Number(a.required)).slice(0, 3);
  const curRank = rankScores(others).find((e) => e.id === c.id)?.rank ?? null;
  return missing.map((m) => {
    const ex: Extracted = {
      ...c.extracted!,
      skills: [...c.extracted!.skills, { name: m.jd_skill, evidence_quote: null, source_section: "experience", last_used_year: new Date().getFullYear() }],
      projects: [...c.extracted!.projects, { name: "hypothetical", description: `Used ${m.jd_skill} in production`, technologies: [m.jd_skill], evidence_quote: null }],
    };
    const sm = c.skill_matches!.map((s) => (s.jd_skill === m.jd_skill ? { ...s, status: "matched" as const, matched_skill: m.jd_skill, similarity: 1 } : s));
    const ns = scoreCandidate({ ...c, extracted: ex, skill_matches: sm }, req, w)!;
    const newRank = rankScores(others.map((o) => (o.id === c.id ? { ...o, total: ns.total } : o))).find((e) => e.id === c.id)?.rank ?? null;
    return { skill: m.jd_skill, from: base.total, to: ns.total, rankFrom: curRank, rankTo: newRank };
  });
}

/** Weight-sensitivity: ±10% on each weight; stable if top-N membership never changes. */
export function stability(
  cands: CandidateRow[], req: Requirements, w: Weights, topN = 3,
): Record<string, "Stable" | "Sensitive to weights"> {
  const scored = (ww: Weights) =>
    rankScores(cands.map((c) => ({ id: c.id, total: scoreCandidate(c, req, ww)?.total ?? -1 })).filter((e) => e.total >= 0));
  const baseTop = new Set(scored(w).slice(0, topN).map((e) => e.id));
  const out: Record<string, "Stable" | "Sensitive to weights"> = {};
  cands.forEach((c) => (out[c.id] = "Stable"));
  (Object.keys(w) as (keyof Weights)[]).forEach((k) => {
    [0.9, 1.1].forEach((f) => {
      const ww = { ...w, [k]: w[k] * f };
      const top = new Set(scored(ww).slice(0, topN).map((e) => e.id));
      cands.forEach((c) => { if (baseTop.has(c.id) !== top.has(c.id)) out[c.id] = "Sensitive to weights"; });
    });
  });
  return out;
}

export function overlapRatio(a: { low: number; high: number }, b: { low: number; high: number }) {
  const ov = Math.min(a.high, b.high) - Math.max(a.low, b.low);
  const min = Math.min(a.high - a.low, b.high - b.low) || 1;
  return Math.max(0, ov) / min;
}

export function displayName(c: Pick<CandidateRow, "id" | "extracted" | "file_name">, blind: boolean) {
  if (blind) return `Candidate ${c.id.slice(0, 4).toUpperCase()}`;
  return c.extracted?.name || c.file_name;
}
