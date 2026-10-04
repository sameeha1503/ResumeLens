// Shared domain types for ResumeLens (client + server safe).

export type Weights = { skills: number; experience: number; education: number; evidence: number };
export const DEFAULT_WEIGHTS: Weights = { skills: 40, experience: 25, education: 15, evidence: 20 };

export type Requirements = {
  required_skills: string[];
  nice_to_have_skills: string[];
  min_years: number | null;
  education_level: string | null;
};

export type JdWarning = { type: string; message: string; suggestion: string | null };

export type ExtractedSkill = {
  name: string;
  evidence_quote: string | null;
  source_section: string | null;
  last_used_year: number | null;
};
export type Education = {
  degree: string | null;
  field: string | null;
  institution: string | null;
  start_year: number | null;
  end_year: number | null;
  evidence_quote: string | null;
};
export type Experience = {
  title: string | null;
  company: string | null;
  start_date: string | null; // YYYY-MM
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  technologies: string[];
  evidence_quote: string | null;
};
export type Project = {
  name: string | null;
  description: string | null;
  technologies: string[];
  evidence_quote: string | null;
};
export type Extracted = {
  name: string | null;
  email: string | null;
  skills: ExtractedSkill[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  total_years_experience_claimed: number | null;
  extraction_confidence: number;
  extraction_warnings: string[];
};

export type SecurityFinding = {
  type: "prompt_injection" | "keyword_stuffing" | "hidden_text";
  severity: "info" | "warning" | "high";
  text: string;
  detail: string;
};

export type SkillMatch = {
  jd_skill: string;
  required: boolean;
  status: "matched" | "partial" | "missing";
  matched_skill: string | null;
  similarity: number | null;
};

export type Severity = "info" | "warning" | "high";
export type Flag = { type: string; severity: Severity; message: string; evidence: string };

export type EvidenceLevel = "supported" | "weakly supported" | "unsupported";

export type CandidateRow = {
  id: string;
  job_id: string;
  file_name: string;
  file_path: string | null;
  raw_text: string | null;
  excluded_text: string | null;
  text_meta: Record<string, unknown>;
  extracted: Extracted | null;
  extraction_confidence: number | null;
  field_confidence: Record<string, number>;
  extraction_warnings: string[];
  security_findings: SecurityFinding[];
  skill_matches: SkillMatch[] | null;
  status: string;
  error: string | null;
  created_at: string;
};

export type JobRow = {
  id: string;
  title: string;
  description: string;
  requirements: Requirements;
  weights: Weights;
  blind_mode: boolean;
  jd_warnings: JdWarning[];
  is_demo: boolean;
  created_at: string;
};
