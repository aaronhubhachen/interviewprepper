# @synapse/core

Domain core shared by the web app and the iMessage agent: SM-2 scheduling, tapback parsing,
content registry, SQLite store, LLM grading with heuristic fallbacks, transcript analysis, and
the code judge. TypeScript source is consumed directly (no build step); imports are extensionless.

## Entry points

| Import | Contents | Where |
| --- | --- | --- |
| `@synapse/core` | Everything below, plus `env`, `llm`, `evaluate`, `spar`, `store` | Server only (loads better-sqlite3, dotenv, openai) |
| `@synapse/core/browser` | `content`, `grading`, `judge`, `sm2`, `tapback`, `text`, `time`, `transcript` | Node-free, but includes the content registry (answer keys, reference solutions): server components, scripts, and `import type` only |
| `@synapse/core/content` | Content registry (`getCard`, `getProblem`, …) plus tag helpers | Same as `/browser`: keep it out of client bundles |
| `@synapse/core/{tags,grading,judge,sm2,tapback,text,time,transcript}` | One module each; `tags` = `TAGS`, `TAG_IDS`, `isTag`, `tagLabel` and the content types | Anywhere, including client components |

`test/browser-safety.test.ts` fails if a browser entry point ever reaches Node-only code, or if an
answer-key-free subpath reaches the content registry. The web app's `test/client-bundle.test.ts`
checks that client components only import the answer-key-free subpaths.
Next.js needs `transpilePackages: ["@synapse/core"]` and `serverExternalPackages: ["better-sqlite3"]`.

## Configuration (`env.ts`)

- `loadEnv()` finds the repo root (nearest ancestor `package.json` with `workspaces`) and loads its
  `.env` without overriding existing variables. Idempotent; works from `apps/web` and `apps/agent`.
- `getConfig(): SynapseConfig` (cached) / `parseConfig(env, repoRoot)` (pure). Fields: `repoRoot`,
  `dbPath` (default `<root>/data/synapse.db`), `webUserId` ("me"), `webUrl`, `timezone`, `dayMs`,
  `scheduler` ({dayMs, relearnMs}), `demoScale` (dayMs < 1 h), `activeHours` ({startHour, endHour}),
  `morningHour`, `maxDailyPushes`, `newPerDay`, `tickMs`, `probeTtlMs` (dayMs / 4), `ownerHandle?`,
  `llmTimeoutMs`, `llmDisabled`, `photon` ({projectId?, projectSecret?}). See `/.env.example`.

## SM-2 (`sm2.ts`, pure)

- `newReviewState(now)`, `gradeReview(state, grade 0-5, now, opts?) → ReviewState`.
  First pass: 1 d (grade 5: 4 d); second: 6 d (grade 5: 8 d); then `round(interval × EF)` (grade 5: ×1.3).
  A pass before the interval has elapsed (a drill, a re-solve, extra tag practice; measured from `lastReviewedAt`, since
  drills pull `dueAt` forward) never shortens the interval: `max(interval, min(on-time step, round(elapsed × EF ×
  (1.3 if grade 5))))`, restarted from now, with repetition, ease and lapses unchanged, so repeated early ❤️s can't
  inflate the schedule. Fail: `relearning` (or `learning` if never learned), due in `relearnMs`, lapse counted for review cards.
- `schedulerOptions(dayMs?)`, `relearnMs(dayMs)` (10 min real, ≥ 15 s, ≤ dayMs / 4), `isDemoScale(dayMs)`, `isDue`.
- `previewIntervals(state, now, opts) → { love, like, dislike }` each `{ grade, next, delayMs, label }`.
- `formatInterval(days)` → "10m" | "6h" | "4d" | "1.5mo" | "1.1y" (SRS units at any scale; rounds before picking
  the unit, so 23h50m is "1d"), `formatDuration(ms, dayMs)`.
- `RATING_GRADES` = { love: 5, like: 3, dislike: 1 }.

## Tapbacks (`tapback.ts`)

- `normalizeTapback(emojiOrName)` → `"love" | "like" | "dislike" | "emphasize" | "question" | "laugh" | undefined`
  (handles U+FE0F, skin tones, names like "Loved"/"thumbs_up").
