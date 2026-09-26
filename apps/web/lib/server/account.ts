import "server-only";

import { llmStatus, type ActivityEvent, type SynapseStore } from "@synapse/core";
import type { LinkResponse, StatsResponse } from "@/lib/types";
import { queueCounts } from "./review";
import { timeScale } from "./serialize";

/**
 * Masks a linked phone number or email for display: "+15551234567" becomes
 * "•••4567" and "ada@example.com" becomes "a•••@example.com". The owner still
 * recognizes it; the API never hands the full handle to whoever can reach it.
 */
export function maskHandle(handle: string | null | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  const at = value.lastIndexOf("@");
  if (at > 0) return `${value[0]}•••${value.slice(at)}`;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `•••${digits.slice(-4)}` : "•••";
}

/** The "linked" event records the raw handle in its detail; mask it like the link card. */
function maskEvent(event: ActivityEvent): ActivityEvent {
  if (!event.detail || typeof event.detail.handle !== "string") return event;
  return { ...event, detail: { ...event.detail, handle: maskHandle(event.detail.handle) } };
}

/**
 * Dashboard payload: core stats + LLM status (never the key) + time scale + queue.
 * The iMessage space id (it embeds the phone number) is never sent; the handle is masked.
 */
export function statsPayload(store: SynapseStore, userId: string, now: number): StatsResponse {
  const stats = store.stats(userId, now);
  const llm = llmStatus();
  return {
    ...stats,
    link: { ...stats.link, spaceId: null, handle: maskHandle(stats.link.handle) },
    recentActivity: stats.recentActivity.map(maskEvent),
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
  const userHandle = maskHandle(user.handle);
  const instructions = linked
    ? `Linked${userHandle ? ` to ${userHandle}` : ""}. Synapse texts you micro-cards when they are due.`
    : `Text “link ${code}” to ${handle ?? "the Synapse number"} on iMessage to connect this dashboard.`;
  return {
    linked,
    handle: userHandle,
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
