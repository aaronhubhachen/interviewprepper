"use client";

import { LANGUAGE_LABELS, isNativeLanguage, type CodeLanguage, type NativeLanguage } from "@synapse/core/judge";
import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_RESUME_CHARS } from "@/components/grill/ResumeSetup";
import { Banner, Button, Card, PageHeader, Select, Spinner } from "@/components/ui";
import { errorMessage, fetchJudgeLanguages, fetchMockPacket, fetchProblem } from "@/lib/api";
import { cn } from "@/lib/cn";
import type {
  BehavioralQuestion,
  ClientProblem,
  MockBehavioralRound as BehavioralResult,
  MockCodingRound as CodingResult,
  MockGrillRound as GrillResult,
  MockLoopInput,
  MockPacket,
} from "@/lib/types";
import { BEHAVIORAL_MINUTES, MockBehavioralRound } from "./MockBehavioralRound";
import { CODING_MINUTES, MockCodingRound } from "./MockCodingRound";
import { MOCK_GRILL_QUESTIONS, MockGrillRound } from "./MockGrillRound";
import { MockPacketView } from "./MockPacketView";

const RESUME_KEY = "prepr.grill.resume";
const SETUP_KEY = "prepr.mock.setup";

export interface MockProblemRef {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
}

type Stage = "setup" | "coding" | "behavioral" | "grill" | "packet";
type Difficulty = "easy" | "medium" | "hard";

const STEPS: Array<{ stage: Stage; label: string }> = [
  { stage: "coding", label: "Coding" },
  { stage: "behavioral", label: "Behavioral" },
  { stage: "grill", label: "Resume grill" },
  { stage: "packet", label: "Packet" },
];

function pick<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

