import type { Metadata } from "next";
import { GrillStudio } from "@/components/grill/GrillStudio";

export const metadata: Metadata = {
  title: "Resume grill",
  description: "Upload your resume and defend every claim against a skeptical interviewer.",
};

export default function GrillPage() {
  return <GrillStudio />;
}
