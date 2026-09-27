"use client";

import { LANGUAGE_LABELS, isNativeLanguage, type CodeLanguage, type NativeLanguage } from "@synapse/core/judge";
import { useCallback, useEffect, useState } from "react";
import { MIN_RESUME_CHARS } from "@/components/grill/ResumeSetup";
import { Banner, Button, Card, PageHeader, Spinner } from "@/components/ui";
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
      setScope(`mock-${Date.now()}`);
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

  const finishLoop = useCallback(async (input: MockLoopInput) => {
    setStage("packet");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      setPacket(await fetchMockPacket(input));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, []);

  const onCoding = useCallback((coding: CodingResult) => {
    setResults((current) => ({ ...current, coding }));
    setStage("behavioral");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const onBehavioral = useCallback(
    (behavioral: BehavioralResult) => {
      const next = { ...results, behavioral };
      setResults(next);
      if (withGrill) {
        setStage("grill");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else void finishLoop(next);
    },
    [finishLoop, results, withGrill],
  );

  const onGrill = useCallback(
    (grill: GrillResult) => {
      const next = { ...results, grill };
      setResults(next);
      void finishLoop(next);
    },
    [finishLoop, results],
  );

  const totalMinutes = CODING_MINUTES + BEHAVIORAL_MINUTES + (withGrill ? 8 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Mock interview loop"
        title="The full onsite, in one sitting"
        description="A timed coding round, a behavioral story, and a resume deep-dive, then a hiring-committee packet with a decision."
        actions={
          stage !== "setup" && stage !== "packet" ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Quit this loop? Nothing is saved until the packet.")) setStage("setup");
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
            <h2 className="text-lg font-semibold text-fg">Set up the loop</h2>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-fg">Coding round</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-fg-muted">
                  Difficulty
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                    className="mt-1 block w-full rounded-lg border border-line bg-ink-900/60 px-3 py-2 text-fg"
                  >
                    {(["easy", "medium", "hard"] as const).map((level) => (
                      <option key={level} value={level} disabled={!problems.some((item) => item.difficulty === level)}>
                        {level[0]!.toUpperCase() + level.slice(1)} ({problems.filter((item) => item.difficulty === level).length})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-fg-muted">
                  Language
                  <select
                    value={effectiveLanguage}
                    onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
                    className="mt-1 block w-full rounded-lg border border-line bg-ink-900/60 px-3 py-2 text-fg"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="AI policy">
                {[
                  { value: false, title: "Classic round", body: "No AI. Judged on correctness and pace." },
                  { value: true, title: "AI-assisted round", body: "Prepr Bot docked beside the editor. Your AI use is reviewed and scored." },
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
              <legend className="text-sm font-semibold text-fg">Resume for the grill round</legend>
              <p className="mt-1 text-xs text-fg-subtle">Shared with the /grill page. Leave it empty to skip the grill.</p>
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
            <h2 className="text-sm font-semibold text-fg">How it runs</h2>
            <ol className="mt-3 space-y-3 text-sm text-fg-muted">
              <li>
                <span className="font-semibold text-fg">1 · Coding</span>, {CODING_MINUTES} min. A random {difficulty} problem you haven&apos;t been told in advance. The last submit
                counts.
              </li>
              <li>
                <span className="font-semibold text-fg">2 · Behavioral</span>, {BEHAVIORAL_MINUTES} min. One STAR story, typed or dictated.
              </li>
              <li className={cn(!withGrill && "opacity-50")}>
                <span className="font-semibold text-fg">3 · Resume grill</span>, {MOCK_GRILL_QUESTIONS} questions on your own claims.
                {!withGrill ? " Skipped: add a resume." : ""}
              </li>
              <li>
                <span className="font-semibold text-fg">Packet</span>: score per round, a hire decision, and what would flip it. Saved to your dashboard trends.
              </li>
            </ol>
          </Card>
        </div>
      ) : null}

      {stage === "coding" && problem ? <MockCodingRound problem={problem} language={effectiveLanguage} aiAllowed={aiAllowed} scope={scope} onDone={onCoding} /> : null}
      {stage === "behavioral" && question ? <MockBehavioralRound question={question} onDone={onBehavioral} /> : null}
      {stage === "grill" ? <MockGrillRound resume={resume} onDone={onGrill} /> : null}

      {stage === "packet" ? (
        packet ? (
          <MockPacketView packet={packet} input={results} onAgain={() => setStage("setup")} />
        ) : error ? (
          <Banner tone="danger" action={<Button size="sm" onClick={() => void finishLoop(results)}>Retry</Button>}>
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
