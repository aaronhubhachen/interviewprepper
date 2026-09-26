/** Picks the most natural-sounding English voice for the interviewer. Pure, for tests. */

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/** Most natural first: Edge/Windows neural voices, Chrome's Google voice, macOS/iOS voices. */
const PREFERRED: readonly RegExp[] = [
  /\bnatural\b/i,
  /\bneural\b/i,
  /google us english/i,
  /\b(samantha|ava|allison|susan)\b/i,
  /\b(aria|jenny|guy|zira|david|mark)\b/i,
  /google uk english/i,
  /\b(daniel|karen|moira|serena)\b/i,
];

function normalizeLang(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

export function pickVoice<T extends VoiceLike>(voices: readonly T[], preferredLang = "en-US"): T | null {
  if (voices.length === 0) return null;
  const want = normalizeLang(preferredLang);
  const english = voices.filter((voice) => normalizeLang(voice.lang).startsWith("en"));
  const exact = english.filter((voice) => normalizeLang(voice.lang) === want);
  for (const pattern of PREFERRED) {
    const match = exact.find((voice) => pattern.test(voice.name)) ?? english.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return exact[0] ?? english.find((voice) => voice.default) ?? english[0] ?? voices.find((voice) => voice.default) ?? voices[0] ?? null;
}

/** Recognition language: the user's English locale if they have one, else US English (the analyzer is English-only). */
export function recognitionLang(navigatorLanguage: string | undefined): string {
  if (navigatorLanguage && /^en(-|$)/i.test(navigatorLanguage)) return navigatorLanguage;
  return "en-US";
}
