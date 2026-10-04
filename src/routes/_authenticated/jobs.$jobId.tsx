import { createFileRoute, Link, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { AppShell, HeroBand } from "@/components/AppShell";
import { jobQuery, candidatesQuery } from "@/lib/queries";
import { uploadResumes, usePipeline, STATUS_LABEL } from "@/lib/pipeline-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreCandidate, rankScores, displayName, stability, overlapRatio } from "@/lib/scoring";
import { DEFAULT_WEIGHTS, Weights } from "@/lib/types";
import { ShieldAlert, Shield, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  component: JobWorkspace,
});

function JobWorkspace() {
  const { jobId } = Route.useParams();
  const { data: job, isLoading: jobLoading } = useQuery(jobQuery(jobId));
  const { data: candidates, isLoading: candidatesLoading } = useQuery(candidatesQuery(jobId));
  const qc = useQueryClient();
  const { runMany, run } = usePipeline();
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  useEffect(() => { if (job?.weights) setWeights(job?.weights); }, [job?.weights]);

  // Filters
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [reqSkill, setReqSkill] = useState("");
  const [minYears, setMinYears] = useState(0);
  const [hideHighFlags, setHideHighFlags] = useState(false);
  const [hideSec, setHideSec] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "name" | "score">("rank");

  // Auto-refresh logic if any candidate is in progress
  const hasInProgress = candidates?.some(c => !["done", "failed"].includes(c.status));
  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["candidates", jobId] });
    }, 2000);
    return () => clearInterval(interval);
  }, [hasInProgress, qc, jobId]);

  const processFiles = async (files: File[]) => {
    setUploadError(null);
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) { setUploadError(`File ${f.name} is larger than 5MB.`); return false; }
      return true;
    });
    if (!valid.length) return;

    setIsUploading(true);
    try {
      const ids = await uploadResumes(jobId, valid);
      qc.invalidateQueries({ queryKey: ["candidates", jobId] });
      await runMany(ids, jobId);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload files.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };
  
  const handleWeightChange = async (k: keyof Weights, val: number) => {
    const nw = { ...weights, [k]: val };
    const sum = Object.values(nw).reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const norm = {
      skills: Math.round((nw.skills / sum) * 100),
      experience: Math.round((nw.experience / sum) * 100),
      education: Math.round((nw.education / sum) * 100),
      evidence: Math.round((nw.evidence / sum) * 100),
    };
    const diff = 100 - (norm.skills + norm.experience + norm.education + norm.evidence);
    norm.skills += diff;
    setWeights(norm);
    await supabase.from("jobs").update({ weights: norm }).eq("id", jobId);
  };

  const rankedData = useMemo(() => {
    if (!candidates || !job) return { filtered: [], processing: [] };
    
    const processing = candidates.filter(c => c.status !== "done");
    const done = candidates.filter(c => c.status === "done");
    
    const scored = done.map(c => ({
      ...c,
      score: scoreCandidate(c as any, job.requirements, weights)
    })).filter(c => c.score !== null) as (typeof done[0] & { score: NonNullable<ReturnType<typeof scoreCandidate>> })[];

    let globallyRanked = rankScores(scored.map(c => ({ id: c.id, total: c.score.total })));
    let stab = stability(done as any, job.requirements, weights);

    let list = scored.map(c => {
      const rank = globallyRanked.find(r => r.id === c.id)!.rank;
      const myRange = { low: c.score.low, high: c.score.high };
      let tied = false;
      const above = scored.find(x => globallyRanked.find(r => r.id === x.id)?.rank === rank - 1);
      const below = scored.find(x => globallyRanked.find(r => r.id === x.id)?.rank === rank + 1);
      if (above && overlapRatio(myRange, { low: above?.score.low, high: above?.score.high }) > 0.5) tied = true;
      if (below && overlapRatio(myRange, { low: below?.score.low, high: below?.score.high }) > 0.5) tied = true;

      const stabLabel = tied ? "Effectively tied" : stab[c.id];
      return { ...c, rank, stabLabel };
    });

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => displayName(c as any, job.blind_mode).toLowerCase().includes(s) || c.score.details.some(d => d.matched_skill?.toLowerCase().includes(s)));
    }
    if (minScore > 0) list = list.filter(c => c.score.total >= minScore);
    if (reqSkill) list = list.filter(c => c.score.details.some(d => d.jd_skill.toLowerCase().includes(reqSkill.toLowerCase()) && d.status === "matched"));
    if (minYears > 0) list = list.filter(c => c.score.relevantYears >= minYears);
    if (hideHighFlags) list = list.filter(c => !c.score.flags.some(f => f.severity === "high"));
    if (hideSec) list = list.filter(c => !c.security_findings?.length);

    if (sortBy === "name") list.sort((a, b) => displayName(a as any, job.blind_mode).localeCompare(displayName(b as any, job.blind_mode)));
    else if (sortBy === "score") list.sort((a, b) => b.score.total - a.score.total);
    else list.sort((a, b) => a.rank - b.rank);

    return { filtered: list, processing };
  }, [candidates, job, weights, search, minScore, reqSkill, minYears, hideHighFlags, hideSec, sortBy]);

  if (jobLoading) {
    return <AppShell><div className="p-8 text-mist2">Loading job workspace...</div></AppShell>;
  }
  if (!job) {
    return <AppShell><div className="p-8 text-red-400">Job not found.</div></AppShell>;
  }

  return (
    <AppShell>
      <HeroBand eyebrow={<span className="text-volt">Workspace</span>} title={job.title} />
      
      <div className="mt-6">
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="bg-card border">
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="weights">Weights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="candidates" className="mt-6 space-y-6">
            <div 
              onDrop={handleDrop} 
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }} 
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragging ? "border-volt bg-volt/10" : "border-muted bg-card"} ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <h3 className="text-lg font-display font-bold">Drop Resumes Here or Click to Browse</h3>
              <p className="text-sm text-mist2 mt-2">Supports PDF, DOCX, TXT, PNG, JPG (up to 5MB each)</p>
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={e => e.target.files && processFiles(Array.from(e.target.files))} />
              {uploadError && <p className="text-flame mt-4 text-sm">{uploadError}</p>}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 border rounded-lg">
                <Input placeholder="Search name or skill..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 bg-ink1 border-ink3" />
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">Min Score <Input type="number" value={minScore || ""} onChange={e => setMinScore(+e.target.value)} className="w-16 h-8 bg-ink1" /></label>
                  <label className="flex items-center gap-2">Req. Skill <Input value={reqSkill} onChange={e => setReqSkill(e.target.value)} className="w-32 h-8 bg-ink1" /></label>
                  <label className="flex items-center gap-2">Min Years <Input type="number" value={minYears || ""} onChange={e => setMinYears(+e.target.value)} className="w-16 h-8 bg-ink1" /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={hideHighFlags} onChange={e => setHideHighFlags(e.target.checked)} /> Hide High Flags</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={hideSec} onChange={e => setHideSec(e.target.checked)} /> Hide Sec. Findings</label>
                </div>
              </div>

              {rankedData.processing.map(c => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-ink1 border rounded-lg">
                  <div className="truncate font-semibold">{c.file_name}</div>
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${c.status === 'failed' ? 'bg-flame/10 text-flame' : 'bg-volt/10 text-volt'}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                    {c.status === "failed" && <Button size="sm" variant="outline" className="text-xs h-7 border-ink3" onClick={() => run(c.id, jobId)}>Retry</Button>}
                  </div>
                </div>
              ))}

              <div className="overflow-x-auto bg-card border rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-ink1 text-xs uppercase text-mist2">
                    <tr>
                      <th className="p-4 cursor-pointer" onClick={() => setSortBy("rank")}>Rank</th>
                      <th className="p-4 cursor-pointer" onClick={() => setSortBy("name")}>Name</th>
                      <th className="p-4 cursor-pointer" onClick={() => setSortBy("score")}>Score</th>
                      <th className="p-4">Breakdown</th>
                      <th className="p-4">Flags</th>
                      <th className="p-4">Conf.</th>
                      <th className="p-4">Stability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink3">
                    {rankedData.filtered.map(c => (
                      <tr key={c.id} className="hover:bg-ink1 transition-colors">
                        <td className="p-4 font-bold">#{c.rank}</td>
                        <td className="p-4 font-semibold text-volt">
                          <Link to="/jobs_/$jobId/candidates/$candidateId" params={{ jobId, candidateId: c.id }}>{displayName(c as any, job.blind_mode)}</Link>
                          {c.security_findings?.length > 0 && <ShieldAlert className="w-4 h-4 inline ml-2 text-flame" />}
                        </td>
                        <td className="p-4">
                          <div className="font-bold">{c.score.total} <span className="text-mist2 text-xs font-normal">± {c.score.high - c.score.total}</span></div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 h-2 w-24 rounded overflow-hidden">
                            <div className="bg-volt" style={{ width: `${c.score.skills}%` }} title={`Skills: ${c.score.skills}`} />
                            <div className="bg-mint" style={{ width: `${c.score.experience}%` }} title={`Experience: ${c.score.experience}`} />
                            <div className="bg-sky" style={{ width: `${c.score.education}%` }} title={`Education: ${c.score.education}`} />
                            <div className="bg-flame" style={{ width: `${c.score.evidence}%` }} title={`Evidence: ${c.score.evidence}`} />
                          </div>
                        </td>
                        <td className="p-4">
                          {c.score.flags.length > 0 ? (
                            <span className={`font-bold ${c.score.flags.some(f => f.severity === 'high') ? 'text-flame' : c.score.flags.some(f => f.severity === 'warning') ? 'text-sky' : 'text-mist2'}`}>
                              {c.score.flags.length} flag{c.score.flags.length !== 1 && "s"}
                            </span>
                          ) : <span className="text-mist2">-</span>}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs ${c.extraction_confidence! < 0.7 ? 'text-flame' : 'text-mint'}`}>
                            {Math.round((c.extraction_confidence ?? 0) * 100)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${c.stabLabel === 'Stable' ? 'bg-mint/10 text-mint' : c.stabLabel === 'Effectively tied' ? 'bg-sky/10 text-sky' : 'bg-flame/10 text-flame'}`}>
                            {c.stabLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="weights" className="mt-6 space-y-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-display font-bold mb-4">Adjust Scoring Weights</h3>
              <div className="flex flex-col gap-6">
                {(Object.keys(weights) as (keyof Weights)[]).map(k => (
                  <div key={k} className="flex-1">
                    <label className="text-sm font-semibold capitalize flex justify-between mb-2">
                      <span>{k}</span>
                      <span>{weights[k]}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={weights[k]} onChange={e => handleWeightChange(k, +e.target.value)} className="w-full h-2 bg-ink2 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
