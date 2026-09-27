import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { StatsResponse } from "@/lib/types";

type TrendKey = keyof StatsResponse["trends"];

const ROWS: ReadonlyArray<{ key: TrendKey; label: string; href: string; empty: string }> = [
  { key: "bot", label: "AI-assisted coding", href: "/practice", empty: "Open a problem's code stage and press Review in the AI panel." },
  { key: "grill", label: "Resume grill", href: "/grill", empty: "Upload a resume and defend it." },
  { key: "spar", label: "Voice sparring", href: "/spar", empty: "Answer a behavioral question out loud." },
  { key: "mock", label: "Mock interview loop", href: "/mock", empty: "Run a full timed loop." },
  { key: "design", label: "System design", href: "/design", empty: "Design a system with an AI interviewer." },
];

/** "30 → 72" plus a direction, from the first and latest score in the window. */
export function trendSummary(scores: readonly number[]): { text: string; direction: "up" | "down" | "flat" } | null {
  if (scores.length === 0) return null;
  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  if (scores.length === 1) return { text: `${last}`, direction: "flat" };
  return { text: `${first} → ${last}`, direction: last > first ? "up" : last < first ? "down" : "flat" };
}

export function TrendsCard({ trends, className }: { trends: StatsResponse["trends"]; className?: string }) {
  const active = ROWS.filter((row) => (trends?.[row.key]?.length ?? 0) > 0);
  const rows = active.length > 0 ? active : ROWS.slice(0, 3);

  return (
    <Card className={className} aria-labelledby="trends-title">
      <CardHeader
        title={<span id="trends-title">Interview rounds</span>}
        description="Your last 10 scores in each round type, oldest to newest."
      />
      <ul className="space-y-4">
        {rows.map((row) => {
          const points = trends?.[row.key] ?? [];
          const summary = trendSummary(points.map((point) => point.score));
          return (
            <li key={row.key}>
              <Link href={row.href} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-synapse">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-fg group-hover:text-synapse">{row.label}</span>
                  {summary ? (
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        summary.direction === "up" ? "text-success" : summary.direction === "down" ? "text-danger" : "text-fg-muted",
                      )}
                    >
                      {summary.direction === "up" ? "▲ " : summary.direction === "down" ? "▼ " : ""}
                      {summary.text}
                    </span>
                  ) : (
                    <span className="text-xs text-fg-subtle">Not tried yet</span>
                  )}
                </div>
                {points.length > 0 ? (
                  <div className="mt-2 flex h-10 items-end gap-1" role="img" aria-label={`${row.label} scores: ${points.map((point) => point.score).join(", ")}`}>
                    {points.map((point, index) => (
                      <span
                        key={`${point.at}-${index}`}
                        title={`${point.score}/100 · ${new Date(point.at).toLocaleDateString()}`}
                        className={cn("w-3 rounded-t-sm sm:w-4", index === points.length - 1 ? "bg-synapse" : "bg-synapse/40")}
                        style={{ height: `${Math.max(6, point.score)}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-fg-subtle">{row.empty}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
