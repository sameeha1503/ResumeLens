import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, HeroBand } from "@/components/AppShell";
import { jobQuery, candidateQuery } from "@/lib/queries";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export const Route = createFileRoute("/_authenticated/jobs_/$jobId_/candidates/$candidateId")({
  component: CandidateDetail,
});

function CandidateDetail() {
  const { jobId, candidateId } = Route.useParams();
  const { data: job } = useQuery(jobQuery(jobId));
  const { data: candidate } = useQuery(candidateQuery(candidateId));

  const [activeEvidence, setActiveEvidence] = useState<string | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const weights = job?.weights || DEFAULT_WEIGHTS;
  const score = candidate && job && candidate.status === "done" 
    ? scoreCandidate(candidate as any, job.requirements, weights) 
    : null;

  if (!job || !candidate) {
    return <AppShell><div className="p-8">Loading...</div></AppShell>;
  }

  if (candidate.status !== "done" || !score) {
    return (
      <AppShell>
        <div className="p-8">
          <Link to="/jobs/$jobId" params={{ jobId }} className="text-volt hover:underline flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Workspace
          </Link>
          <div className="text-mist2">Candidate is processing or failed...</div>
        </div>
      </AppShell>
    );
  }

  const name = displayName(candidate as any, job.blind_mode);
  const flags = score.flags;
  const highs = flags.filter(f => f.severity === "high");
  const warns = flags.filter(f => f.severity === "warning");

  const renderRawText = () => {
    if (!candidate.raw_text) return null;
    if (!activeEvidence) return candidate.raw_text;
    
    // Simple exact substring match
    const idx = candidate.raw_text.indexOf(activeEvidence);
    if (idx === -1) return candidate.raw_text;
    
    return (
      <>
        {candidate.raw_text.slice(0, idx)}
        <mark className="bg-volt/50 text-ink1 rounded px-1" ref={el => {
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}>
          {candidate.raw_text.slice(idx, idx + activeEvidence.length)}
        </mark>
        {candidate.raw_text.slice(idx + activeEvidence.length)}
      </>
    );
  };

  return (
    <AppShell>
      <HeroBand 
        eyebrow={
          <Link to="/jobs/$jobId" params={{ jobId }} className="text-volt hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> {job.title}
          </Link>
        } 
        title={name} 
      />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Top Banner for extraction warnings */}
          {candidate.extraction_confidence! < 0.7 && (
            <div className="bg-flame/10 border border-flame/20 rounded p-4 flex gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-flame shrink-0" />
              <div>
                <strong className="block text-flame mb-1">Low Confidence Extraction</strong>
                <ul className="list-disc pl-4 space-y-1 text-mist1">
                  {candidate.extraction_warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Score breakdown */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-sm font-semibold text-mist2 uppercase tracking-wide">Total Score</div>
                <div className="text-4xl font-display font-bold">
                  {score.total} <span className="text-lg text-mist2 font-normal">± {score.high - score.total}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-mist2">{score.explanation}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div>
                <div className="text-xs text-mist2 mb-1">Skills</div>
                <div className="font-bold text-volt text-lg">{score.skills}</div>
              </div>
              <div>
                <div className="text-xs text-mist2 mb-1">Experience</div>
                <div className="font-bold text-mint text-lg">{score.experience}</div>
              </div>
              <div>
                <div className="text-xs text-mist2 mb-1">Education</div>
                <div className="font-bold text-sky text-lg">{score.education}</div>
              </div>
              <div>
                <div className="text-xs text-mist2 mb-1">Evidence</div>
                <div className="font-bold text-flame text-lg">{score.evidence}</div>
              </div>
            </div>
          </div>

          {/* Skills Details */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-display font-bold mb-4">Skills</h3>
            <div className="space-y-3">
              {score.details.map((d, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-ink3 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${d.status === 'matched' ? 'bg-mint' : d.status === 'partial' ? 'bg-sky' : 'bg-mist3'}`} />
                    <span 
                      className="font-semibold cursor-pointer hover:text-volt transition-colors"
                      onClick={() => {
                        const ev = (candidate.extracted as any)?.skills?.find((s: any) => s.name.toLowerCase() === d.matched_skill?.toLowerCase())?.evidence_quote;
                        if (ev) setActiveEvidence(ev);
                      }}
                    >{d.jd_skill}</span>
                    {d.status !== "missing" && <span className="text-xs text-mist2 ml-2">→ {d.matched_skill}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {d.status !== 'missing' && d.evidence && (
                      <span className={`text-xs px-2 py-1 rounded-full ${d.evidence === 'supported' ? 'bg-mint/10 text-mint' : d.evidence === 'weakly supported' ? 'bg-sky/10 text-sky' : 'bg-flame/10 text-flame'}`}>
                        {d.evidence}
                      </span>
                    )}
                    {d.status === "missing" && <span className="text-xs text-mist2">Missing</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flags List */}
          {flags.length > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-display font-bold mb-4">Flags</h3>
              <div className="space-y-4">
                {flags.map((f, i) => (
                  <div key={i} className="flex gap-3 cursor-pointer hover:bg-ink1/50 p-2 rounded transition-colors" onClick={() => setActiveEvidence(f.evidence)}>
                    {f.severity === 'high' ? <ShieldAlert className="w-5 h-5 text-flame shrink-0 mt-0.5" /> : f.severity === 'warning' ? <AlertTriangle className="w-5 h-5 text-sky shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-mist2 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-semibold">{f.message}</div>
                      <div className="text-sm text-mist2 mt-1">Evidence: "{f.evidence}"</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Security Panel */}
          {candidate.security_findings && candidate.security_findings.length > 0 && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-display font-bold text-flame mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Security Findings
              </h3>
              <p className="text-sm text-mist2 mb-4">Scoring ignored the following excluded text based on these findings.</p>
              <div className="space-y-4">
                {candidate.security_findings.map((f, i) => (
                  <div key={i} className="bg-ink1 p-3 rounded text-sm border border-ink3">
                    <div className="font-semibold text-mist1 mb-1">{f.type}</div>
                    <div className="text-mist2">{f.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        
        <div className="space-y-6">
           {/* Interview Questions */}
           <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-display font-bold mb-4">Interview Questions</h3>
            <div className="space-y-4">
              {interviewQuestions(score).map((q, i) => (
                <div key={i} className="bg-ink1 p-4 rounded-lg relative group">
                  <div className="text-xs text-mist2 mb-2">{q.reason}</div>
                  <div className="text-sm">{q.question}</div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(q.question)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-card px-2 py-1 border rounded"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Counterfactuals Note */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-display font-bold mb-4">Counterfactuals</h3>
            <p className="text-sm text-mist2 mb-4">How score would change if missing skills were proven.</p>
            {/* The counterfactuals fn requires 'others' array to compute rank changes. 
                We can just show the score diff for simplicity here. */}
            <div className="text-xs text-mist2 text-center p-4 border border-dashed rounded">
              Coming soon: interactive scenario modeling.
            </div>
          </div>

          {/* Raw Text side panel */}
          <div className="bg-card border rounded-lg p-6 h-[400px] overflow-y-auto">
            <h3 className="text-lg font-display font-bold mb-4">Resume Text</h3>
            <pre className="text-xs text-mist2 whitespace-pre-wrap font-sans" ref={textRef}>
              {renderRawText()}
            </pre>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
