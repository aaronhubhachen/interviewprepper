# Synapse: notes for coding sessions

A spaced-repetition SWE interview engine: an iMessage agent (Photon spectrum-ts) and a Next.js web app share one
SM-2 schedule in SQLite. See README.md for the product, demo script and env reference.

## Layout (npm workspaces)

- `packages/core` (`@synapse/core`): TypeScript **source** consumed directly (no build step, extensionless imports,
  `moduleResolution: bundler`). SM-2 (`sm2.ts`), tapbacks, content registry (`content/`), grading
  (`grading.ts` heuristic, `evaluate.ts` LLM), `llm.ts`, `spar.ts` + `transcript.ts`, judge (`judge/`), SQLite store (`store/`).
- `apps/agent` (`@synapse/agent`): `index.ts` (Spectrum connect, loop, tick, shutdown) → `dispatch.ts`
  (`dispatchSpectrumMessage`: skips outbound/agent messages and group chats, unwraps reply/effect/group text, routes
  text vs reaction, sends non-text content to `handleUnsupported`) → `controller.ts` (`StudyController`: probes,
  grading, tapbacks, commands, scheduler). `state.ts` persists conversation state (snoozes, last card, tapback memo,
  per-chat line, throttles) in an `agent_state` table in the shared SQLite file; `timing.ts` counts active-hours time
  for probe expiry; `redact.ts` masks phone numbers/emails in every log line. A changed tapback re-grades through
  core's `store.regradeReview`. `messages.ts` holds all copy, `simulate.ts` a scripted demo.
- `apps/web` (`@synapse/web`): Next.js 16 App Router. Route handlers in `app/api/**` are thin wrappers over
  `lib/server/*` (which take `(store, userId, now)` and are unit-tested). `proxy.ts` (no matcher) refuses any
  non-loopback `Host` except SYNAPSE_WEB_URL's on every path (`lib/server/proxy-guard.ts`). Client fetchers are in
  `lib/api.ts`, JSON contracts in `lib/types.ts`, and the browser judge is `public/judge-worker.js` + `lib/judge/`
  (served with `JUDGE_WORKER_CSP` via `withJudgeWorkerCsp` in `next.config.ts`). Read `apps/web/AGENTS.md` first.

## Commands

`npm run dev` (web + agent) · `npm run dev:web` · `npm run dev:agent` · `npm run agent:terminal` ·
`npm run agent:simulate` (`npm run simulate:offline -w @synapse/agent` for no LLM) · `npm test` · `npm run typecheck` ·
`npm run build`. Single workspace: `npm test -w @synapse/core`, or `npx vitest run test/x.test.ts` inside it.
`npx vitest run` at the root runs all three projects (root `vitest.config.ts`).
`next dev` / `next start` bind to 127.0.0.1 (`apps/web` scripts); `npm run dev:lan -w @synapse/web` (or `start:lan`)
binds 0.0.0.0 and needs SYNAPSE_WEB_URL set to the LAN URL. There is no auth, so never make 0.0.0.0 the default.

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
- Run Next from `apps/web` (every npm script does). Next's TS config loader resolves `next.config.ts`'s relative
  import of `lib/judge/csp` from the process cwd, so `next build apps/web` from the repo root fails at config load.
- `package.json` `overrides` pins `@opentelemetry/core` to the patched 2.x line for spectrum-ts's telemetry
  (GHSA-8988-4f7v-96qf). `npm ls` may flag those edges "invalid" in this workspace; `npm ci` and the agent are fine.
- Link codes are 6 digits and expire after 10 minutes (`LINK_CODE_TTL_MS`, wall clock). `createOrGetLinkCode(userId, now)`
  needs the injected clock like everything else.
- The web user id is `SYNAPSE_WEB_USER_ID` (default `me`). `store.stats()` creates the user row and a link code as a side effect.
