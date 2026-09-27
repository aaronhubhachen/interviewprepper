# Prepr

**Prep for every part of the SWE interview, not just LeetCode.** Prepr texts you bite-size DSA flashcards over
iMessage right before you would forget them, grades your one-sentence answer Socratically with an LLM, and lets your
❤️ / 👍 / 👎 tapback drive SM-2 scheduling. The web app covers the rest of the loop: a card-flip coding IDE for the
whole Blind 75, behavioral practice, a resume grill, system design on a whiteboard, and a full mock onsite. If you
struggle in the IDE, your phone drills that exact pattern the next morning.

- **Card-flip IDE:** 84 LeetCode problems covering the **entire Blind 75**, each in three flips (name the invariant,
  dodge the edge-case trap, code it against hidden tests) in **Python, JavaScript, TypeScript, Java, C++, or Go**,
  with tested reference solutions in all six. Trees, linked lists, graphs, and design classes run on real nodes.
- **Study plans:** Blind 75 and NeetCode 150 progress by roadmap category (**Practice → Study plan: Blind 75**, and on the landing page).
- **Prepr Bot:** a Cursor-style AI assistant docked inside every problem (**Show AI**, or ⌘L / Ctrl+L) to practice
  **AI-assisted coding interviews**. It can plant a subtle bug in code it writes, and **Review** scores how you used
  it: framing, prompting, verification, catching its mistakes, and ownership.
  Like Cursor, it suggests edits as reviewable diffs (**Apply**, then Accept or Reject), and **⌘K / Ctrl+K** on a
  selection asks for an inline edit of just those lines.
- **Resume grill:** upload your resume (PDF) and defend every line against a skeptical interviewer, then get a
  held-up / shaky / cracked verdict per claim. Over iMessage, text `grill` and paste your resume. Every round is saved,
  and the dashboard's **Interview rounds** card shows your score trends.
- **Behavioral:** answer behavioral questions out loud or typed, with live STAR, filler, and pace metrics, then an
  Engineering Manager's scores and follow-up (**/behavioral**).
- **System design:** draw the architecture on a whiteboard (components, labeled arrows) while an AI interviewer
  reads the diagram and walks requirements → API → high level → deep dive → scale, then scores six dimensions.
- **Mock loop:** one timed sitting that chains a coding round (classic or AI-assisted), a behavioral story, and a
  resume grill, ending in a **hiring-committee packet** with a hire / no-hire decision and what would flip it.
- **Weekly report card:** every Sunday evening (or text `report`) the agent sends your streak, reviews and accuracy
  versus last week, AI-use trend, rounds, and weak spots. **/report** renders it as a shareable PNG.
- **Mobile app** (Expo): review, practice stages, Blind 75 / NeetCode 150 progress, behavioral, grill, interview-round
  trends, and the weekly report card, all against the same data.
- **iMessage extras:** text `grill` to defend your resume, `report` for the weekly card, or `blind 75`, `design`,
  `mock`, `behavioral` to get a link to that part of the web app.

Built for the HackWashU 2026 Photon track.

