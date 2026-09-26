/** Canonical form for matching sender handles: lowercase emails, E.164-style phone numbers. */
export function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed.toLowerCase();
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/** Extracts the 4-digit code from "link 1234" / "LINK: 1234" / "link #1234". */
export function parseLinkCode(text: string): string | undefined {
  return /^\s*link\b[\s:#-]*(\d{4})\s*$/i.exec(text)?.[1];
}

export const LINK_CODE_PATTERN = /^\d{4}$/;
