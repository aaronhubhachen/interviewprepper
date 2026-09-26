import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EMPTY_SNAPSHOT, SpeechRecognizer, type RecognizerSnapshot } from "./recognizer";
import { getSpeechRecognition } from "./speech-types";
import { recognitionLang } from "./voices";

const noopSubscribe = () => () => {};

/**
 * Speech recognition support: null while server rendering / hydrating (so the
 * first client render matches the HTML), then true or false.
 */
export function useSpeechRecognitionSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    noopSubscribe,
    () => getSpeechRecognition() !== null,
    () => null,
  );
}

export interface SpeechRecognitionControls {
  supported: boolean | null;
  snapshot: RecognizerSnapshot;
  /** Start listening (keeps the existing transcript; call reset() first for a fresh take). */
  start: () => void;
  /** Stop and resolve with the full transcript once the last phrase has flushed. */
  stop: () => Promise<string>;
  /** Stop immediately and discard the transcript. */
  abort: () => void;
  /** Clear the transcript. */
  reset: () => void;
}

/** React binding for SpeechRecognizer (continuous, interim results, auto-restart). */
export function useSpeechRecognition(): SpeechRecognitionControls {
  const supported = useSpeechRecognitionSupport();
  const [snapshot, setSnapshot] = useState<RecognizerSnapshot>(EMPTY_SNAPSHOT);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  const recognizer = useCallback((): SpeechRecognizer | null => {
    if (recognizerRef.current) return recognizerRef.current;
    const Recognition = getSpeechRecognition();
    if (!Recognition) return null;
    recognizerRef.current = new SpeechRecognizer({
      Recognition,
      lang: recognitionLang(typeof navigator === "undefined" ? undefined : navigator.language),
      onChange: setSnapshot,
    });
    return recognizerRef.current;
  }, []);

  useEffect(
    () => () => {
      recognizerRef.current?.dispose();
      recognizerRef.current = null;
    },
    [],
  );

  const start = useCallback(() => recognizer()?.start(), [recognizer]);
  const stop = useCallback(async () => (await recognizer()?.stop()) ?? "", [recognizer]);
  const abort = useCallback(() => recognizer()?.abort(), [recognizer]);
  const reset = useCallback(() => recognizer()?.reset(), [recognizer]);

  return { supported, snapshot, start, stop, abort, reset };
}
