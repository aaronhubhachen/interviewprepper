/**
 * Framework-agnostic wrapper around the Web Speech API recognizer:
 *   - continuous + interim results,
 *   - transparent auto-restart when the engine ends a session on its own
 *     (Chrome stops after ~5-10 s of silence or ~60 s of speech),
 *   - text accumulated across restarts,
 *   - errors mapped to a few user-facing kinds (permission denied, no mic, …),
 *   - stop() that waits for the final result to flush and resolves with the full transcript.
 *
 * Audio never leaves the browser through this code: the engine hands us text only.
 * No React here, so it is unit-testable with a fake engine and scheduler.
 */
import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from "./speech-types";

export type RecognizerStatus = "idle" | "starting" | "listening" | "stopping";

export type RecognizerErrorKind = "denied" | "no-mic" | "network" | "language" | "unstable" | "unknown";

export interface RecognizerError {
  kind: RecognizerErrorKind;
  message: string;
}

export interface RecognizerSnapshot {
  status: RecognizerStatus;
  /** Finalized transcript so far (across engine restarts). */
  finalText: string;
  /** Words of the current phrase that may still change. */
  interimText: string;
  /** The engine currently detects speech. */
  hearing: boolean;
  /** Set when recognition stopped because of a problem; cleared by start(). */
  error: RecognizerError | null;
  /** Silent engine restarts during this recording. */
  restarts: number;
}

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface RecognizerOptions {
  Recognition: SpeechRecognitionConstructor;
  /** BCP-47 language (default "en-US"). */
  lang?: string;
  onChange?: (snapshot: RecognizerSnapshot) => void;
  /** Injected for tests (default: global setTimeout). */
  scheduler?: Scheduler;
  /** Injected for tests (default: Date.now). */
  now?: () => number;
  /** How long stop() waits for the engine's final onend (default 2500 ms). */
  stopTimeoutMs?: number;
}

export const EMPTY_SNAPSHOT: RecognizerSnapshot = Object.freeze({
  status: "idle",
  finalText: "",
  interimText: "",
  hearing: false,
  error: null,
  restarts: 0,
}) as RecognizerSnapshot;

/** A session that ends this fast with no text counts toward the "engine keeps dying" guard. */
const QUICK_END_MS = 800;
const MAX_QUICK_EMPTY_ENDS = 6;
const MAX_NETWORK_RETRIES = 2;

const ERROR_COPY: Record<RecognizerErrorKind, string> = {
  denied:
    "Microphone or speech recognition access is blocked. Allow the microphone from the address bar (on iPhone, also turn on Siri & Dictation), or type your answer instead.",
  "no-mic": "No microphone was found. Plug one in, or type your answer instead.",
  network: "The browser's speech service could not be reached. Check your connection, or type your answer instead.",
  language: "Speech recognition does not support this language here. Type your answer instead.",
  unstable: "Speech recognition keeps stopping in this browser. Type your answer instead.",
  unknown: "Speech recognition stopped unexpectedly. Try again, or type your answer instead.",
};

export function recognizerErrorMessage(kind: RecognizerErrorKind): string {
  return ERROR_COPY[kind];
}

function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Case- and punctuation-insensitive word comparison ("job." matches "job"). */
function sameWord(a: string, b: string): boolean {
  const norm = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  return norm(a) === norm(b);
}

function startsWithWords(longer: string[], shorter: string[]): boolean {
  if (shorter.length === 0 || shorter.length > longer.length) return false;
  return shorter.every((word, index) => sameWord(longer[index]!, word));
}

/** Joins transcript chunks with single spaces (engines prefix later chunks with a space, or not). */
export function joinChunks(chunks: readonly string[]): string {
  return chunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
}

/** A phrase this long that ends without punctuation is treated as a finished sentence. */
const SENTENCE_MIN_WORDS = 4;

/**
 * Joins finalized phrases as sentences. Desktop engines return unpunctuated,
 * pause-delimited phrases; giving each one a capital and a period (when it has a
 * few words and no punctuation of its own) lets the STAR analyzer see real sentence
 * boundaries instead of fixed 25-word chunks, and makes the transcript readable.
 */
export function joinPhrases(phrases: readonly string[]): string {
  let out = "";
  for (const raw of phrases) {
    let phrase = raw.replace(/\s+/g, " ").trim();
    if (!phrase) continue;
    const sentenceStart = out === "" || /[.!?…]$/.test(out);
    if (sentenceStart) phrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    if (!/[.!?…,;:]$/.test(phrase) && words(phrase).length >= SENTENCE_MIN_WORDS) phrase += ".";
    out = out ? `${out} ${phrase}` : phrase;
  }
  return out;
}

/**
 * Chrome on Android reports cumulative finals ("so", "so at my", "so at my last job")
 * instead of disjoint phrases. Collapse a chunk into the next one when the next
 * one repeats it word-for-word; desktop engines never trigger this.
 */
