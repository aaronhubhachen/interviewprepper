"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import type { ReportCard } from "@/lib/types";

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/** The weekly report card with its shareable PNG, plus copy and download actions. */
export function ReportCardView({ card, text }: { card: ReportCard; text: string }) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState("/report/card.png");
  useEffect(() => setImageUrl(`/report/card.png?t=${card.generatedAt}`), [card.generatedAt]);

  const copy = async (value: string, title: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title, tone: "success" });
    } catch {
      toast({ title: "Clipboard is blocked in this browser", tone: "danger" });
    }
  };

  const share = async () => {
    try {
      const blob = await fetch(imageUrl).then((response) => response.blob());
      const file = new File([blob], "prepr-report-card.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `My Prepr week: ${card.grade}` });
        return;
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "prepr-report-card.png";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // share sheet dismissed
    }
  };

  return (
    <div className="grid gap-5">
      <Card padded={false} className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated per request, no optimization wanted */}
        <img src={imageUrl} alt={`Weekly report card: grade ${card.grade}. ${card.headline}`} width={1200} height={630} className="block h-auto w-full" />
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void share()}>Share / download PNG</Button>
        <Button variant="secondary" onClick={() => void copy(text, "Report copied")}>
          Copy as text
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader title="This week" level={3} />
          <ul className="space-y-1.5 text-sm text-fg-muted">
            <li>🔥 Streak: {card.streakDays} days · active {card.activeDays}/7</li>
            <li>
              🃏 {card.reviews} reviews ({signed(card.reviewsDelta)} vs last week)
            </li>
            <li>🎯 Accuracy: {card.accuracy === null ? "no reviews" : `${Math.round(card.accuracy * 100)}%`}</li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="AI use and rounds" level={3} />
          <ul className="space-y-1.5 text-sm text-fg-muted">
            <li>
              🤖 {card.aiUse ? `AI-use score ${card.aiUse.average}/100${card.aiUse.delta === null ? "" : ` (${signed(card.aiUse.delta)})`}` : "No AI-assisted rounds this week"}
            </li>
            {card.rounds.map((round) => (
              <li key={round.kind}>
                🎤 {round.label}: {round.count}× avg {round.average}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Weak spots" level={3} />
          <p className="text-sm text-fg-muted">{card.weakSpots.length ? card.weakSpots.join(" · ") : "None flagged. Nice."}</p>
        </Card>
      </div>
    </div>
  );
}
