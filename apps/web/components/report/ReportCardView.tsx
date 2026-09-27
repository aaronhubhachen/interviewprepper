"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import type { ReportCard } from "@/lib/types";

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
      {card.rounds.length ? (
        <p className="text-sm text-fg-muted">
          {card.rounds.map((round) => `${round.label} ${round.count}× (avg ${round.average})`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
