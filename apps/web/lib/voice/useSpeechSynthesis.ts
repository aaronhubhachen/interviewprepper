import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hasSpeechSynthesis } from "./speech-types";
import { pickVoice } from "./voices";

const noopSubscribe = () => () => {};

export interface SpeakOptions {
  /** Called when the utterance finishes naturally (not when cancelled). */
  onEnd?: () => void;
  rate?: number;
}

export interface SpeechSynthesisControls {
  /** null until hydrated. */
  supported: boolean | null;
  speaking: boolean;
  speak: (text: string, options?: SpeakOptions) => void;
  cancel: () => void;
}

/** The interviewer's voice (window.speechSynthesis), with the most natural English voice available. */
export function useSpeechSynthesis(): SpeechSynthesisControls {
  const supported = useSyncExternalStore<boolean | null>(noopSubscribe, () => hasSpeechSynthesis(), () => null);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Chrome garbage-collects in-flight utterances (and never fires onend) unless something holds them.
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const choose = () => {
      voiceRef.current = pickVoice(synth.getVoices());
    };
    choose();
    synth.addEventListener?.("voiceschanged", choose);
    return () => {
      synth.removeEventListener?.("voiceschanged", choose);
      currentRef.current = null;
      synth.cancel();
    };
  }, [supported]);

  const cancel = useCallback(() => {
    if (!hasSpeechSynthesis()) return;
    currentRef.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    if (!hasSpeechSynthesis() || !text.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voiceRef.current ?? pickVoice(synth.getVoices());
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = options.rate ?? 1;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (currentRef.current === utterance) setSpeaking(true);
    };
    utterance.onend = () => {
      if (currentRef.current !== utterance) return;
      currentRef.current = null;
      setSpeaking(false);
      options.onEnd?.();
    };
    utterance.onerror = () => {
      if (currentRef.current !== utterance) return;
      currentRef.current = null;
      setSpeaking(false);
    };
    currentRef.current = utterance;
    setSpeaking(true);
    synth.speak(utterance);
    // Some engines start paused after a cancel(); resume is a no-op otherwise.
    synth.resume();
  }, []);

  return { supported, speaking, speak, cancel };
}
