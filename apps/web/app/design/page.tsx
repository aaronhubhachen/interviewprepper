import { DESIGN_COMPONENTS, DESIGN_PHASE_LABELS, DESIGN_PROMPTS } from "@synapse/core";
import type { Metadata } from "next";
import { DesignStudio } from "@/components/design/DesignStudio";

export const metadata: Metadata = {
  title: "System design",
  description: "Draw the architecture on a whiteboard while an AI interviewer reads your diagram and probes it.",
};

export default function DesignPage() {
  return <DesignStudio prompts={[...DESIGN_PROMPTS]} components={[...DESIGN_COMPONENTS]} phaseLabels={{ ...DESIGN_PHASE_LABELS }} />;
}
