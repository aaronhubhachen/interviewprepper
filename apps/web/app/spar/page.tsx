import { listBehavioral } from "@synapse/core/content";
import type { Metadata } from "next";
import { SparStudio } from "@/components/spar/SparStudio";
import { listSessions } from "@/lib/server/spar";
import { currentUserId, getStore } from "@/lib/server/store";
import type { SparSessionSummary } from "@/lib/types";
import { practiceTotals, type PracticeTotals } from "@/lib/voice/sessions";

export const metadata: Metadata = {
  title: "Spar",
  description: "Voice behavioral sparring: live STAR, filler and ownership metrics, then Engineering Manager feedback.",
};

const SESSION_LIMIT = 30;
/** Ceiling for the per-question totals scan (far beyond any real practice history). */
const TOTALS_LIMIT = 10_000;

/**
 * /spar: voice behavioral sparring. Questions and recent sessions are loaded on
 * the server so the first paint has no loading flash; if the store is unavailable
 * the client fetches history itself (and shows its own error state).
 * Per-question totals ("New to you", best scores, Surprise me) cover every
 * session, not just the SESSION_LIMIT shown in the history list.
 * ?q=<question id> deep-links straight into the interview room.
 */
export default async function SparPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = await searchParams;
  const questions = listBehavioral().map((question) => ({ ...question }));

  let sessions: SparSessionSummary[] | null = null;
  let totals: PracticeTotals | null = null;
  try {
    const store = getStore();
    const userId = currentUserId();
    sessions = listSessions(store, userId, SESSION_LIMIT).sessions;
    totals = practiceTotals(store.listSparSessions(userId, TOTALS_LIMIT));
  } catch (error) {
    console.error("[spar] could not preload sessions", error);
  }

  return (
    <SparStudio
      questions={questions}
      initialSessions={sessions}
      initialTotals={totals}
      initialQuestionId={typeof q === "string" ? q : undefined}
      renderedAt={Date.now()}
    />
  );
}
