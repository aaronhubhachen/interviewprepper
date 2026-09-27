import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = { title: { absolute: "Prepr" } };

export default function HomePage() {
  return <LandingPage />;
}
