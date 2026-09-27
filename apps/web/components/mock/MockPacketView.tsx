"use client";

import { useState } from "react";
import { Button, ButtonLink, Card, CardHeader, Pill, type PillTone } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import type { MockLoopInput, MockPacket } from "@/lib/types";

const DECISIONS: Record<MockPacket["decision"], { label: string; tone: PillTone }> = {
  strong_hire: { label: "Strong hire", tone: "success" },
  hire: { label: "Hire", tone: "success" },
  lean_hire: { label: "Lean hire", tone: "cyan" },
  lean_no_hire: { label: "Lean no hire", tone: "warning" },
  no_hire: { label: "No hire", tone: "danger" },
};

const ROUND_LABELS: Record<MockPacket["rounds"][number]["round"], string> = {
  coding: "Coding",
  behavioral: "Behavioral",
  grill: "Resume grill",
};

/** Plain-text packet for the clipboard: pasteable into a message or a notes app. */
export function packetText(packet: MockPacket): string {
  return [
    `Prepr mock loop · ${DECISIONS[packet.decision].label} · ${packet.overall}/100`,
    packet.summary,
    "",
    ...packet.rounds.map((round) => `${ROUND_LABELS[round.round]} ${round.score}/100: ${round.verdict}`),
    "",
    "Strengths:",
    ...packet.strengths.map((item) => `+ ${item}`),
    "Concerns:",
    ...packet.concerns.map((item) => `- ${item}`),
    "",
    `To move up a level: ${packet.toFlip}`,
  ].join("\n");
}

export function MockPacketView({ packet, input, onAgain }: { packet: MockPacket; input: MockLoopInput; onAgain: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const decision = DECISIONS[packet.decision];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(packetText(packet));
      setCopied(true);
      toast({ title: "Packet copied", tone: "success" });
    } catch {
      toast({ title: "Clipboard is blocked in this browser", tone: "danger" });
    }
  };

  return (
    <div className="grid gap-5 motion-safe:animate-fade-up" aria-label="Hiring committee packet">
      <Card glow>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Hiring committee packet</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-6xl font-bold tracking-tight text-fg tabular-nums">{packet.overall}</span>
            <span className="text-lg text-fg-subtle">/100</span>
          </div>
          <div className="min-w-0 flex-1">
            <Pill tone={decision.tone} className="text-sm">
              {decision.label}
            </Pill>
            <p className="mt-2 text-fg-muted">{packet.summary}</p>
            {packet.source === "heuristic" ? (
              <p className="mt-2 text-xs text-fg-subtle">Offline scoring.</p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {packet.rounds.map((round) => (
          <Card key={round.round}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-fg">{ROUND_LABELS[round.round]}</h3>
              <span className="font-display text-2xl font-bold tabular-nums text-fg">{round.score}</span>
            </div>
            <p className="mt-2 text-sm text-fg-muted">{round.verdict}</p>
            {round.round === "coding" && input.coding ? (
              <p className="mt-3 text-xs text-fg-subtle">
                {input.coding.passed}/{input.coding.total} tests · {input.coding.minutesUsed} min · {input.coding.aiAllowed ? "AI allowed" : "no AI"}
              </p>
            ) : null}
            {round.round === "grill" && input.grill ? (
              <p className="mt-3 text-xs text-fg-subtle">
                {input.grill.held} held · {input.grill.shaky} shaky · {input.grill.cracked} cracked
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Strengths" level={3} />
          <ul className="space-y-2 text-sm text-fg-muted">
            {packet.strengths.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-success">+</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Concerns" level={3} />
          <ul className="space-y-2 text-sm text-fg-muted">
            {packet.concerns.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-danger">−</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="What would move the decision up" level={3} />
        <p className="text-fg">{packet.toFlip}</p>
        <h4 className="mt-4 text-sm font-semibold text-fg">Next steps</h4>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg-muted">
          {packet.nextSteps.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={onAgain}>Run another loop</Button>
        <Button variant="secondary" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy packet"}
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Print / save PDF
        </Button>
        <ButtonLink href="/report" variant="ghost">
          Weekly report
        </ButtonLink>
      </div>
    </div>
  );
}
