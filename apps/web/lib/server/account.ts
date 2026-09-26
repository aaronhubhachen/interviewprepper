import "server-only";

import { llmStatus, type SynapseStore } from "@synapse/core";
import type { LinkResponse, StatsResponse } from "@/lib/types";
import { queueCounts } from "./review";
import { timeScale } from "./serialize";

/** Dashboard payload: core stats + LLM status (never the key) + time scale + queue. */
export function statsPayload(store: SynapseStore, userId: string, now: number): StatsResponse {
  const stats = store.stats(userId, now);
  const llm = llmStatus();
  return {
    ...stats,
    llmConfigured: llm.configured,
    llm,
    timeScale: timeScale(store),
    queue: queueCounts(store, userId, now),
  };
}

/** Optional: the Synapse iMessage number/email, so the dashboard can offer an sms: link. */
function agentHandle(): string | null {
  const value = process.env.SYNAPSE_AGENT_HANDLE?.trim();
  return value ? value : null;
}

export function linkPayload(store: SynapseStore, userId: string, now: number): LinkResponse {
  const user = store.ensureUser(userId, now);
  const linked = Boolean(user.spaceId);
  const code = linked ? null : store.createOrGetLinkCode(userId);
  const handle = agentHandle();
  const instructions = linked
    ? `Linked${user.handle ? ` to ${user.handle}` : ""}. Synapse texts you micro-cards when they are due.`
    : `Text “link ${code}” to ${handle ?? "the Synapse number"} on iMessage to connect this dashboard.`;
  return {
    linked,
    handle: user.handle,
    platform: user.platform,
    code,
    paused: user.paused,
    agentHandle: handle,
    instructions,
  };
}

export function setAgentPaused(store: SynapseStore, userId: string, now: number, paused: boolean): LinkResponse {
  store.ensureUser(userId, now);
  store.setPaused(userId, paused, now);
  return linkPayload(store, userId, now);
}
