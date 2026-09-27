# 🧠 Synapse

**Anki for LeetCode, delivered by iMessage.** Synapse texts you bite-size DSA flashcards right before you would
forget them. It grades your one-sentence answer Socratically with an LLM, and your ❤️ / 👍 / 👎 tapback drives SM-2
scheduling. When you want to go deeper, the web app adds a card-flip LeetCode IDE and voice behavioral sparring.
If you struggle in the IDE, your phone drills that exact pattern the next morning.

Built for the HackWashU 2026 Photon track.

```
            📱 iPhone / iMessage                              💻 Browser
   🧠 probe → answer → ✅ feedback → ❤️ 👍 👎          Dashboard · Review · IDE · Spar
                    ▲    │                                     ▲    │
      Photon        │    │ spectrum-ts                   fetch │    │ Web Speech, Monaco,
      spectrum-ts   │    ▼                                     │    ▼ Pyodide judge (worker)
   ┌────────────────┴──────────────────┐        ┌──────────────┴──────────────────────┐
   │ apps/agent  (tsx)                 │        │ apps/web  (Next.js 16, App Router)  │
   │ dispatch → StudyController        │        │ /api/* route handlers               │
   │ scheduler tick · morning briefing │        │ card-flip IDE · voice sparring      │
   └────────────────┬──────────────────┘        └──────────────┬──────────────────────┘
                    │        @synapse/core (TypeScript source)  │
                    │  SM-2 · tapbacks · content · grading ·    │
                    │  judge · transcript metrics · store       │
                    ▼                                           ▼
            ┌───────────────────────────────┐        ┌───────────────────────────┐
            │ data/synapse.db (SQLite, WAL) │        │ Meta Muse (OpenAI API)    │
            │ shared by both processes      │        │ optional, with heuristic  │
            └───────────────────────────────┘        │ fallback when missing     │
                                                     └───────────────────────────┘
   SYNC: an IDE struggle flags weak tags (e.g. dp_state_compression) and schedules
   micro-card drills for the next local morning. The agent texts them with a ☕ briefing.
```

## Setup

Requirements: Node 22+ and npm 10+. Windows, macOS and Linux all work. `better-sqlite3` ships prebuilt binaries.

```bash
npm install
cp .env.example .env        # then fill in what you have (every value is optional)
```

- **Photon (iMessage):** set `PHOTON_PROJECT_ID` and `PHOTON_PROJECT_SECRET` from <https://app.photon.codes>.
  These are needed only for the live iMessage agent. The web app, `agent:simulate` and `agent:terminal` run without them.
  ⚠️ **One Photon project feeds one running agent.** Two agents on the same project (for example thirdwheel and
  Synapse) compete for the same message stream. Stop the other agent, or use a separate project.
- **LLM (optional):** `META_MODEL_API_KEY` (Meta Muse) is preferred, then `GROQ_API_KEY`, then `OPENAI_API_KEY`.
  With no key, or on any timeout or error, grading and sparring feedback fall back to deterministic heuristics.
  The product still works end to end.
