import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useEffect } from "react";
import { AppShell, HeroBand } from "@/components/AppShell";
import { jobQuery, candidatesQuery } from "@/lib/queries";
import { uploadResumes, usePipeline, STATUS_LABEL } from "@/lib/pipeline-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

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

  // Auto-refresh logic if any candidate is in progress
  const hasInProgress = candidates?.some(c => !["done", "failed"].includes(c.status));
  useEffect(() => {
    if (!hasInProgress) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["candidates", jobId] });
    }, 2000);
    return () => clearInterval(interval);
  }, [hasInProgress, qc, jobId]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files).filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        setUploadError(`File ${f.name} is larger than 5MB.`);
        return false;
      }
      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"];
      const ext = f.name.toLowerCase().split('.').pop();
      const isExtValid = ["pdf", "docx", "txt", "png", "jpg", "jpeg"].includes(ext || "");
      if (!validTypes.includes(f.type) && !isExtValid) {
        setUploadError(`File ${f.name} is not a supported format.`);
        return false;
      }
      return true;
    });

    if (!files.length) return;

    setIsUploading(true);
    try {
      const ids = await uploadResumes(jobId, files);
      qc.invalidateQueries({ queryKey: ["candidates", jobId] });
      await runMany(ids, jobId);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload files.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRetry = (candidateId: string) => {
    run(candidateId, jobId);
  };

  if (jobLoading) {
    return (
      <AppShell>
        <div className="p-8 text-mist2">Loading job workspace...</div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="p-8 text-red-400">Job not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <HeroBand eyebrow={<span className="text-volt">Workspace</span>} title={job.title} />
      
      <div className="mt-6">
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="bg-card border">
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="analysis">Job Analysis</TabsTrigger>
            <TabsTrigger value="weights">Weights</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="candidates" className="mt-6 space-y-6">
            <div 
              onDrop={handleDrop} 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave}
              className={`p-10 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? "border-volt bg-volt/10" : "border-muted bg-card"} ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <h3 className="text-lg font-display font-bold">Drop Resumes Here</h3>
              <p className="text-sm text-mist2 mt-2">Supports PDF, DOCX, TXT, PNG, JPG (up to 5MB each)</p>
              {uploadError && <p className="text-red-400 mt-4 text-sm">{uploadError}</p>}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-display font-bold">Candidates</h3>
              {candidatesLoading && <p className="text-mist2">Loading candidates...</p>}
              {!candidatesLoading && candidates?.length === 0 && <p className="text-mist2">No candidates uploaded yet.</p>}
              
              <div className="grid grid-cols-1 gap-3">
                {candidates?.map(c => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border rounded-lg">
                    <div className="truncate font-semibold">{c.file_name}</div>
                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${c.status === 'done' ? 'bg-mint/10 text-mint' : c.status === 'failed' ? 'bg-flame/10 text-flame' : 'bg-volt/10 text-volt'}`}>
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                      {c.status === "failed" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400 max-w-xs truncate" title={c.error || ""}>{c.error}</span>
                          <Button size="sm" variant="outline" className="text-xs h-7 border-ink3" onClick={() => handleRetry(c.id)}>Retry</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="p-8 border border-ink3 border-dashed rounded-lg text-center text-mist2">
              Job Analysis is coming in the next step.
            </div>
          </TabsContent>

          <TabsContent value="weights">
            <div className="p-8 border border-ink3 border-dashed rounded-lg text-center text-mist2">
              Weights configuration is coming in the next step.
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="p-8 border border-ink3 border-dashed rounded-lg text-center text-mist2">
              Job settings are coming in the next step.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