```
            📱 iPhone / iMessage                              💻 Browser  ·  📱 Expo app (apps/mobile)
   🧠 probe → answer → ✅ feedback → ❤️ 👍 👎    Dashboard · Review · IDE + Prepr Bot · Behavioral · Grill · Design · Mock
                    ▲    │                                     ▲    │
      Photon        │    │ spectrum-ts                   fetch │    │ Web Speech, Monaco,
      spectrum-ts   │    ▼                                     │    ▼ Pyodide judge (worker)
   ┌────────────────┴──────────────────┐        ┌──────────────┴──────────────────────┐
   │ apps/agent  (tsx)                 │        │ apps/web  (Next.js 16, App Router)  │
   │ dispatch → StudyController        │        │ /api/* route handlers               │
   │ scheduler tick · morning briefing │        │ IDE · Bot · behavioral · grill · …  │
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
  Prepr) compete for the same message stream. Stop the other agent, or use a separate project.
- **LLM (optional):** `META_MODEL_API_KEY` (Meta Muse) is preferred, then `GROQ_API_KEY`, then `OPENAI_API_KEY`.
  With no key, or on any timeout or error, grading and sparring feedback fall back to deterministic heuristics.
  The product still works end to end, but Prepr Bot can only give hints without a model. **For a live demo, set
  two providers** (for example Muse plus a free Groq key): each call retries a dropped connection once, then moves
  to the next provider.
- **Compiled languages (optional):** Java, C++, and Go run through the server judge, which uses the machine's own
  toolchains: a JDK 17+ (`javac`/`java`), `clang++` or `g++`, and `go`. TypeScript needs only Node 22. Missing
  toolchains show as "not installed" in the language picker; Python and JavaScript always run in the browser.
- **Link your phone:** open the dashboard, text `link 482193` (your 6-digit code) to the Prepr number, and this chat
  now syncs with the web app. Codes expire after 10 minutes (the dashboard always shows the current one), and a chat
  gets 5 wrong tries per hour. Only `SYNAPSE_OWNER_HANDLE` can skip the code: texting `start` from that number (in a
  DM) links it. If the wrong chat linked, press **Wrong chat? Unlink** on the dashboard's iMessage card; **New code**
  replaces a code that may have leaked.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Web app (<http://localhost:3000>, bound to 127.0.0.1) and iMessage agent together |
| `npm run dev:lan` | Web app on your Wi-Fi (for the phone app / Expo Go) plus the agent. Needs `SYNAPSE_WEB_URL=http://<your-mac-lan-ip>:3000` in `.env`; see [LAN access](#lan-access) |
| `npm run dev:web` | Web app only (Next dev server, bound to 127.0.0.1) |
| `npm run dev:lan -w @synapse/web` | Web app on every interface (0.0.0.0) for a phone on the same Wi-Fi; see [LAN access](#lan-access) first. `start:lan` does the same for a production build |
| `npm run dev:agent` | iMessage agent only (needs Photon credentials) |
| `npm run ios -w @synapse/mobile` | Mobile app in the iOS simulator via Expo Go (`npm start -w @synapse/mobile` prints a QR code for a real phone). Needs [LAN access](#lan-access) |
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

There is no login: the dashboard, the link code and your behavioral transcripts are open to anyone who can reach the server.
So `dev` and `start` bind to 127.0.0.1, and every page and API route answers only a loopback `Host` (or the host of
`SYNAPSE_WEB_URL`), which also blocks DNS rebinding. To open the dashboard from a phone or another machine, opt in
explicitly: set `SYNAPSE_WEB_URL` in `.env` to the LAN URL (for example `http://192.168.1.20:3000`) and run
`npm run dev:lan -w @synapse/web` (or `npx next dev -H 0.0.0.0` from `apps/web`). ⚠️ This exposes the unauthenticated
API, the link code and your transcripts to everyone on that network, so only do it on a network you trust.

The mobile app uses the same opt-in: it finds the Mac through Expo (`http://<lan-ip>:3000`), so set `SYNAPSE_WEB_URL`
to that address and run `dev:lan`. The app's ⚙︎ screen shows and tests the address.

## 3-minute demo script (judges)

**Before you start (5 min):**

- Put the demo time scale in `.env` so that one SRS day equals one minute, and add a second LLM key:

  ```ini
  SYNAPSE_DAY_MS=60000    # 1 SRS day = 1 min; active hours are ignored below 1 h
  SYNAPSE_TICK_MS=5000    # scheduler checks every 5 s
  GROQ_API_KEY=...        # fallback if Muse is slow or drops a connection
  ```

- Delete `data/synapse.db*` for a fresh demo, run `npm run dev`, and open <http://localhost:3000> next to your phone.
- Have a resume PDF on the desktop, and open Two Sum once so Monaco and the judge are warm.

1. **Hook + link (0:00).** Open the landing page: the topic tree is live progress, and every node opens Practice
   filtered to that topic. On the dashboard's iMessage card, text `link 482193` to the Prepr number. You get
   `🔗 Linked!`, a `☕ Morning Prepr` briefing, and the first card.
2. **Tapback loop (0:20).** Answer in one sentence. Socratic feedback arrives with the legend
   `❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 6h`. Tap ❤️ to get `🧠 Locked in… returns in 4d`.
3. **IDE struggle (0:45).** **Practice → Partition to K Equal Sum Subsets.** In Stage 1 click *I'm stuck* and rate 👎.
   A banner says Bitmask DP is flagged and Prepr will text you a drill in 1 min.
4. **AI-assisted round (1:05).** Open **Two Sum**, pass Stages 1 and 2, and land on the code stage with Prepr Bot
   docked beside the editor (⌘L toggles it). Ask *"Write a complete solution"*, click **Apply**, then **Accept** in the diff, then **Run**.
   Ask a pointed follow-up (*"Are you sure this handles [3,3]?"*), then press **Review**: a score for framing,
   prompting, verification, catching AI mistakes, and ownership, with any bug the bot planted revealed.
   Switch the language to **Java** and Submit: it compiles and runs on the server against the same hidden tests.
5. **Next-morning drill (1:50).** One SRS day after step 3 the phone buzzes:
   `☕ Morning Prepr — … Weak spot: Bitmask DP (you struggled on Partition to K Equal Sum Subsets last night)`.
6. **Resume grill (2:05).** **Grill → upload the PDF → Start.** The first question goes straight at your boldest
   claim ("as an intern, what did *you* ship versus the team?"). Give one vague answer to show it pressing, then
   **End & get verdict** for the per-claim held-up / shaky / cracked report.
7. **Close (2:40).** Open **/report** for the shareable weekly card (text `report` to get it on the phone), then
   show the phone app's Review tab on the same queue.

**If you have more time (or for a longer recording):**

- **Blind 75 (30 s).** **Practice → Study plan → Blind 75** (or the Blind 75 card on the landing page): every category, solved / total bars, all 75 problems playable.
  Open **Clone Graph** or **Merge k Sorted Lists** to show node-based problems in any of the six languages.
- **System design (60 s).** **Design → URL shortener.** Drop Client, Load balancer, API server, Database; select one
  and press **Connect →** to draw arrows. Answer the requirements question with numbers; the next question reacts
  to your board ("your cache isn't connected to anything"). **Finish & score** shows the scorecard next to your diagram.
- **Mock loop (60 s to show).** **Mock → AI-assisted round → Start.** Show the 25-minute timer and the docked bot,
  press **Finish coding round**, type a short STAR story, answer the grill questions, and end on the committee packet
  (decision, per-round scores, "what would move the decision up"). Packets land in the dashboard's trends.
- **Behavioral.** **Behavioral**: live STAR checklist, filler highlighting, and an EM follow-up.

No phone handy? `npm run agent:simulate` plays the iMessage part in the terminal in a few seconds.

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
  An unanswered card expires without a grade; an answered but unrated card keeps Prepr's suggested grade.

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
| `SYNAPSE_NATIVE_JUDGE` | on in dev, off in production | `1` / `0` forces the server judge (Java, C++, Go, TypeScript) on or off. It runs submitted code on this machine without a sandbox, so keep it off on any shared deployment |
| `SYNAPSE_DB_PATH` | `data/synapse.db` | SQLite file shared by web and agent (relative to the repo root) |
| `SYNAPSE_WEB_USER_ID` | `me` | The single web user |
| `SYNAPSE_WEB_URL` | `http://localhost:3000` | Link used in texts, and the one non-loopback host the web app answers ([LAN access](#lan-access)) |
| `SYNAPSE_OWNER_HANDLE` | none | Phone or email the agent DMs and links at startup; the only handle that can link by texting `start` |
| `SYNAPSE_AGENT_HANDLE` | none | The Prepr iMessage number: shown on the dashboard with an sms: button, and (as E.164) the line the agent opens the owner DM on |
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

- **Behavioral says speech isn't supported.** The Web Speech API needs Chrome or Edge. Firefox and blocked
  microphones get a typed-answer mode with the same live metrics. Prepr never uploads audio. Chrome's recognizer
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
- **Java / C++ / Go say "not installed".** Install the toolchain (`javac`, `clang++`/`g++`, `go`) and restart the web
  app. In production the server judge is off unless `SYNAPSE_NATIVE_JUDGE=1`.
- **Prepr Bot only gives hints.** No model answered (no key, a timeout, or the per-minute LLM budget). Add a second
  provider key; the status dot in the panel turns amber while it is offline.
- **The mobile app can't reach the server.** It needs [LAN access](#lan-access): `SYNAPSE_WEB_URL` set to the Mac's LAN
  address and `npm run dev:lan -w @synapse/web`, with the phone on the same Wi-Fi.
- **New problems or cards missing after pulling.** Restart the web dev server: it keeps one SQLite store per process,
  created with the content that existed at startup.
- **Start over.** Stop both processes and delete `data/synapse.db*`.
- **Windows.** npm scripts run under cmd.exe, so put settings in `.env` rather than in inline `FOO=1 npm run …`.

## Repo layout

```
packages/core   @synapse/core: SM-2, tapbacks, content registry (110 micro-cards, 84 IDE problems incl. the full
                Blind 75, 16 behavioral questions), study plans, SQLite store, LLM + heuristic grading, judge
                (browser + server-compiled languages, node adapters), resume grill, Prepr Bot, system design,
                mock loop packet, weekly report card, transcript metrics. TS source, no build.
apps/agent      @synapse/agent: Photon iMessage agent (dispatch.ts → controller.ts), scheduler, simulator
apps/web        @synapse/web: Next.js 16 app (landing, dashboard, review, card-flip IDE + Prepr Bot, study plans,
                behavioral, resume grill, system design, mock loop, weekly report) + API routes
apps/mobile     @synapse/mobile: Expo (React Native) app: review, practice stages, study plans, behavioral, grill,
                interview-round trends, weekly report card
data/           SQLite database (gitignored)
```
