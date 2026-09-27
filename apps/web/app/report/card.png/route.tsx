import { ImageResponse } from "next/og";
import { route } from "@/lib/server/http";
import { reportCardFor } from "@/lib/server/report";
import { currentUserId, getStore, now } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRADE_COLORS: Record<string, string> = { A: "#22c55e", B: "#f97316", C: "#eab308", D: "#ef4444" };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "22px 26px", borderRadius: 20, border: "2px solid #2a2a2a", background: "#141414", flex: 1 }}>
      <div style={{ fontSize: 22, color: "#8a8a8a" }}>{label}</div>
      <div style={{ fontSize: 52, fontWeight: 700, color: "#fafafa", marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ fontSize: 20, color: "#a3a3a3", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

/** GET /report/card.png → a 1200×630 shareable weekly report card. */
export const GET = route(() => {
  const card = reportCardFor(getStore(), currentUserId(), now());
  const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);
  const ai = card.aiUse ? `${card.aiUse.average}` : "–";
  const aiSub = card.aiUse ? (card.aiUse.delta === null ? `${card.aiUse.rounds} rounds` : `${signed(card.aiUse.delta)} vs last week`) : "no AI rounds";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#080808", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#f97316", letterSpacing: 4, fontWeight: 700 }}>PREPR · WEEKLY REPORT CARD</div>
            <div style={{ fontSize: 44, color: "#fafafa", fontWeight: 700, marginTop: 12, maxWidth: 820 }}>{card.headline}</div>
          </div>
          <div
            style={{
              display: "flex",
              width: 170,
              height: 170,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 800,
              color: "#080808",
              background: GRADE_COLORS[card.grade] ?? "#f97316",
            }}
          >
            {card.grade}
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          <Stat label="Streak" value={`${card.streakDays}d`} sub={`active ${card.activeDays}/7`} />
          <Stat label="Reviews" value={`${card.reviews}`} sub={`${signed(card.reviewsDelta)} vs last week`} />
          <Stat label="Accuracy" value={card.accuracy === null ? "–" : `${Math.round(card.accuracy * 100)}%`} />
          <Stat label="AI-use score" value={ai} sub={aiSub} />
        </div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 26, color: "#c4c4c4" }}>
          {card.weakSpots.length ? `Working on: ${card.weakSpots.join(" · ")}` : "No weak spots flagged this week"}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "no-store" } },
  );
});
