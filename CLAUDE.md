# Synapse: notes for coding sessions

A spaced-repetition SWE interview engine: an iMessage agent (Photon spectrum-ts) and a Next.js web app share one
SM-2 schedule in SQLite. See README.md for the product, demo script and env reference.

## Layout (npm workspaces)

- `packages/core` (`@synapse/core`): TypeScript **source** consumed directly (no build step, extensionless imports,
  `moduleResolution: bundler`). SM-2 (`sm2.ts`), tapbacks, content registry (`content/`), grading
  (`grading.ts` heuristic, `evaluate.ts` LLM), `llm.ts`, `spar.ts` + `transcript.ts`, judge (`judge/`), SQLite store (`store/`).
- `apps/agent` (`@synapse/agent`): `index.ts` (Spectrum connect, loop, tick, shutdown) → `dispatch.ts`
  (`dispatchSpectrumMessage`: skips outbound/agent messages, routes text vs reaction) → `controller.ts`
  (`StudyController`: probes, grading, tapbacks, commands, scheduler). `messages.ts` holds all copy, `simulate.ts` a scripted demo.
- `apps/web` (`@synapse/web`): Next.js 16 App Router. Route handlers in `app/api/**` are thin wrappers over
  `lib/server/*` (which take `(store, userId, now)` and are unit-tested). Client fetchers are in `lib/api.ts`,
  JSON contracts in `lib/types.ts`, and the browser judge is `public/judge-worker.js` + `lib/judge/`. Read `apps/web/AGENTS.md` first.

## Commands

`npm run dev` (web + agent) · `npm run dev:web` · `npm run dev:agent` · `npm run agent:terminal` ·
`npm run agent:simulate` (`npm run simulate:offline -w @synapse/agent` for no LLM) · `npm test` · `npm run typecheck` ·
`npm run build`. Single workspace: `npm test -w @synapse/core`, or `npx vitest run test/x.test.ts` inside it.
`npx vitest run` at the root runs all three projects (root `vitest.config.ts`).

## Conventions

- Time is injected: every store method and scheduler function takes `now` (epoch ms). Never call `Date.now()` in
  core logic. Tests use virtual clocks and temp or in-memory SQLite files.
- Tests never touch the network. Each workspace's vitest config sets `SYNAPSE_DISABLE_LLM=1`, and `llm.ts` returns
  no provider whenever `process.env.VITEST` is set. Do not weaken either guard.
- Every LLM call has a timeout and a deterministic heuristic fallback. The app must fully work with zero keys.
  User answers and transcripts are untrusted: they are fenced (`fenceUntrusted`) and the prompt says to ignore instructions inside them.
- iMessage is plain text: no markdown or LaTeX (write `O(n)`), short and emoji-led. Content tests enforce this for texted fields.
- Content ids are stable kebab-case (`mc-…`, `p-…`, `bq-…`). `packages/core/test/content.test.ts` requires each answer
  key to grade "correct" against its own key points, 5+ tests per problem, and passing JS and Python references
  (Python runs under local Pyodide).
- Browser code: client components import only `@synapse/core/{tags,grading,judge,sm2,tapback,text,time,transcript}`.
  `@synapse/core/content` and `/browser` bundle every answer key and reference solution, and `@synapse/core` is
  server-only (better-sqlite3, dotenv, openai). `apps/web/test/client-bundle.test.ts` and `packages/core/test/browser-safety.test.ts` enforce this.
- API responses never include answer keys, key points, explanations or reference solutions before the user answers
  (`lib/server/serialize.ts`). The solution endpoint returns 403 until the code stage is attempted.

## Gotchas

- **Next 16 is not the Next you know.** Read `node_modules/next/dist/docs/` before writing Next code. `params` and
  `searchParams` are Promises, `middleware` is now `proxy`, and Turbopack is the default. `next.config.ts` must keep
  `transpilePackages: ["@synapse/core"]` and `serverExternalPackages: ["better-sqlite3"]`.
- **npm scripts run under cmd.exe on Windows.** Do not use inline env vars (`FOO=1 cmd`), `rm -rf` or single-quote
  tricks. Use CLI flags, `.env`, or small node scripts.
- `.env` at the repo root holds real keys (Photon and Meta). Never print or commit it. `loadEnv()` finds the repo root
  by walking up to the nearest `package.json` that has `workspaces`.
- One Photon project can serve only one running agent (thirdwheel shares this project), so don't run both.
- Demo scale: `SYNAPSE_DAY_MS=60000` makes one SRS day one minute and ignores active hours. Labels stay in SRS units,
  so the 15 s relearn floor shows as `6h`.
- Do not run `next build` while `next dev` is running from the same `apps/web/.next`.
- The web user id is `SYNAPSE_WEB_USER_ID` (default `me`). `store.stats()` creates the user row and a link code as a side effect.
