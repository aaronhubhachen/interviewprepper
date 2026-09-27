import type { SpaceIdentity } from "./types";

/**
 * Canonical form for matching sender handles: lowercase emails, E.164-style phone numbers.
 * A bare 10-digit number is taken as US (+1); anything written with a leading "+" already
 * carries its country code and is kept as is ("+3225551234" stays Belgian).
 */
export function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed.toLowerCase();
  if (!trimmed.startsWith("+") && digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/** Extracts the 4-digit code from "link 1234" / "LINK: 1234" / "link #1234". */
export function parseLinkCode(text: string): string | undefined {
  return /^\s*link\b[\s:#-]*(\d{4})\s*$/i.exec(text)?.[1];
}

export const LINK_CODE_PATTERN = /^\d{4}$/;

/**
 * True for group chats. Uses the platform's space type when the caller passes it, and
 * otherwise the iMessage chat GUID convention ("iMessage;+;chat…" is a group,
 * "iMessage;-;+1555…" a DM). Unknown formats count as DMs.
 */
export function isGroupSpace(identity: Pick<SpaceIdentity, "spaceId" | "spaceType">): boolean {
  if (identity.spaceType) return identity.spaceType === "group";
  return /;\+;/.test(identity.spaceId);
}
