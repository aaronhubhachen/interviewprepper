import type { Metadata } from "next";
import { parseFilters } from "@/components/practice/filters";
import { ProblemList } from "@/components/practice/ProblemList";

export const metadata: Metadata = {
  title: "Practice",
  description: "Card-flip LeetCode IDE: invariant, edge-case trap, then code against hidden tests in the browser.",
};

/** /practice?tag=dp_state_compression&difficulty=hard&weak=1&q=coin */
export default async function PracticePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initialFilters = parseFilters(await searchParams);
  return <ProblemList initialFilters={initialFilters} />;
}
