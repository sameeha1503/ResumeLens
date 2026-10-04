import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "How ResumeLens works" }, { name: "description", content: "Architecture, scoring and limitations of ResumeLens." }, { property: "og:title", content: "How ResumeLens works" }, { property: "og:description", content: "Architecture, scoring and limitations." }] }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Logo />
      <h1 className="mt-8 font-display text-4xl font-extrabold">How it works</h1>
      <p className="mt-4 text-mist">Resumes are parsed, security-scanned (prompt injection, hidden text, keyword stuffing), extracted twice by AI for self-consistency, matched to job skills with embeddings plus AI confirmation, then scored deterministically by evidence, recency, dated experience and education.</p>
      <h2 className="mt-8 font-display text-2xl font-bold">AI disclosure</h2>
      <p className="mt-2 text-mist">AI models are used for extraction, classification, matching and OCR. Scores and explanations are computed from stored data.</p>
      <h2 className="mt-8 font-display text-2xl font-bold">Known limitations</h2>
      <p className="mt-2 text-mist">Text colour in PDFs is not inspected; the model does not support temperature 0; AI output can be wrong — always review evidence.</p>
    </div>
  );
}