export function collapseCumulative(chunks: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    const previous = out.at(-1);
    if (previous !== undefined) {
      const prevWords = words(previous);
      const nextWords = words(chunk);
      if (prevWords.length >= 2 && startsWithWords(nextWords, prevWords)) {
        out[out.length - 1] = chunk;
        continue;
      }
      if (nextWords.length >= 2 && startsWithWords(prevWords, nextWords)) continue;
    }
    out.push(chunk);
  }
  return out;
}

/** Drops an interim phrase's repeat of the finalized text (the same Android quirk). */
export function stripRepeatedPrefix(interim: string, finalText: string): string {
  const interimWords = words(interim);
  const finalWords = words(finalText);
  if (finalWords.length >= 2 && startsWithWords(interimWords, finalWords)) {
    return interimWords.slice(finalWords.length).join(" ");
  }
  return joinChunks([interim]);
}

const defaultScheduler: Scheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class SpeechRecognizer {
  private readonly options: RecognizerOptions;
  private readonly scheduler: Scheduler;
  private readonly now: () => number;

  private rec: SpeechRecognitionLike | null = null;
  private wantActive = false;
  private committed: string[] = [];
  private sessionFinal = "";
  private sessionInterim = "";
  private sessionStartedAt = 0;
  private quickEmptyEnds = 0;
  private networkRetries = 0;
  private pendingError: RecognizerError | null = null;
  private restartTimer: unknown = null;
  private stopTimer: unknown = null;
  private stopWaiters: Array<(text: string) => void> = [];
  private snapshot: RecognizerSnapshot = EMPTY_SNAPSHOT;
  private listener: ((snapshot: RecognizerSnapshot) => void) | undefined;

  constructor(options: RecognizerOptions) {
    this.options = options;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.now = options.now ?? Date.now;
    this.listener = options.onChange;
  }

  getSnapshot(): RecognizerSnapshot {
    return this.snapshot;
  }

  /** Finalized text plus the current interim phrase. */
  get text(): string {
    return joinChunks([joinPhrases([...this.committed, this.sessionFinal]), stripRepeatedPrefix(this.sessionInterim, this.sessionFinal)]);
  }

  get active(): boolean {
    return this.wantActive || this.rec !== null;
  }

  /** Starts (or keeps) listening. Existing text is kept; call reset() for a fresh take. */
  start(): void {
    if (this.wantActive) return;
    if (this.rec) {
      // Still flushing a previous stop(): the engine's onend restarts it because we want it active again.
      this.wantActive = true;
      this.pendingError = null;
      if (this.stopTimer !== null) {
        this.scheduler.clearTimeout(this.stopTimer);
        this.stopTimer = null;
      }
      const waiters = this.stopWaiters;
      this.stopWaiters = [];
      for (const resolve of waiters) resolve(this.text);
      this.update({ status: "listening", error: null });
      return;
    }
    this.wantActive = true;
    this.quickEmptyEnds = 0;
    this.networkRetries = 0;
    this.pendingError = null;
    this.update({ status: "starting", error: null, hearing: false, restarts: 0 });
    this.launch();
  }

  /** Stops listening; resolves with the full transcript once the engine has flushed its last phrase. */
  stop(): Promise<string> {
    this.wantActive = false;
    this.clearRestart();
    if (!this.rec) {
      this.finish(this.pendingError);
      return Promise.resolve(this.text);
    }
    const done = new Promise<string>((resolve) => this.stopWaiters.push(resolve));
    if (this.snapshot.status !== "stopping") {
      this.update({ status: "stopping" });
      try {
        this.rec.stop();
      } catch {
        // Engine already stopping; onend (or the timeout below) finishes up.
      }
    }
    this.stopTimer ??= this.scheduler.setTimeout(() => this.forceEnd(), this.options.stopTimeoutMs ?? 2500);
    return done;
  }

  /** Stops immediately and throws the transcript away. */
  abort(): void {
    this.wantActive = false;
    this.clearRestart();
    const rec = this.rec;
    this.rec = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    }
    this.committed = [];
    this.sessionFinal = "";
    this.sessionInterim = "";
    this.finish(null);
  }

  /** Clears the transcript (keeps listening if active). */
  reset(): void {
    this.committed = [];
    this.sessionFinal = "";
    this.sessionInterim = "";
    this.update({ finalText: "", interimText: "", error: this.wantActive ? null : this.snapshot.error });
  }

  /** Detaches the listener and releases the engine (component unmount). */
  dispose(): void {
    this.listener = undefined;
    this.abort();
  }

  // ── engine lifecycle ───────────────────────────────────────────────────

  private launch(): void {
    this.restartTimer = null;
    if (!this.wantActive) return;
    const rec = new this.options.Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.options.lang ?? "en-US";
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      if (this.rec === rec && this.wantActive) this.update({ status: "listening" });
    };
    rec.onresult = (event) => {
      if (this.rec === rec) this.handleResult(event);
    };
    rec.onerror = (event) => {
      if (this.rec === rec) this.handleError(event);
    };
    rec.onspeechstart = () => {
      if (this.rec === rec) this.update({ hearing: true });
    };
    rec.onspeechend = () => {
      if (this.rec === rec) this.update({ hearing: false });
    };
    rec.onend = () => {
      if (this.rec === rec) this.handleEnd();
    };
    this.rec = rec;
    this.sessionStartedAt = this.now();
    this.sessionFinal = "";
    this.sessionInterim = "";
    try {
      rec.start();
    } catch (error) {
      this.rec = null;
      this.wantActive = false;
      this.finish({
        kind: "unknown",
        message: error instanceof Error && error.message ? error.message : ERROR_COPY.unknown,
      });
    }
  }

  private handleResult(event: SpeechRecognitionEventLike): void {
    const finals: string[] = [];
    const interim: string[] = [];
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result) continue;
      const transcript = result[0]?.transcript ?? "";
      (result.isFinal ? finals : interim).push(transcript);
    }
    this.sessionFinal = joinPhrases(collapseCumulative(finals));
    this.sessionInterim = joinChunks(interim);
    if (this.sessionFinal || this.sessionInterim) this.networkRetries = 0;
    this.emitText();
  }

  private handleError(event: SpeechRecognitionErrorEventLike): void {
    switch (event.error) {
      case "no-speech":
      case "aborted":
        // The engine ends the session next; onend restarts it while recording.
        return;
      case "network":
        if (this.networkRetries < MAX_NETWORK_RETRIES) {
          this.networkRetries++;
          return;
        }
        this.fail("network");
        return;
      case "not-allowed":
      case "service-not-allowed":
        this.fail("denied");
        return;
      case "audio-capture":
        this.fail("no-mic");
        return;
      case "language-not-supported":
        this.fail("language");
        return;
      default:
        this.fail("unknown");
    }
  }

  private fail(kind: RecognizerErrorKind): void {
    this.pendingError = { kind, message: ERROR_COPY[kind] };
    this.wantActive = false;
    // onend follows every error in the spec; finish() runs there (or via the stop timeout).
    this.stopTimer ??= this.scheduler.setTimeout(() => this.forceEnd(), this.options.stopTimeoutMs ?? 2500);
  }

  private handleEnd(): void {
    const sessionText = joinPhrases([this.sessionFinal, stripRepeatedPrefix(this.sessionInterim, this.sessionFinal)]);
    if (sessionText) this.committed.push(sessionText);
    const lasted = this.now() - this.sessionStartedAt;
    this.sessionFinal = "";
    this.sessionInterim = "";
    this.rec = null;

    if (!this.wantActive) {
      this.finish(this.pendingError);
      return;
    }

    this.quickEmptyEnds = !sessionText && lasted < QUICK_END_MS ? this.quickEmptyEnds + 1 : 0;
    if (this.quickEmptyEnds >= MAX_QUICK_EMPTY_ENDS) {
      this.wantActive = false;
      this.finish({ kind: "unstable", message: ERROR_COPY.unstable });
      return;
    }
    this.update({
      restarts: this.snapshot.restarts + 1,
      hearing: false,
      finalText: this.text,
      interimText: "",
    });
    const delay = this.quickEmptyEnds > 0 ? Math.min(1000, 100 * 2 ** this.quickEmptyEnds) : 0;
    this.restartTimer = this.scheduler.setTimeout(() => this.launch(), delay);
  }

  /** The engine never fired onend after stop()/an error: keep what we have and finish. */
  private forceEnd(): void {
    this.stopTimer = null;
    const rec = this.rec;
    if (!rec) return;
    const sessionText = joinPhrases([this.sessionFinal, stripRepeatedPrefix(this.sessionInterim, this.sessionFinal)]);
    if (sessionText) this.committed.push(sessionText);
    this.sessionFinal = "";
    this.sessionInterim = "";
    this.rec = null;
    try {
      rec.abort();
    } catch {
      // ignore
    }
    this.wantActive = false;
    this.finish(this.pendingError);
  }

  private finish(error: RecognizerError | null): void {
    this.clearRestart();
    if (this.stopTimer !== null) {
      this.scheduler.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.pendingError = null;
    this.update({ status: "idle", hearing: false, error, finalText: this.text, interimText: "" });
    const waiters = this.stopWaiters;
    this.stopWaiters = [];
    const text = this.text;
    for (const resolve of waiters) resolve(text);
  }

  private clearRestart(): void {
    if (this.restartTimer !== null) {
      this.scheduler.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private emitText(): void {
    this.update({
      finalText: joinPhrases([...this.committed, this.sessionFinal]),
      interimText: stripRepeatedPrefix(this.sessionInterim, this.sessionFinal),
    });
  }

  private update(patch: Partial<RecognizerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listener?.(this.snapshot);
  }
}
