# Prepr demo script

Two cuts: a **3-minute** version for judges and a **~8-minute** full walkthrough for a recording. Lines in quotes are
what to say; everything else is what to click. Button names match the UI exactly.

---

## Before you record (10 minutes)

**`.env`** (repo root):

```ini
SYNAPSE_DAY_MS=60000                     # 1 SRS day = 1 minute, so the "next morning" drill arrives in a minute
SYNAPSE_TICK_MS=5000                     # the agent checks every 5 s
SYNAPSE_WEB_URL=http://<mac-lan-ip>:3000 # only if the phone app is in the demo
GROQ_API_KEY=...                         # second model provider, in case the first is slow
```

**Fresh data and warm-up:**

1. Stop the dev server, delete `data/synapse.db*`, then start `npm run dev` (or `npm run dev:lan` if you'll show the
   phone app). Open <http://localhost:3000>.
2. Warm up, so nothing loads on camera:
   - Open **Two Sum** once, so the code editor and judge are cached.
   - Open **Design** and **Mock** once each.
3. Keep a resume PDF on the desktop, and have your phone unlocked in Messages next to the laptop.
4. For a demo with history already on screen (trends, past packets), do one grill, one behavioral answer, one design
   round, and one mock loop beforehand. Otherwise start from zero and say "fresh account".

**Layout:** browser on the left two-thirds, and the phone (or an iPhone mirror window) on the right. Dark mode.

**If something breaks:** every AI call falls back to offline scoring, so the flow never dead-ends. If the phone
misbehaves, run `npm run agent:simulate` in a terminal for the iMessage part.

---

## Cut A: the 3-minute demo

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | **Landing page** | "Most prep tools stop at LeetCode. Real loops have coding, system design, behavioral, and a resume deep-dive. Prepr trains every part, and it keeps you practicing between sessions over iMessage." |
| 0:15 | **Dashboard** → iMessage card. Text `link 123456` (the code on screen) to the Prepr number. | "I link my phone with a six-digit code." |
| 0:25 | Phone: `🔗 Linked!`, the ☕ briefing, and the first card. Answer in one sentence. | "It texts me a flashcard right before I'd forget it. I answer in a sentence and it grades me Socratically." |
| 0:40 | Tap ❤️ on the feedback. The reply says `🧠 Locked in… returns in 4d`. | "My tapback is the rating: heart means effortless, so the card comes back in four days. That's spaced repetition." |
| 0:50 | **Practice → Blind 75** chip (or `/practice?plan=blind75`). | "All of the Blind 75 is here, grouped by topic, with my progress." |
| 1:00 | Open **Partition to K Equal Sum Subsets**. Stage 1: click **I'm stuck**, rate 👎 **Guessed**. | "Each problem has three flips: the invariant, an edge-case trap, then code. I'll struggle on purpose." The banner says Bitmask DP is flagged and a drill is coming. |
| 1:15 | Open **Two Sum**, pass stages 1 and 2, then on the code stage use **Show AI**: ask *"Write a complete solution"*, **Apply**, **Accept**, **Run**, then **Review**. | "Interviews now allow AI, so Prepr practices that too. The assistant sometimes plants a subtle bug, like real AI. **Review** scores how I used it: framing, verification, and whether I caught its mistake." |
| 1:50 | Phone buzzes: `☕ Morning Prepr … Weak spot: Bitmask DP`. | "One demo-day later, my phone drills the exact pattern I struggled with." |
| 2:05 | **Design → URL shortener.** Add Client, Load balancer, API server, Database; select Client → **Connect →** → Load balancer. Answer the first question with numbers. | "System design on a whiteboard. The interviewer reads my diagram, and it will call out a missing cache or an unconnected box." |
| 2:35 | **Mock** → **Past packets** (or finish a quick loop). Open one. | "A mock onsite chains coding, behavioral, and a resume grill into a hiring-committee packet: hire or no hire, and what would flip it." |
| 2:50 | **/report**, then text `report` on the phone. | "Every Sunday I get a report card: streak, weak spots, and whether my AI use is improving. That's Prepr." |

---

## Cut B: the full walkthrough (~8 minutes)

### 1. The pitch (0:00–0:20)
**Landing page.** Point at the round chips (Coding, System design, Behavioral, Resume deep-dive, Flashcards over
iMessage), then the Blind 75 / NeetCode 150 bars and the coding roadmap.

> "Prepr is interview prep for every part of the SWE interview, not just LeetCode. It all runs on one spaced-repetition
> schedule, and the parts you're weak at follow you to your phone."

### 2. iMessage + spaced repetition (0:20–1:20)
1. **Dashboard** → iMessage card → text `link <code>` from your phone. The reply is `🔗 Linked!`, then a ☕ briefing
   and a card.