function Stepper({ stage, withGrill }: { stage: Stage; withGrill: boolean }) {
  const steps = STEPS.filter((step) => withGrill || step.stage !== "grill");
  const current = steps.findIndex((step) => step.stage === stage);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium" aria-label="Loop progress">
      {steps.map((step, index) => (
        <li key={step.stage} className="flex items-center gap-2">
          <span
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "rounded-full border px-3 py-1",
              index < current && "border-success/40 text-success",
              index === current && "border-synapse/60 bg-synapse/10 text-fg",
              index > current && "border-line text-fg-subtle",
            )}
          >
            {index < current ? "✓ " : ""}
            {step.label}
          </span>
          {index < steps.length - 1 ? <span className="text-fg-subtle">→</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function MockStudio({ problems, questions }: { problems: MockProblemRef[]; questions: BehavioralQuestion[] }) {
  const [stage, setStage] = useState<Stage>("setup");
  const [aiAllowed, setAiAllowed] = useState(false);
  const [language, setLanguage] = useState<CodeLanguage>("python");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [resume, setResume] = useState("");
  const [serverLanguages, setServerLanguages] = useState<NativeLanguage[]>([]);
  const [problem, setProblem] = useState<ClientProblem | null>(null);
  const [question, setQuestion] = useState<BehavioralQuestion | null>(null);
  const [scope, setScope] = useState("");
  /** The live loop's id and results. Rounds that finish after a quit (or for an older loop) are dropped. */
  const loopRef = useRef("");
  const resultsRef = useRef<MockLoopInput>({ coding: null, behavioral: null, grill: null });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MockLoopInput>({ coding: null, behavioral: null, grill: null });
  const [packet, setPacket] = useState<MockPacket | null>(null);

  useEffect(() => {
    try {
      // Restored after hydration: storage is not readable during the server render.
      const saved = window.localStorage.getItem(RESUME_KEY);
      if (saved) setResume(saved);
      const setup = JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? "null") as { aiAllowed?: boolean; language?: CodeLanguage; difficulty?: Difficulty } | null;
      if (setup?.aiAllowed !== undefined) setAiAllowed(setup.aiAllowed);
      if (setup?.language) setLanguage(setup.language);
      if (setup?.difficulty) setDifficulty(setup.difficulty);
    } catch {
      // storage blocked: defaults
    }
    const controller = new AbortController();
    fetchJudgeLanguages({ signal: controller.signal })
      .then((response) => setServerLanguages(response.available))
      .catch(() => setServerLanguages([]));
    return () => controller.abort();
  }, []);

  const withGrill = resume.trim().length >= MIN_RESUME_CHARS;
  const languages: CodeLanguage[] = ["python", "javascript", ...serverLanguages];
  const effectiveLanguage = isNativeLanguage(language) && !serverLanguages.includes(language) ? "python" : language;
  const pool = problems.filter((item) => item.difficulty === difficulty);

  const start = async () => {
    const ref = pick(pool.length ? pool : problems);
    const nextQuestion = pick(questions);
    if (!ref || !nextQuestion) return;
    setStarting(true);
    setError(null);
    try {
      window.localStorage.setItem(RESUME_KEY, resume);
      window.localStorage.setItem(SETUP_KEY, JSON.stringify({ aiAllowed, language: effectiveLanguage, difficulty }));
    } catch {
      // ignore
    }
    try {
      const loaded = await fetchProblem(ref.id);
      setProblem(loaded.problem);
      setQuestion(nextQuestion);
      const id = `mock-${Date.now()}`;
      loopRef.current = id;
      resultsRef.current = { coding: null, behavioral: null, grill: null };
      setScope(id);
      setResults({ coding: null, behavioral: null, grill: null });
      setPacket(null);
      setStage("coding");
      window.scrollTo({ top: 0 });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setStarting(false);
    }
  };

  const finishLoop = useCallback(async (input: MockLoopInput, loop: string) => {
    if (loop !== loopRef.current) return;
    setStage("packet");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const result = await fetchMockPacket(input);
      if (loop === loopRef.current) setPacket(result);
    } catch (failure) {
      if (loop === loopRef.current) setError(errorMessage(failure));
    }
  }, []);

  /** Records a finished round for `loop` and returns the loop's results, or null if that loop is gone. */
  const record = useCallback((loop: string, patch: Partial<MockLoopInput>): MockLoopInput | null => {
    if (loop !== loopRef.current) return null;
    resultsRef.current = { ...resultsRef.current, ...patch };
    setResults(resultsRef.current);
    return resultsRef.current;
  }, []);

  const onCoding = useCallback(
    (loop: string, coding: CodingResult) => {
      if (!record(loop, { coding })) return;
      setStage("behavioral");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [record],
  );

  const onBehavioral = useCallback(
    (loop: string, behavioral: BehavioralResult) => {
      const next = record(loop, { behavioral });
      if (!next) return;
      if (withGrill) {
        setStage("grill");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else void finishLoop(next, loop);
    },
    [finishLoop, record, withGrill],
  );

  const onGrill = useCallback(
    (loop: string, grill: GrillResult) => {
      const next = record(loop, { grill });
      if (next) void finishLoop(next, loop);
    },
    [finishLoop, record],
  );

  const quit = () => {
    loopRef.current = "";
    setStage("setup");
  };

  const totalMinutes = CODING_MINUTES + BEHAVIORAL_MINUTES + (withGrill ? 8 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Mock interview loop"
        title="The full onsite, in one sitting"
        description="Coding, behavioral, and resume rounds, then a hire decision."
        actions={
          stage !== "setup" && stage !== "packet" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Quit this loop? Nothing is saved until the packet.")) quit();
              }}
              className="text-sm font-medium text-fg-subtle hover:text-fg"
            >
              ← Quit
            </button>
          ) : null
        }
      />

      {stage !== "setup" ? (
        <div className="mb-5">
          <Stepper stage={stage} withGrill={withGrill} />
        </div>
      ) : null}

      {stage === "setup" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <h2 className="text-lg font-semibold text-fg">Setup</h2>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-fg">Coding round</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="text-sm text-fg-muted">
                  <span className="mb-1 block">Difficulty</span>
                  <Select
                    label="Difficulty"
                    value={difficulty}
                    onChange={setDifficulty}
                    options={(["easy", "medium", "hard"] as const).map((level) => {
                      const count = problems.filter((item) => item.difficulty === level).length;
                      return { value: level, label: level[0]!.toUpperCase() + level.slice(1), hint: String(count), disabled: count === 0 };
                    })}
                  />
                </div>
                <div className="text-sm text-fg-muted">
                  <span className="mb-1 block">Language</span>
                  <Select label="Language" value={effectiveLanguage} onChange={setLanguage} options={languages.map((lang) => ({ value: lang, label: LANGUAGE_LABELS[lang] }))} />
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="AI policy">
                {[
                  { value: false, title: "Classic round", body: "No AI" },
                  { value: true, title: "AI-assisted round", body: "AI use is scored" },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="radio"
                    aria-checked={aiAllowed === option.value}
                    onClick={() => setAiAllowed(option.value)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      aiAllowed === option.value ? "border-synapse/60 bg-synapse/10" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="block text-sm font-semibold text-fg">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-fg-subtle">{option.body}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-fg">Resume (optional)</legend>
              <label htmlFor="mock-resume" className="sr-only">
                Resume text
              </label>
              <textarea
                id="mock-resume"
                value={resume}
                onChange={(event) => setResume(event.target.value)}
                rows={6}
                maxLength={20_000}
                placeholder="Paste your resume text"
                className="mt-2 w-full resize-y rounded-xl border border-line bg-ink-900/60 px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-synapse/60"
              />
            </fieldset>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={() => void start()} loading={starting} loadingLabel="Picking a problem" disabled={!problems.length || !questions.length}>
                Start the loop
              </Button>
              <span className="text-sm text-fg-subtle">About {totalMinutes} minutes</span>
            </div>
            {error ? (
              <Banner tone="danger" className="mt-4">
                {error}
              </Banner>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-fg">Rounds</h2>
            <ol className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <span className="font-semibold text-fg">Coding</span> · {CODING_MINUTES} min
              </li>
              <li>
                <span className="font-semibold text-fg">Behavioral</span> · {BEHAVIORAL_MINUTES} min
              </li>
              <li className={cn(!withGrill && "opacity-50")}>
                <span className="font-semibold text-fg">Resume grill</span> · {MOCK_GRILL_QUESTIONS} questions{!withGrill ? " (needs a resume)" : ""}
              </li>
              <li>
                <span className="font-semibold text-fg">Packet</span> · hire decision
              </li>
            </ol>
          </Card>
        </div>
      ) : null}

      {stage === "coding" && problem ? <MockCodingRound problem={problem} language={effectiveLanguage} aiAllowed={aiAllowed} scope={scope} onDone={(result) => onCoding(scope, result)} /> : null}
      {stage === "behavioral" && question ? <MockBehavioralRound question={question} onDone={(result) => onBehavioral(scope, result)} /> : null}
      {stage === "grill" ? <MockGrillRound resume={resume} onDone={(result) => onGrill(scope, result)} /> : null}

      {stage === "packet" ? (
        packet ? (
          <MockPacketView packet={packet} input={results} onAgain={() => setStage("setup")} />
        ) : error ? (
          <Banner tone="danger" action={<Button size="sm" onClick={() => void finishLoop(results, loopRef.current)}>Retry</Button>}>
            {error}
          </Banner>
        ) : (
          <Card className="flex items-center gap-3" role="status">
            <Spinner size="md" label="" />
            <div>
              <p className="font-semibold text-fg">The hiring committee is meeting</p>
              <p className="text-sm text-fg-subtle">Usually 10 to 30 seconds</p>
            </div>
          </Card>
        )
      ) : null}
    </>
  );
}
