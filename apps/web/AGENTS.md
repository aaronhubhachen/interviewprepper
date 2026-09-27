<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Prepr web conventions

- The block above is managed by `next dev` (Next 16.3 `agentRules`); leave it as generated. npm workspaces hoist
  `next`, so its docs are at the repo root: `../../node_modules/next/dist/docs/` from this folder. This app is on
  Next.js 16.3 (App Router, Turbopack by default, React 19.2).
- `params` / `searchParams` are Promises in pages, layouts, and route handlers: `const { id } = await params`.
- `middleware` is now `proxy`. `next lint` is gone. Turbopack config is top-level `turbopack`.
- Client components import domain code only from the answer-key-free subpaths
  `@synapse/core/{tags,grading,judge,sm2,tapback,text,time,transcript}`. Never import
  `@synapse/core/content` or `@synapse/core/browser` at runtime in client code: they bundle the whole
  content registry (answer keys, reference solutions). Server components may use them and pass stripped
  data as props (see `toClientProblem`, `tagsWithContent()` in `app/review/page.tsx`).
  `@synapse/core` (SQLite, dotenv, OpenAI) is server-only: use it from `lib/server/**` and `app/api/**`.
  `test/client-bundle.test.ts` walks every `"use client"` import graph and enforces both rules.
- Talk to the server through the typed fetchers in `lib/api.ts`; response types live in `lib/types.ts`.
- There is no login. `dev`/`start` bind to 127.0.0.1, and `proxy.ts` (no matcher, on purpose) refuses any `Host`
  that is not loopback or SYNAPSE_WEB_URL's on every path, pages included (DNS rebinding). Don't add a matcher that
  skips pages, and keep `route()`'s Host/CSRF/JSON checks on every mutating route handler.
- The judge worker (`public/judge-worker.js`) runs pasted code on our origin. `next.config.ts` serves it with
  `JUDGE_WORKER_CSP` from `lib/judge/csp.ts`, whose connect-src deliberately has no `'self'`, so the code cannot
  reach `/api`. Never widen that policy. If Pyodide moves off `cdn.jsdelivr.net/pyodide/`, update `PYODIDE_CDN_SOURCE`.
- Shared UI lives in `components/ui/` (Button, Card, Pill, TagPill, StatTile, TapbackButtons,
  ChatBubble, Banner, Toast, Spinner, EmptyState, ProgressBar, Kbd, PageHeader, Skeleton).
- Design tokens are Tailwind v4 `@theme` variables in `app/globals.css` (`bg-ink-900`, `text-fg-muted`,
  `text-synapse`, `text-axon`, `border-line`, `shadow-glow`, `font-display`, …).
- Root layout already mounts `ToastProvider` (`useToast()`) and `DueCountProvider` (`useDueCount()` from
  `components/shell/DueCountProvider`). `gradeCard` / `recordAttempt` in `lib/api.ts` fire `DUE_CHANGED_EVENT`
  so the nav's Review badge refreshes by itself.
- Route handlers: `export const GET = route(async (request) => json(...))` from `lib/server/http.ts`;
  validate bodies with `fields(await readJson(request))` from `lib/server/validate.ts`; never return stack traces.
- Tests: `npm test -w @synapse/web` (Vitest, node env, `SYNAPSE_DISABLE_LLM=1`). Route tests inject an in-memory
  store and clock via `setStoreForTests` / `setClockForTests` / `setUserForTests` (`lib/server/store.ts`).
