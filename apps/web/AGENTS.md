<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

This is NOT the Next.js you know. This app runs Next.js 16 (App Router, Turbopack by default,
React 19.2). Before any Next.js work, find and read the relevant doc in
`node_modules/next/dist/docs/` (hoisted to the repo root: `../../node_modules/next/dist/docs/`).
Your training data is outdated; the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

## Synapse web conventions

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