- **Link your phone:** open the dashboard, text `link 482193` (your 6-digit code) to the Synapse number, and this chat
  now syncs with the web app. Codes expire after 10 minutes (the dashboard always shows the current one), and a chat
  gets 5 wrong tries per hour. Only `SYNAPSE_OWNER_HANDLE` can skip the code: texting `start` from that number (in a
  DM) links it. If the wrong chat linked, press **Wrong chat? Unlink** on the dashboard's iMessage card; **New code**
  replaces a code that may have leaked.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Web app (<http://localhost:3000>, bound to 127.0.0.1) and iMessage agent together |
| `npm run dev:web` | Web app only (Next dev server, bound to 127.0.0.1) |
| `npm run dev:lan -w @synapse/web` | Web app on every interface (0.0.0.0) for a phone on the same Wi-Fi; see [LAN access](#lan-access) first. `start:lan` does the same for a production build |
| `npm run dev:agent` | iMessage agent only (needs Photon credentials) |
| `npm run agent:terminal` | The agent in a local tuichat window instead of iMessage (downloads tuichat on first run) |
| `npm run agent:simulate` | Scripted, deterministic iMessage demo with a virtual clock. Uses the LLM if a key is set. `npm run simulate:offline -w @synapse/agent` forces the heuristic grader |
| `npm test` | Every workspace's Vitest suite (no network: the LLM is hard-disabled under Vitest) |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run build` | Production build of the web app (`npm run start -w @synapse/web` serves it) |

The web app and the agent share `data/synapse.db`. Run both against the same file: the agent texts cards you
reviewed on the web, and the dashboard shows what you graded by tapback. The agent also keeps its conversation state
there (snoozes, the last card for `why` and ❓/‼️, the tapback memo that lets a changed rating re-grade, each chat's
iMessage line), in an `agent_state` table, so a restart picks up where it left off.

### LAN access

There is no login: the dashboard, the link code and your spar transcripts are open to anyone who can reach the server.
So `dev` and `start` bind to 127.0.0.1, and every page and API route answers only a loopback `Host` (or the host of
`SYNAPSE_WEB_URL`), which also blocks DNS rebinding. To open the dashboard from a phone or another machine, opt in
explicitly: set `SYNAPSE_WEB_URL` in `.env` to the LAN URL (for example `http://192.168.1.20:3000`) and run
`npm run dev:lan -w @synapse/web` (or `npx next dev -H 0.0.0.0` from `apps/web`). ⚠️ This exposes the unauthenticated
API, the link code and your transcripts to everyone on that network, so only do it on a network you trust.

## 3-minute demo script (judges)

**Before you start:** put the demo time scale in `.env` so that one SRS day equals one minute:

```ini
SYNAPSE_DAY_MS=60000    # 1 SRS day = 1 min; active hours are ignored below 1 h
SYNAPSE_TICK_MS=5000    # scheduler checks every 5 s
```

Then run `npm run dev`, and open <http://localhost:3000> next to your phone. For a fresh demo, delete `data/synapse.db`
before starting.

1. **Link (0:00).** The dashboard's iMessage card shows `link 482193`. Text it to the Synapse number. You get
   `🔗 Linked!`, a `☕ Morning Synapse` briefing, and the first card. The dashboard flips to "Linked" by itself.
2. **Tapback loop (0:30).** Answer in one sentence. A typing bubble appears while Muse grades it, then Socratic
   feedback arrives with the legend `Tap this message: ❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 6h`.
   Tap ❤️ to get `🧠 Locked in… returns in 4d (ease 2.6)`. Text `more`, tap ❓ for a hint, then reply `idk`. The
   answer is revealed, the card is logged as a blank, and about 15 s later it comes back with `🔁 Back for round two`.
   (At demo scale 👎 shows `6h`, because the 15 s relearn floor is 6 SRS hours. Labels are always in SRS units.)
3. **IDE struggle (1:15).** Go to **Practice → Partition to K Equal Sum Subsets**. In Stage 1 click
   *I'm stuck* and rate 👎. A toast and banner say Bitmask DP is flagged as a weak spot and Synapse will text you
   a drill in 1 min. Flip to Stage 3: write code in Monaco, then Run and Submit against hidden tests in the
   browser. The JS judge runs in a Web Worker and Python runs in Pyodide.
4. **Next-morning drill (2:00).** One SRS day (1 minute) later the phone buzzes:
   `☕ Morning Synapse — … Weak spot: Bitmask DP (you struggled on Partition to K Equal Sum Subsets last night)`,
   followed by a `🎯 Drill: Bitmask DP` card. The dashboard's weak spots and forecast update live.
5. **Voice sparring (2:20).** Go to **Spar**, pick a question, press record (Chrome or Edge), and answer out loud.
   Filler words highlight live, the STAR checklist lights up with quoted evidence, and a pace ring tracks you
   against 2:00. Press stop to get Engineering-Manager feedback, a six-axis radar and a follow-up question for round 2.

No phone handy? `npm run agent:simulate` plays the same story in the terminal in a few seconds.

## How SM-2 + tapbacks work

Each card has `{ repetition, intervalDays, easeFactor (2.5), dueAt, lapses, phase }`. Tapbacks (or their text
fallbacks) map to SM-2 grades:

| Tapback | Text fallback | Grade | New card | 2nd review | Later reviews | Ease change |
| --- | --- | --- | --- | --- | --- | --- |
| ❤️ Effortless | `easy`, `effortless`, `3` | 5 | 4 days | round(6 × 1.3) = 8 days | round(interval × EF × 1.3) | +0.10 |
| 👍 Hesitant | `good`, `ok`, `hard`, `2` | 3 | 1 day | 6 days | round(interval × EF) | −0.14 |
| 👎 Guessed / blank | `again`, `guessed`, `blank`, `1` | 1 | relearn in 10 min | relearn in 10 min, lapse +1 | relearn in 10 min, lapse +1 | −0.54 |
| ❓ Question | `hint` | none | Sends the hint (or the explanation after feedback) | | | |
| ‼️ Emphasize | | none | Flags the card's tags as weak spots | | | |
| 😂 Laugh | | none | Ignored | | | |

- EF′ = max(1.3, EF + 0.1 − (5 − g)(0.08 + 0.02(5 − g))). The math is pure and deterministic: `gradeReview(state, grade, now)`.
- Relearn delay = max(round(dayMs / 144), 15 s), capped at a quarter SRS day; 10 minutes at real scale.
- Reviewing a learned card early (a morning drill, extra practice on a weak tag, re-solving a problem) never shortens
  its interval and never inflates it: a pass keeps `max(interval, min(on-time step, elapsed × EF))`, restarted from
  now, with repetition and ease unchanged. Failing it early still lapses it.
- Replying `idk` before answering reveals the answer and grades the card 1.
- Changed your mind? A different rating tapback on the same feedback within 10 minutes replaces the first rating
  (`✏️ Updated…`), as if the first one never happened.
- A tapback counts when it targets the open card's question or feedback message (or carries no target). Tapbacks on
  older messages are ignored. Emoji and names (`love`, `like`, `dislike`, and `Loved "…"` relayed by non-Apple
  phones) are normalized.
- Scheduling: due cards come first, ranked by how overdue they are and boosted when their tags are weak. New cards
  follow, up to `SYNAPSE_NEW_PER_DAY`, preferring weak tags. The agent keeps at most one open probe per user, texts
  only during active hours, and stops at the daily push cap. An open card times out after a quarter SRS day (6 h, at
  least 3 min), and only active hours count toward that, so an evening card can still be answered at breakfast.
  An unanswered card expires without a grade; an answered but unrated card keeps Synapse's suggested grade.

## Environment variables

All variables live in `.env` at the repo root, which is gitignored. Both apps load it through `@synapse/core`'s
`loadEnv()`. Variables already set in the shell win. See `.env.example` for comments.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PHOTON_PROJECT_ID`, `PHOTON_PROJECT_SECRET` | none | Photon credentials for the live iMessage agent |
| `META_MODEL_API_KEY` / `META_API_BASE_URL` | none / `https://api.meta.ai/v1` | Meta Muse (preferred LLM) |
| `GROQ_API_KEY`, `OPENAI_API_KEY` | none | Fallback providers (`llama-3.3-70b-versatile`, `gpt-4o`) |
| `MODEL_NAME`, `MODEL_FALLBACK` | provider default | Override the model or add a comma-separated fallback chain |
| `SYNAPSE_LLM_TIMEOUT_MS` | `12000` | Budget per grading call (sparring feedback allows 25 s) |
| `SYNAPSE_DISABLE_LLM` | `0` | `1` forces the heuristic evaluators |
| `SYNAPSE_DB_PATH` | `data/synapse.db` | SQLite file shared by web and agent (relative to the repo root) |
| `SYNAPSE_WEB_USER_ID` | `me` | The single web user |
| `SYNAPSE_WEB_URL` | `http://localhost:3000` | Link used in texts, and the one non-loopback host the web app answers ([LAN access](#lan-access)) |
| `SYNAPSE_OWNER_HANDLE` | none | Phone or email the agent DMs and links at startup; the only handle that can link by texting `start` |
| `SYNAPSE_AGENT_HANDLE` | none | The Synapse iMessage number: shown on the dashboard with an sms: button, and (as E.164) the line the agent opens the owner DM on |
| `SYNAPSE_VERBOSE` | `0` | `1` also logs message text (answers). Off by default; phone numbers and emails are masked either way |
| `SYNAPSE_AGENT_PROVIDER` | `imessage` | `terminal` behaves like `npm run agent:terminal` |
| `SYNAPSE_DAY_MS` | `86400000` | Real ms per SRS day (`60000` = demo scale) |
| `SYNAPSE_TIMEZONE` | `America/Chicago` | Active hours, mornings, streaks, daily caps |
| `SYNAPSE_ACTIVE_HOURS` | `8-22` | Local hours the agent may text (ignored at demo scale) |
| `SYNAPSE_MORNING_HOUR` | `9` | ☕ briefing hour, and when IDE-struggle drills arrive |
| `SYNAPSE_MAX_DAILY_PUSHES` | `12` | Proactive texts per user per day |
| `SYNAPSE_NEW_PER_DAY` | `8` | New cards introduced per day |
| `SYNAPSE_TICK_MS` | `30000` | How often the scheduler wakes up |

## Troubleshooting

- **Voice sparring says speech isn't supported.** The Web Speech API needs Chrome or Edge. Firefox and blocked
  microphones get a typed-answer mode with the same live metrics. Synapse never uploads audio. Chrome's recognizer
  does send audio to Google to transcribe it.
- **The editor is a plain textarea, or Python says "runtime unavailable".** Monaco and Pyodide load from
  `cdn.jsdelivr.net`. Offline, the editor falls back after 15 s and JavaScript still judges, but Python needs the CDN.
- **`Missing Photon credentials`.** Fill `PHOTON_PROJECT_ID` / `PHOTON_PROJECT_SECRET` in `.env`. Or use
  `npm run agent:terminal` or `npm run agent:simulate`.
- **The agent receives nothing, or replies twice.** Another agent (for example thirdwheel) is consuming the same Photon
  project. Run only one.
- **No texts arrive.** Outside `SYNAPSE_ACTIVE_HOURS`, after the daily cap, or while paused (`resume`), the agent stays
  quiet. `more` always works. A new texter must send `start` or `more` first.
- **Grading feels slow.** Muse is a reasoning model and takes 3–9 s per grade and 10–15 s for sparring feedback.
  Anything over the budget falls back to the heuristic grader automatically. Set `SYNAPSE_DISABLE_LLM=1` for instant
  offline grading.
- **`That code didn't match`.** Codes expire after 10 minutes, so text the one the dashboard shows now. Five wrong
  codes in an hour lock that chat out of linking for the rest of the hour (`🔒 Too many wrong codes`).
- **The dashboard won't open from my phone.** The web app only listens on 127.0.0.1 unless you opt in; see
  [LAN access](#lan-access).
- **Start over.** Stop both processes and delete `data/synapse.db*`.
- **Windows.** npm scripts run under cmd.exe, so put settings in `.env` rather than in inline `FOO=1 npm run …`.

## Repo layout

```
packages/core   @synapse/core: SM-2, tapbacks, content registry (77 micro-cards, 13 IDE problems, 16 behavioral
                questions), SQLite store, LLM + heuristic grading, judge, transcript metrics. TS source, no build.
apps/agent      @synapse/agent: Photon iMessage agent (dispatch.ts → controller.ts), scheduler, simulator
apps/web        @synapse/web: Next.js 16 app (dashboard, review, card-flip IDE, voice sparring) + API routes
data/           SQLite database (gitignored)
```
