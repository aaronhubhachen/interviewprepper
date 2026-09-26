/**
 * Minimal Web Speech API recognition types. TypeScript's lib.dom ships
 * SpeechSynthesis but not SpeechRecognition (Chrome/Edge/Safari expose it as
 * `webkitSpeechRecognition`; Firefox has neither), so we declare just the
 * surface we use instead of augmenting globals.
 */

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike | undefined;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

/** https://webaudio.github.io/web-speech-api/#speechreco-error */
export type SpeechRecognitionErrorCode =
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "bad-grammar"
  | "language-not-supported"
  | "phrases-not-supported";

export interface SpeechRecognitionErrorEventLike {
  readonly error: SpeechRecognitionErrorCode | (string & {});
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechScope {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/** The recognition constructor for this browser, or null (Firefox, SSR, old Safari). */
export function getSpeechRecognition(scope: unknown = typeof window === "undefined" ? undefined : window): SpeechRecognitionConstructor | null {
  if (!scope || typeof scope !== "object") return null;
  const candidate = scope as SpeechScope;
  const ctor = candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition;
  return typeof ctor === "function" ? ctor : null;
}

/** speechSynthesis is available (all evergreen browsers, but not every embedded webview). */
export function hasSpeechSynthesis(scope: unknown = typeof window === "undefined" ? undefined : window): boolean {
  if (!scope || typeof scope !== "object") return false;
  const candidate = scope as { speechSynthesis?: unknown; SpeechSynthesisUtterance?: unknown };
  return Boolean(candidate.speechSynthesis) && typeof candidate.SpeechSynthesisUtterance === "function";
}