- `tapbackToGrade(kind)` (❤️ 5, 👍 3, 👎 1; ❓ ‼️ 😂 → undefined), `isRating(kind)`.
- `parseTextGrade(text)` → 1 | 3 | 5 | undefined for whole-message replies ("easy", "3", "ok", "👎"…).
- `parseLegacyTapbackText('Loved “…”')` for tapbacks relayed as text.
- `TAPBACK_LEGEND`, `TAPBACK_EMOJI`, `legendLines(preview)` → `["❤️ Effortless → 4d", …]`, `compactLegend(preview)` → `"❤️ 4d · 👍 1d · 👎 10m"`.

## Time (`time.ts`, Intl only)

`localParts`, `localHour`, `localDayKey` ("YYYY-MM-DD"), `shiftDayKey`, `zonedTimeToEpoch`, `startOfLocalDay`,
`dayKeyStart` (wall times in a DST gap resolve forward, so a day never starts on the previous one), `nextLocalTime(now, tz, hour, minute?)`, `parseActiveHours("8-22")`, `isWithinActiveHours`,
`computeStreak(dayKeys, todayKey)`, `formatLocalClock` ("9:00 AM"), `describeLocalTime(now, target, tz)`
("tomorrow at 9:00 AM"), `humanizeDuration(ms)`, `isValidTimeZone`.

## Content (`content/`)

Types: `Tag` + `TAGS` (id + label), `MicroCard`, `Problem` (stages `invariant`, `edgeCase`, `code`),
`StagePrompt`, `CodeStage`, `CodeTest`, `CompareMode`, `BehavioralQuestion`, `ReviewCard`, `CardKind`.

Registry: `allCards()` (micro-cards, then problems as `kind: "problem"` cards reviewed via their
invariant prompt), `getCard(id)`, `cardsByTag(tag)`, `listMicroCards()`, `getMicroCard(id)`,
`listProblems()`, `getProblem(idOrSlug)`, `listBehavioral()`, `getBehavioral(id)`,
`drillCardsForProblem(problem)`, `tagsWithContent()`, `tagLabel(tag)`, `isTag(s)`.

Data lives in four files whose arrays may be replaced wholesale: `microcards-a.ts` (`MICROCARDS_A`),
`microcards-b.ts` (`MICROCARDS_B`), `problems.ts` (`PROBLEMS`), `behavioral.ts` (`BEHAVIORAL`).
`test/content.test.ts` enforces the contract for all of them:

- ids unique, kebab-case, prefixed `mc-` / `p-` / `bq-`; all tags valid; difficulty 1-3.
- Every reviewable prompt (micro prompts and problem invariant prompts) ≤ 280 chars; stage prompts ≤ 280.
- Plain text only in texted fields (no `**`, `__`, backticks, `$`).
- 2-5 key points, each with lowercase `anyOf` phrases; **the answer key must grade as "correct"
  against its own key points** with the heuristic grader (≥ 75% of key points).
- `relatedCardIds` reference micro-cards; ≥ 5 JSON-only tests whose arity matches `params`.
- JS and Python references pass every test; starters load but do not pass.

## Store (`store/`)

`openStore(path?, policy?) → SynapseStore` (defaults from `getConfig()`; pass a full
`{ timezone, dayMs, morningHour, newPerDay }` plus a path to skip env loading; optional `ownerHandle` and
`activeHours` then apply only when passed). `getSharedStore()`
caches one instance on `globalThis` (survives Next dev reloads). WAL + `busy_timeout = 5000`, so the
web server and agent share the file. Synchronous; every time-dependent method takes `now` (epoch ms).

