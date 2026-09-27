/**
 * Weekly report card: a pure summary of the last seven (SRS) days computed from Stats —
 * streak, reviews and accuracy versus the week before, weak spots, the AI-use trend, and
 * interview rounds — plus the plain-text iMessage rendering. Browser-safe (no store access).
 */
import type { InterviewTrends, Stats, TrendPoint } from "./store/types";

export type ReportGrade = "A" | "B" | "C" | "D";

export interface ReportRound {
  kind: keyof InterviewTrends;
  label: string;
  count: number;
  average: number;
}

export interface ReportCard {
  generatedAt: number;
  grade: ReportGrade;
  headline: string;
  streakDays: number;
  /** Days with at least one review in the last 7. */
  activeDays: number;
  reviews: number;
  /** Reviews this week minus last week. */
  reviewsDelta: number;
  /** Pass rate this week (0..1), null without reviews. */
  accuracy: number | null;
  weakSpots: string[];
  /** AI-assisted round scores: this week's average and the change from last week's. */
  aiUse: { average: number; delta: number | null; rounds: number } | null;
  rounds: ReportRound[];
}

const ROUND_LABELS: Record<keyof InterviewTrends, string> = {
  bot: "AI-assisted",
  grill: "Resume grill",
  spar: "Behavioral",
  mock: "Mock loop",
  design: "System design",
};

const mean = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

function inWindow(points: TrendPoint[], from: number, to: number): TrendPoint[] {
  return points.filter((point) => point.at > from && point.at <= to);
}

function gradeFor(activeDays: number, accuracy: number | null, rounds: number): ReportGrade {
  const consistency = activeDays / 7;
  const quality = accuracy ?? 0.5;
  const score = consistency * 0.5 + quality * 0.35 + Math.min(rounds, 3) * 0.05;
  if (score >= 0.8) return "A";
  if (score >= 0.6) return "B";
  if (score >= 0.4) return "C";
  return "D";
}

/** `dayMs` is the store's day length (86 400 000, or shorter at demo scale). */
export function buildReportCard(stats: Stats, now: number, dayMs: number): ReportCard {
  const days = stats.reviewsByDay;
  const thisWeek = days.slice(-7);
  const lastWeek = days.slice(-14, -7);
  const reviews = thisWeek.reduce((sum, day) => sum + day.reviews, 0);
  const passed = thisWeek.reduce((sum, day) => sum + day.passed, 0);
  const lastReviews = lastWeek.reduce((sum, day) => sum + day.reviews, 0);
  const activeDays = thisWeek.filter((day) => day.reviews > 0).length;
  const accuracy = reviews > 0 ? Math.round((passed / reviews) * 100) / 100 : null;

  const weekStart = now - 7 * dayMs;
  const prevStart = now - 14 * dayMs;
  const rounds = (Object.keys(ROUND_LABELS) as Array<keyof InterviewTrends>)
    .map((kind) => {
      const points = inWindow(stats.trends[kind] ?? [], weekStart, now);
      return { kind, label: ROUND_LABELS[kind], count: points.length, average: mean(points.map((point) => point.score)) };
    })
    .filter((round) => round.count > 0);

  const botNow = inWindow(stats.trends.bot ?? [], weekStart, now).map((point) => point.score);
  const botPrev = inWindow(stats.trends.bot ?? [], prevStart, weekStart).map((point) => point.score);
  const aiUse = botNow.length ? { average: mean(botNow), delta: botPrev.length ? mean(botNow) - mean(botPrev) : null, rounds: botNow.length } : null;

  const grade = gradeFor(activeDays, accuracy, rounds.reduce((sum, round) => sum + round.count, 0));
  const headline =
    activeDays === 0
      ? "A quiet week. One card a day rebuilds the habit."
      : activeDays >= 6
        ? `${activeDays} of 7 days. That's how it sticks.`
        : reviews > lastReviews
          ? "More reps than last week. Keep the climb going."
          : "Steady. Aim for one more active day this week.";

  return {
    generatedAt: now,
    grade,
    headline,
    streakDays: stats.streakDays,
    activeDays,
    reviews,
    reviewsDelta: reviews - lastReviews,
    accuracy,
    weakSpots: stats.weakTags.slice(0, 3).map((tag) => tag.label),
    aiUse,
    rounds,
  };
}

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** Plain text for iMessage (no markdown), emoji-led. */
export function formatReportCardText(card: ReportCard, shareUrl?: string): string {
  const lines = [
    `📊 Weekly report card: ${card.grade}`,
    card.headline,
    "",
    `🔥 Streak: ${card.streakDays} day${card.streakDays === 1 ? "" : "s"} · active ${card.activeDays}/7`,
    `🃏 Reviews: ${card.reviews} (${signed(card.reviewsDelta)} vs last week)${card.accuracy !== null ? ` · ${Math.round(card.accuracy * 100)}% correct` : ""}`,
  ];
  if (card.aiUse) {
    const trend = card.aiUse.delta === null ? "" : card.aiUse.delta > 0 ? ` (↑${card.aiUse.delta})` : card.aiUse.delta < 0 ? ` (↓${-card.aiUse.delta})` : " (flat)";
    lines.push(`🤖 AI-use score: ${card.aiUse.average}/100${trend} over ${card.aiUse.rounds} round${card.aiUse.rounds === 1 ? "" : "s"}`);
  }
  if (card.rounds.length) lines.push(`🎤 Rounds: ${card.rounds.map((round) => `${round.label} ${round.count}× avg ${round.average}`).join(", ")}`);
  lines.push(card.weakSpots.length ? `‼️ Weak spots: ${card.weakSpots.join(", ")}` : "✅ No weak spots flagged");
  if (shareUrl) lines.push("", `Share card: ${shareUrl}`);
  return lines.join("\n");
}
