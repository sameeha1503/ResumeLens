// Client data access (browser Supabase client, RLS-scoped to the signed-in user).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CandidateRow, JobRow } from "./types";

export const jobsQuery = () =>
  queryOptions({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*, candidates(count)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (JobRow & { candidates: { count: number }[] })[];
    },
  });

export const jobQuery = (id: string) =>
  queryOptions({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as JobRow;
    },
  });

export const candidatesQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["candidates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("job_id", jobId).order("created_at");
      if (error) throw error;
      return data as unknown as CandidateRow[];
    },
  });

export const candidateQuery = (id: string) =>
  queryOptions({
    queryKey: ["candidate", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as CandidateRow;
    },
  });
