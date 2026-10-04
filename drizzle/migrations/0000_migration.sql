create extension if not exists vector;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  description text not null default '',
  requirements jsonb not null default '{"required_skills":[],"nice_to_have_skills":[],"min_years":null,"education_level":null}',
  weights jsonb not null default '{"skills":40,"experience":25,"education":15,"evidence":20}',
  blind_mode boolean not null default false,
  jd_warnings jsonb not null default '[]',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  file_path text, file_name text not null,
  raw_text text, excluded_text text,
  text_meta jsonb not null default '{}',
  extracted jsonb, extraction_confidence float,
  field_confidence jsonb not null default '{}',
  extraction_warnings jsonb not null default '[]',
  security_findings jsonb not null default '[]',
  skill_matches jsonb,
  status text not null default 'uploaded',
  error text,
  created_at timestamptz not null default now()
);
create table public.skill_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  candidate_id uuid references public.candidates(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  skill text not null, embedding vector
);
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  candidate_id uuid not null unique references public.candidates(id) on delete cascade,
  total_score float, score_low float, score_high float,
  skills_score float, experience_score float, education_score float, evidence_score float,
  skill_breakdown jsonb, flags jsonb, explanation text, interview_questions jsonb, counterfactuals jsonb,
  created_at timestamptz not null default now()
);
create table public.corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  field_path text not null, old_value jsonb, new_value jsonb,
  created_at timestamptz not null default now()
);
create table public.eval_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  candidate_id uuid not null unique references public.candidates(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  ground_truth_label text check (ground_truth_label in ('strong','maybe','weak')),
  planted_issues jsonb not null default '[]'
);
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  job_id uuid references public.jobs(id) on delete set null,
  hash text not null,
  generated_at timestamptz not null default now(),
  payload_snapshot jsonb not null
);

grant select, insert, update, delete on public.jobs, public.candidates, public.skill_embeddings, public.scores, public.corrections, public.eval_labels, public.exports to authenticated;
grant all on public.jobs, public.candidates, public.skill_embeddings, public.scores, public.corrections, public.eval_labels, public.exports to service_role;
grant select on public.exports to anon;

alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.skill_embeddings enable row level security;
alter table public.scores enable row level security;
alter table public.corrections enable row level security;
alter table public.eval_labels enable row level security;
alter table public.exports enable row level security;

create policy "own jobs" on public.jobs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own candidates" on public.candidates for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own embeddings" on public.skill_embeddings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scores" on public.scores for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own corrections" on public.corrections for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own labels" on public.eval_labels for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own exports" on public.exports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public verify exports" on public.exports for select to anon using (true);

create policy "own resume files read" on storage.objects for select to authenticated using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own resume files insert" on storage.objects for insert to authenticated with check (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own resume files delete" on storage.objects for delete to authenticated using (bucket_id='resumes' and (storage.foldername(name))[1] = auth.uid()::text);