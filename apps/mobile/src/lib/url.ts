/** Pure server-address helpers (no React Native imports, so they are unit-testable). */

export const WEB_PORT = 3000;

/** The web app runs on the same machine as the Expo dev server: reuse its host with the Next.js port. */
export function serverUrlFromHostUri(hostUri: string | null | undefined): string {
  const host = hostUri?.split(":")[0]?.trim();
  return `http://${host || "localhost"}:${WEB_PORT}`;
}

/** "192.168.1.20:3000/" → "http://192.168.1.20:3000"; empty stays empty. */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}
