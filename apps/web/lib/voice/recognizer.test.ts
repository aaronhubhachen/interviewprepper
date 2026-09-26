import { describe, expect, it } from "vitest";
import { collapseCumulative, joinChunks, joinPhrases, SpeechRecognizer, stripRepeatedPrefix, type Scheduler } from "./recognizer";
import type { SpeechRecognitionErrorEventLike, SpeechRecognitionEventLike, SpeechRecognitionLike } from "./speech-types";
import { getSpeechRecognition } from "./speech-types";

/** A controllable fake of the browser engine. */
class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;
  private results: Array<{ transcript: string; isFinal: boolean }> = [];

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start(): void {
    this.started = true;
    this.onstart?.();
  }
  stop(): void {
    this.stopped = true;
  }
  abort(): void {
    this.aborted = true;
  }

  /** Emit the session's full result list (engines resend every result each time). */
  say(...results: Array<[string, boolean]>): void {
    this.results = results.map(([transcript, isFinal]) => ({ transcript, isFinal }));
    const list = this.results.map((result) => Object.assign([{ transcript: result.transcript, confidence: 0.9 }], { isFinal: result.isFinal }));
    this.onresult?.({ resultIndex: 0, results: list as unknown as SpeechRecognitionEventLike["results"] });
  }
  error(code: string): void {
    this.onerror?.({ error: code });
  }
  end(): void {
    this.onend?.();
  }
}

function manualScheduler() {
  let clock = 0;
  const tasks: Array<{ at: number; fn: () => void; id: number }> = [];
  let nextId = 1;
  const scheduler: Scheduler = {
    setTimeout(fn, ms) {
      const id = nextId++;
      tasks.push({ at: clock + ms, fn, id });
      return id;
    },
    clearTimeout(handle) {
      const index = tasks.findIndex((task) => task.id === handle);
      if (index >= 0) tasks.splice(index, 1);
    },
  };
  return {
    scheduler,
    now: () => clock,
    advance(ms: number) {
      clock += ms;
      for (;;) {
        tasks.sort((a, b) => a.at - b.at);
        const task = tasks[0];
        if (!task || task.at > clock) break;
        tasks.shift();
        task.fn();
      }
    },
    pending: () => tasks.length,
  };
}

function setup() {
  FakeRecognition.instances = [];
  const time = manualScheduler();
  const snapshots: string[] = [];
  const recognizer = new SpeechRecognizer({
    Recognition: FakeRecognition,
    lang: "en-GB",
    scheduler: time.scheduler,
    now: time.now,
    onChange: (snapshot) => snapshots.push(snapshot.status),
  });
  const engine = () => FakeRecognition.instances.at(-1)!;
  return { recognizer, time, engine, snapshots };
}

describe("text helpers", () => {
  it("joins chunks with single spaces", () => {
    expect(joinChunks(["  so at my last job", " we had  a problem ", ""])).toBe("so at my last job we had a problem");
  });

  it("collapses Android-style cumulative finals but keeps disjoint phrases", () => {
    expect(collapseCumulative(["so at", "so at my last", "so at my last job"])).toEqual(["so at my last job"]);
    expect(collapseCumulative(["at my last job", "we had an outage"])).toEqual(["at my last job", "we had an outage"]);
    expect(collapseCumulative(["i", "i think"])).toEqual(["i", "i think"]);
  });

  it("strips an interim phrase that repeats the finalized text", () => {
    expect(stripRepeatedPrefix("so at my last job we", "so at my last job")).toBe("we");
    expect(stripRepeatedPrefix("so at my last job we", "So at my last job.")).toBe("we");
    expect(stripRepeatedPrefix("we shipped it", "so at my last job")).toBe("we shipped it");
  });

  it("joins pause-delimited phrases as sentences so the analyzer sees real boundaries", () => {
    expect(joinPhrases(["at my last internship our checkout was slow", "my goal was to fix it"])).toBe(
      "At my last internship our checkout was slow. My goal was to fix it.",
    );
    // Short fragments stay open; engine punctuation (Safari, Android) is kept as is.
    expect(joinPhrases(["um so", "we had an outage"])).toBe("Um so we had an outage.");
    expect(joinPhrases(["Did it work?", "yes it did work"])).toBe("Did it work? Yes it did work.");
    expect(joinPhrases(["At my last job.", "", "  "])).toBe("At my last job.");
    expect(joinPhrases([])).toBe("");
  });
});

