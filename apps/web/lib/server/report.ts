import "server-only";

import { buildReportCard, type ReportCard, type SynapseStore } from "@synapse/core";

/** The weekly report card for the web user (same numbers the iMessage agent texts). */
export function reportCardFor(store: SynapseStore, userId: string, now: number): ReportCard {
  return buildReportCard(store.stats(userId, now), now, store.policy.dayMs);
}
