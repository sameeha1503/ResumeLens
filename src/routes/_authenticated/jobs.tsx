import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, HeroBand } from "@/components/AppShell";
import { jobsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { extractJobRequirements, parseJdFile } from "@/lib/pipeline.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — ResumeLens" }, { name: "description", content: "Your screening jobs." }, { property: "og:title", content: "Jobs — ResumeLens" }, { property: "og:description", content: "Your screening jobs." }] }),
  component: Jobs,
});

function Jobs() {
  const { data, isLoading } = useQuery(jobsQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const parseFile = useServerFn(parseJdFile);
  const extractReqs = useServerFn(extractJobRequirements);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = (ev.target?.result as string).split(",")[1];
        if (!b64) return;
        const res = await parseFile({ data: { name: file.name, base64: b64 } });
        setDescription(res.text);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to parse JD file.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: job, error: insertErr } = await supabase
        .from("jobs")
        .insert({ title, description, user_id: user?.id })
        .select("id")
        .single();
      
      if (insertErr || !job) throw new Error(insertErr?.message || "Failed to create job.");

      try {
        await extractReqs({ data: { jobId: job.id } });
      } catch (extErr: any) {
        toast.warning("Job created, but requirements extraction failed: " + (extErr.message || "Unknown error"));
      }

      await qc.invalidateQueries({ queryKey: ["jobs"] });
      
      setTitle("");
      setDescription("");
      navigate({ to: "/jobs/$jobId", params: { jobId: job.id } });
    } catch (err: any) {
      setError(err.message || "An error occurred creating the job.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppShell>
      <HeroBand eyebrow={<span className="text-volt">Open roles</span>} title="Jobs" />
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-display font-bold">Your Jobs</h2>
          {isLoading && <p className="text-mist2">Loading…</p>}
          {data?.length === 0 && (
            <div className="p-8 border border-ink3 border-dashed rounded-lg text-center">
              <p className="text-mist2">No jobs created yet. Create your first job to start screening resumes.</p>
            </div>
          )}
          <div className="space-y-2">
            {data?.map((j) => (
              <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} className="block border-l-4 border-volt bg-card p-4 hover:bg-muted transition-colors">
                <div className="font-display font-bold">{j.title}</div>
                <div className="text-xs text-mist2">{j.candidates?.[0]?.count ?? 0} resumes</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg h-fit border">
          <h2 className="text-xl font-display font-bold mb-4">New Job</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="p-3 bg-flame/10 text-flame text-sm rounded border border-flame/30">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Job Title</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g. Senior Frontend Engineer" 
                className="bg-ink1 border-ink3"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex justify-between items-center">
                <span>Job Description</span>
                <label className="text-xs text-volt cursor-pointer hover:underline">
                  Upload file
                  <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleFile} />
                </label>
              </label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Paste the job description here..." 
                className="h-40 bg-ink1 border-ink3 text-sm"
              />
            </div>

            <Button type="submit" disabled={isCreating} className="w-full bg-volt text-black hover:bg-volt/90 font-bold">
              {isCreating ? "Creating..." : "Create Job"}
            </Button>
          </form>
        </div>

      </div>
    </AppShell>
  );
}
