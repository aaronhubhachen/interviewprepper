import { listBehavioral, listProblems } from "@synapse/core/content";
import type { Metadata } from "next";
import { MockStudio, type MockProblemRef } from "@/components/mock/MockStudio";

export const metadata: Metadata = {
  title: "Mock loop",
  description: "A timed coding round, a behavioral story, and a resume grill, ending in a hiring-committee packet.",
};

/** /mock: the full interview loop. Only problem refs ship to the client; the chosen problem loads on start. */
export default function MockPage() {
  const problems: MockProblemRef[] = listProblems().map((problem) => ({ id: problem.id, title: problem.title, difficulty: problem.difficulty }));
  return <MockStudio problems={problems} questions={[...listBehavioral()]} />;
}