describe("getSpeechRecognition", () => {
  it("detects the standard and webkit-prefixed constructors", () => {
    expect(getSpeechRecognition({ SpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(getSpeechRecognition({ webkitSpeechRecognition: FakeRecognition })).toBe(FakeRecognition);
    expect(getSpeechRecognition({})).toBeNull();
    expect(getSpeechRecognition(undefined)).toBeNull();
  });
});

describe("SpeechRecognizer", () => {
  it("configures a continuous, interim engine and streams final + interim text", () => {
    const { recognizer, engine } = setup();
    recognizer.start();
    const rec = engine();
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(rec.lang).toBe("en-GB");
    expect(recognizer.getSnapshot().status).toBe("listening");

    rec.say(["at my last internship", true], [" we had a", false]);
    expect(recognizer.getSnapshot().finalText).toBe("At my last internship.");
    expect(recognizer.getSnapshot().interimText).toBe("we had a");
    expect(recognizer.text).toBe("At my last internship. we had a");
  });

  it("auto-restarts when the engine ends on its own and keeps the transcript", () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    engine().say(["at my last job", true]);
    time.advance(5000);
    engine().end();
    expect(recognizer.getSnapshot().restarts).toBe(1);
    time.advance(0);
    expect(FakeRecognition.instances).toHaveLength(2);
    expect(engine().started).toBe(true);

    engine().say(["I rewrote the cache layer", true]);
    expect(recognizer.getSnapshot().finalText).toBe("At my last job. I rewrote the cache layer.");
    expect(recognizer.getSnapshot().status).toBe("listening");
  });

  it("stop() waits for the last phrase to flush, then resolves with everything", async () => {
    const { recognizer, engine } = setup();
    recognizer.start();
    engine().say(["the result was", true], ["forty percent faster", false]);
    const done = recognizer.stop();
    expect(engine().stopped).toBe(true);
    expect(recognizer.getSnapshot().status).toBe("stopping");
    engine().say(["the result was", true], ["forty percent faster", true]);
    engine().end();
    await expect(done).resolves.toBe("The result was forty percent faster.");
    expect(recognizer.getSnapshot().status).toBe("idle");
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("stop() keeps the interim phrase and finishes even if the engine never ends", async () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    engine().say(["so basically", false]);
    const done = recognizer.stop();
    time.advance(2500);
    await expect(done).resolves.toBe("So basically");
    expect(engine().aborted).toBe(true);
    expect(recognizer.getSnapshot().status).toBe("idle");
  });

  it("maps a permission error to 'denied' and stops restarting", () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    engine().error("not-allowed");
    engine().end();
    time.advance(1000);
    const snapshot = recognizer.getSnapshot();
    expect(snapshot.status).toBe("idle");
    expect(snapshot.error?.kind).toBe("denied");
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("maps audio-capture to 'no-mic'", () => {
    const { recognizer, engine } = setup();
    recognizer.start();
    engine().error("audio-capture");
    engine().end();
    expect(recognizer.getSnapshot().error?.kind).toBe("no-mic");
  });

  it("ignores no-speech (Chrome's silence timeout) and just restarts", () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    time.advance(8000);
    engine().error("no-speech");
    engine().end();
    time.advance(0);
    expect(recognizer.getSnapshot().error).toBeNull();
    expect(FakeRecognition.instances).toHaveLength(2);
  });

  it("retries transient network errors, then gives up", () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    for (let i = 0; i < 2; i++) {
      time.advance(2000);
      engine().error("network");
      engine().end();
      time.advance(0);
    }
    expect(recognizer.getSnapshot().error).toBeNull();
    expect(FakeRecognition.instances).toHaveLength(3);
    engine().error("network");
    engine().end();
    expect(recognizer.getSnapshot().error?.kind).toBe("network");
    expect(recognizer.getSnapshot().status).toBe("idle");
  });

  it("gives up with 'unstable' when the engine keeps dying instantly", () => {
    const { recognizer, engine, time } = setup();
    recognizer.start();
    for (let i = 0; i < 10 && recognizer.getSnapshot().status !== "idle"; i++) {
      engine().end();
      time.advance(1000);
    }
    expect(recognizer.getSnapshot().error?.kind).toBe("unstable");
    expect(FakeRecognition.instances.length).toBeLessThanOrEqual(7);
  });

  it("abort() discards the transcript; reset() clears it for a fresh take", () => {
    const { recognizer, engine } = setup();
    recognizer.start();
    engine().say(["first take", true]);
    recognizer.abort();
    expect(engine().aborted).toBe(true);
    expect(recognizer.getSnapshot()).toMatchObject({ status: "idle", finalText: "" });

    recognizer.start();
    engine().say(["second take", true]);
    engine().end();
    recognizer.reset();
    expect(recognizer.text).toBe("");
  });

  it("does not create a second engine when start() is called twice", () => {
    const { recognizer } = setup();
    recognizer.start();
    recognizer.start();
    expect(FakeRecognition.instances).toHaveLength(1);
  });
});
