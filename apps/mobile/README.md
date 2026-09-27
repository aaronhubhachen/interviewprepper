# Prepr mobile (Expo)

The phone app for Prepr. It has no data of its own: every screen talks to the Prepr web server on your computer
(`apps/web`), so progress is shared with the web app and the iMessage agent.

**Tabs:** Home (due cards, streak, interview-round trends, weekly report card, iMessage pause), Review (flashcards with
tapback-style ratings and "Study new cards"), Practice (stages 1–2 of every problem, Blind 75 / NeetCode 150 progress;
the coding stage opens the web IDE), Behavioral (STAR answers with an Engineering Manager follow-up), and Grill
(defend your resume). Prepr Bot chat is available inside each problem.

## Run it

1. Start the web server on your LAN from the repo root: set `SYNAPSE_WEB_URL=http://<your-lan-ip>:3000` in `.env`, then
   `npm run dev:lan -w @synapse/web`.
2. `npm start -w @synapse/mobile` and scan the QR code with Expo Go (or `npm run ios -w @synapse/mobile` for the simulator).
3. The ⚙︎ screen on Home shows and tests the server address.

## Checks

`npx tsc --noEmit`, `npx expo lint`, and `npx vitest run` (pure modules in `src/lib`).