- Users: `ensureUser(id, now, defaults?)`, `getUser`, `findUserBySpace`, `findUserByHandle` (normalized),
  `listUsers`, `findUserForIdentity(identity)`, `ensureUserForSpace(identity, now) → { user, created }`,
  `createOrGetLinkCode(userId, now)` (6 digits, `LINK_CODE_LENGTH`; a new code once the current one is
  `LINK_CODE_TTL_MS` = 10 min old, wall clock), `rotateLinkCode(userId, now)` (replace it now), `linkByCode(code,
  identity, now)` (rejects expired codes; merges a placeholder texter's history), `isLinkLocked(identity, now)`,
  `autoLinkSoleUser(identity, now)`, `unlinkUser(userId, now)` (clears the link, drops the open probe, issues a fresh
  code; a no-op while unlinked), `setPaused(userId, paused, now)`. Helpers: `parseLinkCode("link 482193")`,
  `normalizeHandle` (a bare 10-digit number is US; a number written with "+" keeps its country code), `isGroupSpace`.
  Group chats (`spaceType: "group"`, or an iMessage ";+;" GUID) never become a home space, never link, and their
  senders resolve by handle only. After `MAX_LINK_FAILURES_PER_SENDER` (5) wrong or expired codes in
  `LINK_FAILURE_WINDOW_MS` (1 h) a chat or handle is locked out of linking; past `LINK_CODE_ROTATE_AFTER_FAILURES` (20)
  misses across all chats, every further miss rotates the outstanding codes older than `LINK_CODE_ROTATE_MIN_AGE_MS`
  (2 min), so a guess spray can't keep invalidating the code the owner just loaded. `autoLinkSoleUser` links only a DM
  whose handle is the configured `ownerHandle` (or the handle already on the web user); anyone else needs the code.
- Progress: `getProgress`, `listProgress`, `cardState(userId, cardId, now)`, `previewCard(userId, cardId, now)`,
  `gradeCard({ userId, cardId, grade, source, now, answer?, verdict? }) → { card, before, after, wasNew, reviewId, nextLabel }`
  (writes review_log + event, flags weak tags on fail, relieves on ❤️, clears pending for that card, and keeps an
  undo snapshot in `review_undo`). `regradeReview(reviewId, grade, now) → GradeOutcome | null` replaces a card's
  latest review (a changed tapback): restores the pre-review progress and weak spots (leaving any re-flagged since),
  deletes the review and its event, and grades again with the same source, answer and verdict.
- Selection: `nextCard(userId, now, { excludeCardIds?, kinds?, includeNew? }) → { card, state, reason: "drill" | "due" | "new", weakTags } | null`,
  `newCardsIntroduced`, `dueCount`, `forecast(userId, now, days)`, `scheduleCardsAt(userId, cardIds, dueAt, now, reason?)`.
- Pending probe (one per user): `getPending`, `setPending(userId, { cardId, phase, questionMessageId?, feedbackMessageId?, answer?, verdict? }, now)`,
  `updatePending(userId, patch, now)`, `clearPending`, `expireStalePending(now, ttlMs)`.
- Pushes: `recordPush(userId, "probe" | "morning" | "nudge", now, cardId?)`, `pushesToday` (local calendar day; the
  last SRS day at demo scale), `morningSentToday`, `lastPushAt`.
- Weakness: `flagWeakness(userId, tags, source, weight, now)` (decays with a 3-SRS-day half-life), `weakTags(userId, now)`;
  constants `WEAKNESS_WEIGHTS` (ideStruggle 1, emphasize 1, failedReview 0.5), `WEAK_THRESHOLD`.
- IDE → iMessage sync: `recordIdeAttempt({ userId, problemId, stage, passed, now, hintsUsed?, attemptNumber?, gaveUp?, … })
  → { struggled, flaggedTags, drills, drillAt, drillLabel, graded }`. A struggle (failed, gave up, ≥ 2 hints, or ≥ 3 tries;
  overridable with `struggled`) flags `problem.weakTags` and schedules up to 2 related micro-cards at the next local
  `SYNAPSE_MORNING_HOUR` (moved to the next active-window start when that hour is outside `activeHours`; one SRS day
  ahead at demo scale), once per problem per day; its weak tags keep source "ide". Finishing the code stage grades the
  problem card, at most once per day while it is not due. `drillAt`/`drillLabel` give when the first drill will really
  be texted ("shortly" when a drill card is already overdue). `nextDrillTime(now)`, `listIdeAttempts`.
- Sparring: `recordSparSession({ userId, questionId, transcript, durationMs, feedback, now })`, `listSparSessions`.
- Activity & dashboard: `logEvent(userId, kind, title, detail, now)`, `recentEvents`, `stats(userId, now) → Stats`
  (dueNow, reviewedToday, streakDays, activeToday (a review, IDE attempt or spar today), retention30d, cardsLearned,
  totalCards, forecast14, reviewsByDay (30), masteryByTag, weakTags, recentActivity, link, demoScale). `stats` ensures
  the user and, while unlinked, a link code.

## LLM & evaluators

- `resolveLlmProfiles(env)`: META_MODEL_API_KEY → GROQ_API_KEY → OPENAI_API_KEY, MODEL_NAME / MODEL_FALLBACK,
  disabled by `SYNAPSE_DISABLE_LLM`. `isLlmConfigured()`, `llmStatus()` (no key), `extractJson(reply)`
  (skips prose braces and `<think>` blocks, tolerates trailing commas), `completionParams(profile, options)` (OpenAI
  o-series / gpt-5 get `max_completion_tokens` and no temperature).
- `completeJson(system, user, zodSchema, { timeoutMs?, temperature?, maxTokens?, reasoningEffort? }) → T | null`.
  Never throws; total time budget across fallbacks. Muse is a reasoning model: hidden reasoning counts toward
  `maxTokens` (default 2500) and `reasoning_effort` (default "low") is sent only to Muse and OpenAI reasoning models.
- `evaluateAnswer({ question, answerKey, keyPoints, answer }, { useLlm?, timeoutMs? }) → Evaluation`
  `{ verdict, nailed, missed, feedback (≤ 2 plain sentences), suggestedGrade 1|3|5, source }`.
  Non-answers ("idk") skip the model and reveal the key. Browser-safe heuristic: `heuristicEvaluation`,
  `matchKeyPoints`, `isNonAnswer`, `VERDICT_EMOJI`, `VERDICT_GRADE` (`grading.ts`). Each mention in the answer credits
  at most one key point, and a mention right after a negator ("not use a hash map", "never finalized", "rather than",
  "instead of") does not count. Operators are words: "+" is "plus", and "-" is "minus" when spaced, next to a digit or
  bracket, or between single letters ("n + 1" ≠ "n - 1", "nums[i-1]" ≠ "nums[i+1]"); other hyphens still join words
  ("in-degree"), and "row-col" still matches "row - col". A phrase whose parentheses wrap an operator ("(e + v) log v")
  matches only with the same grouping.
- `evaluateBehavioral({ question, transcript, durationMs }, { useLlm?, timeoutMs? = 25 s }) → BehavioralFeedback`
  `{ scores, overall, strengths, improvements, starBreakdown, rewrittenOpening, followUp, analysis, source }`.
  An axis the model leaves null or non-numeric keeps the heuristic score (`mergeSparScores`).
- Transcript (browser-safe): `analyzeTranscript(text, durationMs)`, `heuristicSparScores(analysis)`,
  `overallScore(scores)`, `SPAR_AXES` (radar axes + labels). `fillerRate` is fillers per 100 words. Ownership counts
  first-person subjects ("my team" counts as we); `metrics` are impact numbers only (in or after the Action/Result, or
  next to a change phrase), not headcounts and durations from the setup.
- Text: `toPlainText` (strip markdown/LaTeX for iMessage; `a * b` stays), `clampSentences`, `fenceUntrusted` (angle
  brackets inside become ‹ ›, so no tag variant can close the fence).

## Judge (`judge/`)

The browser worker only executes code; the main thread compares and enforces timeouts.

- JavaScript: `buildJsRunner(code, functionName)` → source; `new Function(source)()` returns
  `run(argsListJson) → resultsJson` (`RawTestResult[]` with per-test `logs`). Constructing it throws on syntax
  errors; report those as `{ kind: "compile", message }`. `buildJsHarness` returns just the callable. Every console
  method works (unknown ones no-op), Map/Set/undefined/NaN/-0/bigint log as themselves, top-level output is prepended
  to the first test's logs, and a return JSON can't carry (Infinity, NaN, a function, a Map or Set) is a per-test error.
- Python: `PYTHON_HARNESS`; after `pyodide.runPython(PYTHON_HARNESS)`, call
  `pyodide.globals.get("synapse_run_tests")(code, functionName, argsListJson)` → JSON of `RawTestResult[]`
  or a `RunFailure` (`{ kind, message }`). Top-level functions and LeetCode `class Solution` both work. Each run starts
  from clean sys.stdout/stderr and recursion limit (capped at `PYTHON_MAX_RECURSION` = 1500: deeper recursion kills
  Pyodide outright); sys.exit() is a per-test error; an inf/nan return is a per-test error naming the value.
  Load Pyodide from `${PYODIDE_INDEX_URL}pyodide.js` (`PYODIDE_VERSION` = the pinned devDependency).
- `testArgsJson(stage)`, `judgeResults(stage, raw | RunFailure) → JudgeReport`
  `{ status: accepted | wrong_answer | runtime_error | compile_error | timeout, passed, total, cases, message? }`.
- `compareOutput(actual, expected, mode)`: exact, unordered (top-level multiset), unordered-nested, float (1e-5).
- `runJsTests(code, stage)`: synchronous, in-process, no timeout (trusted code / tests only).

## Tests

`npm test -w @synapse/core` (Vitest). Deterministic: clocks are injected and `SYNAPSE_DISABLE_LLM=1` is forced,
so no network or keys are used. Python checks load Pyodide from the local npm package and skip with a warning
if it cannot load.
