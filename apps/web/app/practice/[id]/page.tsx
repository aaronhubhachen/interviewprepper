import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { drillCardsForProblem, getProblem } from "@synapse/core/content";
import { ProblemWorkspace } from "@/components/practice/ProblemWorkspace";
import { toClientProblem } from "@/lib/server/serialize";

type Props = { params: Promise<{ id: string }> };

function resolve(id: string) {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // keep the raw segment
  }
  return getProblem(decoded);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const problem = resolve((await params).id);
  return problem
    ? { title: problem.title, description: `${problem.title}: invariant, edge-case trap, then code, with struggles synced to iMessage drills.` }
    : { title: "Problem not found" };
}

/**
 * The statement ships with the HTML (no loading flash): the problem is
 * static content, stripped of reference solutions and answer keys by the same
 * serializer the API uses. Progress loads client-side.
 */
export default async function ProblemPage({ params }: Props) {
  const problem = resolve((await params).id);
  if (!problem) notFound();
  const relatedCards = drillCardsForProblem(problem)
    .slice(0, 6)
    .map((card) => ({ id: card.id, title: card.title }));
  return <ProblemWorkspace key={problem.id} problem={toClientProblem(problem, relatedCards)} />;
}
