import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = { title: "Interview Prepper" };

export default function HomePage() {
  return <LandingPage />;
}
