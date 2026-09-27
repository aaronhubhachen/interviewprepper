/**
 * Log hygiene. iMessage DM space ids embed the texter's phone number or email
 * ("iMessage;-;+13145550101"), and the console is routinely screen-shared at a
 * hackathon, so every log line goes through `redact` before it is printed.
 */

/** "+13145550101" → "*******0101". Short values are fully masked. */
export function maskHandle(handle: string): string {
  return handle.length <= 4 ? "****" : `${"*".repeat(Math.max(0, handle.length - 4))}${handle.slice(-4)}`;
}

const EMAIL = /[A-Z0-9._%+-]+@([A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,})/gi;
/** Seven or more digits, optionally with a leading "+": phone numbers in handles and space ids. */
const PHONE = /\+?\d{7,}/g;

/** Masks every phone number (keeps the last 4 digits) and email local part in a log line. */
export function redact(line: string): string {
  return line
    .replace(EMAIL, (match, domain: string) => `${match[0]}***@${domain}`)
    .replace(PHONE, (match) => `***${match.slice(-4)}`);
}

/** Space ids are logged masked: "iMessage;-;+13145550101" → "iMessage;-;***0101". */
export function maskSpaceId(spaceId: string): string {
  return redact(spaceId);
}