2. Answer in one sentence. Feedback arrives with the legend `❤️ Effortless → 4d · 👍 Hesitant → 1d · 👎 Guessed → 6h`.
3. Tap ❤️ to get `🧠 Locked in… returns in 4d`.
4. Text `hint` on the next card, then `why`. Text `blind 75` to show that it replies with a link to the web app.

> "The rating is just a tapback. No app to open, and it only texts me when a card is due."

5. Back on the web, **Review**: the same card queue, with the card's memory (interval, ease, lapses) in the sidebar.

### 3. The card-flip IDE (1:20–3:00)
1. **Practice**: topic sections and topic chips. Click the **Blind 75** study-plan chip to show the categories with
   solved counts.
2. Open **Partition to K Equal Sum Subsets**. In Stage 1 click **I'm stuck** and rate 👎 **Guessed**. The banner says
   Bitmask DP is flagged and a drill is scheduled.
3. Open **Two Sum**. Type the invariant, **Check answer**, rate. Then the edge-case trap, rate. On to the code stage.
4. Switch the language to **Java** and **Submit** to show it compiles on the server against the hidden tests. Switch
   back to Python.

> "Every problem has three flips: name the invariant, dodge the trap, then code against hidden tests, in six
> languages."

### 4. AI-assisted round (3:00–4:00)
1. **Show AI** (⌘L). Ask *"Write a complete solution"*, press **Apply**, look at the red/green diff, press **Accept**,
   then **Run**.
2. Select a few lines, press **⌘K**, type *"use a hash map instead"*, and accept the diff.
3. Ask *"Are you sure this handles [3,3]?"*, then press **Review**. The score covers framing, prompting, verification,
   catching mistakes, and ownership, and the planted bug is revealed.

> "Companies now run AI-enabled interviews. Prepr grades how you use the AI, not just whether the code passes."

### 5. The drill lands (4:00–4:15)
The phone buzzes: `☕ Morning Prepr … Weak spot: Bitmask DP (you struggled on Partition to K Equal Sum Subsets …)`.

> "That's the loop: struggle in the IDE, and the exact pattern shows up on your phone the next morning."

### 6. Behavioral (4:15–5:00)
**Behavioral → Surprise me → Start answering.** Answer out loud for about 30 seconds (or **Type instead**). The live
STAR checklist and filler highlighting update as you talk. **Get feedback** shows the radar and the Engineering
Manager's follow-up; click **Answer the follow-up**.

### 7. Resume grill (5:00–5:45)
**Grill → upload the PDF → Start the grill.** The first question targets your boldest claim. Give one vague answer to
show it pressing, then **End & get verdict** for the held-up / shaky / cracked report.

> "It stress-tests every line on your resume the way a skeptical interviewer would."

### 8. System design (5:45–6:45)
**Design → URL shortener.**
1. Add Client, Load balancer, API server, Database, and Cache. Select one and press **Connect →**, then click the
   target. Leave the Cache unconnected on purpose.
2. Answer the requirements question with numbers (*"100M links a month, about 4k reads per second"*). The next
   reaction calls out the unconnected cache.
3. **Finish & score**: the six-part scorecard next to your diagram.

### 9. Mock onsite (6:45–7:30)
**Mock → AI-assisted round → Start the loop.** Show the 25-minute timer and the docked AI, then **Finish coding
round**. Type a short STAR story and **Submit answer**. Answer the grill questions, ending with **Final answer**. The
hiring-committee packet shows the decision, per-round scores, and "What would move the decision up".
(Short on time? Open one from **Past packets** instead.)

### 10. Close (7:30–8:00)
1. **Dashboard → Interview rounds**: score trends per round type. Click **Weekly report →** and **Share / download
   PNG**.
2. On the phone, text `report`.
3. Optional: show the phone app's Practice tab (Blind 75 progress) and Home (rounds card, report card).

> "Coding, system design, behavioral, and resume, all on one schedule, with your weak spots texted to you. That's
> Prepr."

---

## Fallbacks

| Problem | Do this |
| --- | --- |
| The AI is slow or times out | It falls back to offline scoring automatically. Say "offline scoring" and keep going. |
| The phone doesn't get texts | `npm run agent:simulate` plays the iMessage part in the terminal in a few seconds. |
| Expo Go can't reach the server | Run `npm run dev:lan` with `SYNAPSE_WEB_URL` set to the Mac's LAN IP (see the README's LAN access section). |
| The drill doesn't arrive | Check that `SYNAPSE_DAY_MS=60000` is set, and wait one full minute after the struggle. |
| You need a clean slate mid-take | Stop the server, delete `data/synapse.db*`, restart. |
