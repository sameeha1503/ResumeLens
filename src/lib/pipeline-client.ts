// Client orchestration of the per-resume pipeline: parse → scan → extract → match → score.
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { extractResume, matchSkills, parseResume, securityScan } from "./pipeline.functions";
import { interviewQuestions, scoreCandidate } from "./scoring";
import type { CandidateRow, JobRow } from "./types";

export const STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded", parsing: "Parsing", parsed: "Parsed", scanning: "Security scan", scanned: "Scanned",
  extracting: "Extracting", extracted: "Extracted", scoring: "Scoring", done: "Done", failed: "Failed",
};

export async function persistScore(c: CandidateRow, job: JobRow) {
  const r = scoreCandidate(c, job.requirements, job.weights);
  if (!r) return;
  await supabase.from("scores").upsert({
    candidate_id: c.id, total_score: r.total, score_low: r.low, score_high: r.high,
    skills_score: r.skills, experience_score: r.experience, education_score: r.education, evidence_score: r.evidence,
    skill_breakdown: r.details as never, flags: r.flags as never, explanation: r.explanation,
    interview_questions: interviewQuestions(r) as never,
  }, { onConflict: "candidate_id" });
}

export function usePipeline() {
  const qc = useQueryClient();
  const parse = useServerFn(parseResume);
  const scan = useServerFn(securityScan);
  const extract = useServerFn(extractResume);
  const match = useServerFn(matchSkills);

  /** Runs remaining steps for one candidate; never throws (failures are stored per file). */
  const run = useCallback(async (candidateId: string, jobId: string, from?: "match") => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["candidates", jobId] });
    try {
      const { data: c } = await supabase.from("candidates").select("raw_text, text_meta, extracted").eq("id", candidateId).single();
      const meta = (c?.text_meta ?? {}) as { clean_text?: string };
      if (from !== "match") {
        if (!c?.raw_text) { await parse({ data: { candidateId } }); refresh(); }
        if (!meta.clean_text) { await scan({ data: { candidateId } }); refresh(); }
        if (!c?.extracted) { await extract({ data: { candidateId } }); refresh(); }
      }
      await match({ data: { candidateId } });
      const [{ data: cand }, { data: job }] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", candidateId).single(),
        supabase.from("jobs").select("*").eq("id", jobId).single(),
      ]);
      if (cand && job) await persistScore(cand as unknown as CandidateRow, job as unknown as JobRow);
    } catch (e) {
      console.error("pipeline step failed", e);
    } finally {
      refresh();
    }
  }, [qc, parse, scan, extract, match]);

  /** Bounded-concurrency batch runner. */
  const runMany = useCallback(async (ids: string[], jobId: string, from?: "match", concurrency = 3) => {
    const queue = [...ids];
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) { const id = queue.shift()!; await run(id, jobId, from); }
    }));
  }, [run]);

  return { run, runMany };
}

/** Create candidate rows + upload files. Returns created ids; bad files don't stop the batch. */
export async function uploadResumes(jobId: string, files: File[]) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user!.id;
  const ids: string[] = [];
  for (const f of files) {
    const { data: row, error } = await supabase.from("candidates").insert({ job_id: jobId, file_name: f.name, status: "uploaded" }).select("id").single();
    if (error || !row) continue;
    const path = `${uid}/${jobId}/${row.id}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("resumes").upload(path, f, { upsert: true, contentType: f.type || "application/octet-stream" });
    if (up.error) {
      await supabase.from("candidates").update({ status: "failed", error: `Upload failed: ${up.error.message}` }).eq("id", row.id);
      continue;
    }
    await supabase.from("candidates").update({ file_path: path }).eq("id", row.id);
    ids.push(row.id);
  }
  return ids;
}
